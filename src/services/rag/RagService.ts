import { INSUFFICIENT_CONTEXT_ANSWER } from "@/lib/constants";
import { createAdminClient } from "@/lib/supabase/admin";
import { OllamaEmbeddingProvider } from "@/services/ai/OllamaEmbeddingProvider";
import { OllamaLLMProvider } from "@/services/ai/OllamaLLMProvider";
import { buildRagMessages } from "@/services/rag/prompt";
import { SupabaseVectorStore } from "@/services/vector/SupabaseVectorStore";
import type { AccessContext } from "@/types/auth";

export async function answerQuestion(params: {
  user: AccessContext;
  conversationId?: string;
  question: string;
  topK?: number;
  temperature?: number;
  chatModel?: string;
  systemPrompt?: string;
}) {
  const embeddings = new OllamaEmbeddingProvider();
  const llm = new OllamaLLMProvider();
  const store = new SupabaseVectorStore();
  const supabase = createAdminClient();

  let conversationId = params.conversationId;
  const title = params.question.replace(/\s+/g, " ").trim().slice(0, 80) || "New conversation";
  if (!conversationId) {
    const { data, error } = await supabase
      .from("conversations")
      .insert({
        company_id: params.user.companyId,
        user_id: params.user.id,
        title,
      })
      .select("id")
      .single();
    if (error || !data) throw new Error(error?.message ?? "Could not create conversation");
    conversationId = data.id;
  }

  await supabase.from("messages").insert({
    company_id: params.user.companyId,
    conversation_id: conversationId,
    role: "USER",
    content: params.question,
  });

  const queryEmbedding = await embeddings.embed(params.question);
  const chunks = await store.search({
    embedding: queryEmbedding,
    user: params.user,
    limit: params.topK ?? 5,
  });

  let answer = INSUFFICIENT_CONTEXT_ANSWER;
  if (chunks.length) {
    const messages = buildRagMessages({
      systemPrompt: params.systemPrompt,
      question: params.question,
      hits: chunks.map((chunk) => ({
        score: chunk.similarity,
        payload: {
          companyId: params.user.companyId,
          allEmployees: true,
          departmentIds: [],
          documentId: chunk.documentId,
          chunkId: chunk.chunkId,
          filename: chunk.filename,
          pageNumber: chunk.pageNumber,
          chunkIndex: 0,
          text: chunk.content,
        },
      })),
    });
    try {
      answer = await llm.generate({
        messages,
        temperature: params.temperature,
        model: params.chatModel,
      });
    } catch {
      throw new Error("Local AI service is currently unavailable.");
    }
  }

  const { data: assistantMessage, error: messageError } = await supabase
    .from("messages")
    .insert({
      company_id: params.user.companyId,
      conversation_id: conversationId,
      role: "ASSISTANT",
      content: answer,
    })
    .select("id")
    .single();
  if (messageError || !assistantMessage) throw new Error(messageError?.message ?? "Could not save answer");

  if (chunks.length) {
    await supabase.from("message_sources").insert(
      chunks.map((chunk) => ({
        message_id: assistantMessage.id,
        document_id: chunk.documentId,
        document_chunk_id: chunk.chunkId,
        page_number: chunk.pageNumber,
        similarity_score: chunk.similarity,
        excerpt: chunk.content.slice(0, 280),
      })),
    );
  }

  await supabase.from("audit_logs").insert({
    company_id: params.user.companyId,
    user_id: params.user.id,
    event_type: "AI_QUERY",
    entity_type: "conversation",
    entity_id: conversationId,
    metadata: { sources: chunks.length },
  });

  return {
    conversationId,
    answer,
    sources: chunks.map((chunk) => ({
      documentId: chunk.documentId,
      filename: chunk.filename,
      pageNumber: chunk.pageNumber,
      excerpt: chunk.content.slice(0, 280),
      chunkId: chunk.chunkId,
    })),
  };
}
