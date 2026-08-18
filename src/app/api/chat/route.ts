import { z } from "zod";
import { jsonError } from "@/lib/api";
import { CHAT_RATE_LIMIT } from "@/lib/constants";
import { getRateLimiter } from "@/lib/rate-limit";
import { requireUser } from "@/services/auth/session";
import { answerQuestion } from "@/services/rag/RagService";

export const maxDuration = 120;

const bodySchema = z.object({
  conversationId: z.string().optional(),
  message: z.string().min(1).max(8000),
});

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const limited = getRateLimiter().check(`chat:${user.id}`, CHAT_RATE_LIMIT.limit, CHAT_RATE_LIMIT.windowMs);
    if (!limited.ok) {
      return Response.json({ error: "Too many questions. Please wait a moment." }, { status: 429 });
    }
    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return Response.json({ error: "Invalid chat request" }, { status: 400 });
    }

    const result = await answerQuestion({
      user,
      conversationId: parsed.data.conversationId,
      question: parsed.data.message,
    });

    const encoder = new TextEncoder();
    const send = (payload: unknown) => encoder.encode(`data: ${JSON.stringify(payload)}\n\n`);
    const citations = result.sources.map((source) => ({
      documentId: source.documentId,
      filename: source.filename,
      chunkId: source.chunkId,
      pageNumber: source.pageNumber,
      excerpt: source.excerpt,
      score: 1,
    }));

    return new Response(
      new ReadableStream({
        start(controller) {
          controller.enqueue(send({ type: "meta", conversationId: result.conversationId, title: parsed.data.message.slice(0, 80) }));
          controller.enqueue(send({ type: "token", text: result.answer }));
          controller.enqueue(send({ type: "done", citations }));
          controller.close();
        },
      }),
      { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" } },
    );
  } catch (error) {
    return jsonError(error);
  }
}
