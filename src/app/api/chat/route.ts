import { after } from "next/server";
import { z } from "zod";
import { jsonError, getRequestIp } from "@/lib/api";
import { CHAT_RATE_LIMIT, UNKNOWN_ANSWER } from "@/lib/constants";
import {
  createConversation,
  createMessage,
  deleteMessage,
  getConversation,
  updateConversation,
} from "@/lib/db";
import { badRequest, forbidden, notFound } from "@/lib/errors";
import { conversationTitleFromMessage } from "@/lib/format";
import { getRateLimiter } from "@/lib/rate-limit";
import { embedQuery, streamChat } from "@/services/ai/ollama";
import { writeAuditLog } from "@/services/audit";
import { requireUser } from "@/services/auth/session";
import { buildRagMessages, unknownAnswer } from "@/services/rag/prompt";
import { retrieveContext, toCitations } from "@/services/rag/retrieve";
import { getAiSettings } from "@/services/settings";
import { getVectorStore } from "@/services/vector/qdrant";

export const maxDuration = 120;

const bodySchema = z.object({
  conversationId: z.string().optional(),
  message: z.string().min(1).max(8000).optional(),
  regenerate: z.boolean().optional(),
});

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const limited = getRateLimiter().check(
      `chat:${user.id}`,
      CHAT_RATE_LIMIT.limit,
      CHAT_RATE_LIMIT.windowMs,
    );
    if (!limited.ok) {
      return Response.json({ error: "Too many questions. Please wait a moment." }, { status: 429 });
    }

    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) throw badRequest("Invalid chat request");

    let conversationId = parsed.data.conversationId;
    let question = parsed.data.message?.trim() ?? "";

    if (parsed.data.regenerate) {
      if (!conversationId) throw badRequest("conversationId is required to regenerate");
      const conversation = await getConversation(conversationId, user.companyId, user.id);
      if (!conversation) throw notFound("Conversation not found");
      const lastAssistant = [...conversation.messages].reverse().find((item) => item.role === "ASSISTANT");
      const lastUser = [...conversation.messages].reverse().find((item) => item.role === "USER");
      if (!lastUser) throw badRequest("Nothing to regenerate");
      if (lastAssistant) await deleteMessage(lastAssistant.id);
      question = lastUser.content;
    } else {
      if (!question) throw badRequest("Message is required");
      if (!conversationId) {
        const conversation = await createConversation({
          companyId: user.companyId,
          userId: user.id,
          title: conversationTitleFromMessage(question),
        });
        conversationId = conversation.id;
      } else {
        const conversation = await getConversation(conversationId, user.companyId, user.id);
        if (!conversation) throw notFound("Conversation not found");
        if (conversation.title === "New conversation") {
          await updateConversation(conversationId, { title: conversationTitleFromMessage(question) });
        }
      }
      await createMessage({ conversationId, role: "USER", content: question });
    }

    const conversation = await getConversation(conversationId, user.companyId, user.id);
    if (!conversation) throw forbidden();

    const settings = await getAiSettings(user.companyId);
    const queryEmbedding = await embedQuery(question, settings.embeddingModel);
    const hits = await retrieveContext({
      queryEmbedding,
      user,
      vector: getVectorStore(),
      topK: settings.topK,
    });
    const citations = toCitations(hits);
    const encoder = new TextEncoder();
    const send = (payload: unknown) => encoder.encode(`data: ${JSON.stringify(payload)}\n\n`);

    if (hits.length === 0) {
      const answer = unknownAnswer();
      await createMessage({ conversationId, role: "ASSISTANT", content: answer, citations });
      await updateConversation(conversationId, {});
      after(() =>
        writeAuditLog({
          companyId: user.companyId,
          userId: user.id,
          event: "AI_QUERY",
          metadata: { conversationId, sources: 0 },
          ipAddress: getRequestIp(request),
        }),
      );
      return new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(send({ type: "meta", conversationId, title: conversation.title }));
            controller.enqueue(send({ type: "token", text: answer }));
            controller.enqueue(send({ type: "done", citations }));
            controller.close();
          },
        }),
        { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" } },
      );
    }

    const messages = buildRagMessages({
      systemPrompt: settings.systemPrompt,
      question,
      hits,
    });

    const stream = new ReadableStream({
      async start(controller) {
        controller.enqueue(send({ type: "meta", conversationId, title: conversation.title }));
        let answer = "";
        try {
          for await (const token of streamChat({
            model: settings.chatModel,
            messages,
            temperature: settings.temperature,
          })) {
            answer += token;
            controller.enqueue(send({ type: "token", text: token }));
          }
          if (!answer.trim()) answer = UNKNOWN_ANSWER;
          await createMessage({ conversationId, role: "ASSISTANT", content: answer, citations });
          await updateConversation(conversationId, {});
          await writeAuditLog({
            companyId: user.companyId,
            userId: user.id,
            event: "AI_QUERY",
            metadata: { conversationId, sources: citations.length },
            ipAddress: getRequestIp(request),
          });
          controller.enqueue(send({ type: "done", citations }));
        } catch (error) {
          controller.enqueue(
            send({
              type: "error",
              error: error instanceof Error ? error.message : "Chat failed",
            }),
          );
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
    });
  } catch (error) {
    return jsonError(error);
  }
}
