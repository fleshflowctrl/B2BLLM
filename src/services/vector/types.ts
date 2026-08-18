import type {
  ChunkAccessPayload,
  VectorAccessFilter,
} from "@/services/permissions/access";

export type ChunkPayload = ChunkAccessPayload & {
  documentId: string;
  chunkId: string;
  filename: string;
  pageNumber: number | null;
  chunkIndex: number;
  text: string;
};

export type VectorPoint = {
  id: string;
  embedding: number[];
  payload: ChunkPayload;
};

export type SearchHit = {
  score: number;
  payload: ChunkPayload;
};

export interface VectorStore {
  ensureCollection(dimensions: number): Promise<void>;
  upsert(points: VectorPoint[]): Promise<void>;
  search(params: {
    embedding: number[];
    filter: VectorAccessFilter;
    topK: number;
  }): Promise<SearchHit[]>;
  deleteByDocument(params: {
    companyId: string;
    documentId: string;
  }): Promise<void>;
  updateAccess(params: {
    companyId: string;
    documentId: string;
    departmentIds: string[];
    allEmployees: boolean;
  }): Promise<void>;
}
