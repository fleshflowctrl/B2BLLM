import { createAdminClient } from "@/lib/supabase/admin";
import type { AccessContext } from "@/types/auth";
import { isAdmin } from "@/types/auth";

export type AuthorizedChunk = {
  chunkId: string;
  documentId: string;
  content: string;
  pageNumber: number | null;
  similarity: number;
  filename: string;
};

export class SupabaseVectorStore {
  async search(params: {
    embedding: number[];
    user: AccessContext;
    limit?: number;
    minimumSimilarity?: number;
  }): Promise<AuthorizedChunk[]> {
    const supabase = createAdminClient();
    const { data, error } = await supabase.rpc("match_document_chunks", {
      query_embedding: params.embedding,
      query_company_id: params.user.companyId,
      allowed_department_ids: params.user.departmentIds,
      query_is_admin: isAdmin(params.user),
      match_count: params.limit ?? 5,
      minimum_similarity: params.minimumSimilarity ?? 0.25,
    });
    if (error) throw new Error(error.message);
    return (data ?? []).map((row: {
      chunk_id: string;
      document_id: string;
      content: string;
      page_number: number | null;
      similarity: number;
      filename: string;
    }) => ({
      chunkId: row.chunk_id,
      documentId: row.document_id,
      content: row.content,
      pageNumber: row.page_number,
      similarity: row.similarity,
      filename: row.filename,
    }));
  }
}
