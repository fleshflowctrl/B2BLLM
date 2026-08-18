import { QdrantClient } from "@qdrant/js-client-rest";
import { getEnv } from "@/lib/env";
import {
  isChunkVisible,
  requireCompanyId,
  toQdrantFilter,
} from "@/services/permissions/access";
import type { ChunkPayload, SearchHit, VectorPoint, VectorStore } from "@/services/vector/types";
import type { VectorAccessFilter } from "@/services/permissions/access";

export class QdrantVectorStore implements VectorStore {
  private client: QdrantClient;
  private collection: string;

  constructor() {
    const env = getEnv();
    this.client = new QdrantClient({ url: env.QDRANT_URL });
    this.collection = env.QDRANT_COLLECTION;
  }

  async ensureCollection(dimensions: number) {
    const collections = await this.client.getCollections();
    const exists = collections.collections.some(
      (item) => item.name === this.collection,
    );
    if (exists) return;

    await this.client.createCollection(this.collection, {
      vectors: { size: dimensions, distance: "Cosine" },
    });
    await this.client.createPayloadIndex(this.collection, {
      field_name: "companyId",
      field_schema: "keyword",
    });
    await this.client.createPayloadIndex(this.collection, {
      field_name: "documentId",
      field_schema: "keyword",
    });
    await this.client.createPayloadIndex(this.collection, {
      field_name: "allEmployees",
      field_schema: "bool",
    });
    await this.client.createPayloadIndex(this.collection, {
      field_name: "departmentIds",
      field_schema: "keyword",
    });
  }

  async upsert(points: VectorPoint[]) {
    if (points.length === 0) return;
    await this.ensureCollection(points[0].embedding.length);
    await this.client.upsert(this.collection, {
      wait: true,
      points: points.map((point) => ({
        id: point.id,
        vector: point.embedding,
        payload: point.payload,
      })),
    });
  }

  async search(params: {
    embedding: number[];
    filter: VectorAccessFilter;
    topK: number;
  }): Promise<SearchHit[]> {
    requireCompanyId(params.filter.companyId);
    await this.ensureCollection(params.embedding.length);
    const result = await this.client.query(this.collection, {
      query: params.embedding,
      limit: params.topK,
      filter: toQdrantFilter(params.filter) as never,
      with_payload: true,
    });

    return result.points
      .map((point) => ({
        score: point.score ?? 0,
        payload: point.payload as unknown as ChunkPayload,
      }))
      .filter((hit) => isChunkVisible(hit.payload, params.filter));
  }

  async deleteByDocument(params: { companyId: string; documentId: string }) {
    requireCompanyId(params.companyId);
    await this.client.delete(this.collection, {
      wait: true,
      filter: {
        must: [
          { key: "companyId", match: { value: params.companyId } },
          { key: "documentId", match: { value: params.documentId } },
        ],
      },
    });
  }

  async updateAccess(params: {
    companyId: string;
    documentId: string;
    departmentIds: string[];
    allEmployees: boolean;
  }) {
    requireCompanyId(params.companyId);
    await this.client.setPayload(this.collection, {
      wait: true,
      payload: {
        departmentIds: params.departmentIds,
        allEmployees: params.allEmployees,
      },
      filter: {
        must: [
          { key: "companyId", match: { value: params.companyId } },
          { key: "documentId", match: { value: params.documentId } },
        ],
      },
    });
  }
}

const globalForVector = globalThis as unknown as {
  vectorStore?: VectorStore;
};

export function getVectorStore() {
  if (!globalForVector.vectorStore) {
    globalForVector.vectorStore = new QdrantVectorStore();
  }
  return globalForVector.vectorStore;
}
