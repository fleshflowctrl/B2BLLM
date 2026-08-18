import { DEFAULT_MIN_SCORE } from "@/lib/constants";
import {
  getVectorAccessFilter,
  isChunkVisible,
  requireCompanyId,
} from "@/services/permissions/access";
import type { SearchHit, VectorStore } from "@/services/vector/types";
import type { AccessContext } from "@/types/auth";

export type Citation = {
  documentId: string;
  filename: string;
  chunkId: string;
  pageNumber: number | null;
  excerpt: string;
  score: number;
};

export async function retrieveContext(params: {
  queryEmbedding: number[];
  user: AccessContext;
  vector: VectorStore;
  topK: number;
  minScore?: number;
}): Promise<SearchHit[]> {
  const filter = getVectorAccessFilter(params.user);
  requireCompanyId(filter.companyId);
  const hits = await params.vector.search({
    embedding: params.queryEmbedding,
    filter,
    topK: params.topK,
  });
  const minScore = params.minScore ?? DEFAULT_MIN_SCORE;
  return hits.filter(
    (hit) => hit.score >= minScore && isChunkVisible(hit.payload, filter),
  );
}

export function toCitations(hits: SearchHit[]): Citation[] {
  const seen = new Set<string>();
  const citations: Citation[] = [];
  for (const hit of hits) {
    const key = `${hit.payload.documentId}:${hit.payload.chunkId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    citations.push({
      documentId: hit.payload.documentId,
      filename: hit.payload.filename,
      chunkId: hit.payload.chunkId,
      pageNumber: hit.payload.pageNumber,
      excerpt: hit.payload.text.slice(0, 280),
      score: hit.score,
    });
  }
  return citations;
}
