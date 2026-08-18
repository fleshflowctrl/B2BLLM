import {
  isChunkVisible,
  requireCompanyId,
} from "@/services/permissions/access";
import type { SearchHit, VectorPoint, VectorStore } from "@/services/vector/types";

function cosine(a: number[], b: number[]) {
  let dot = 0;
  let na = 0;
  let nb = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i += 1) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}

export class InMemoryVectorStore implements VectorStore {
  points = new Map<string, VectorPoint>();

  async ensureCollection() {}

  async upsert(points: VectorPoint[]) {
    for (const point of points) {
      this.points.set(point.id, point);
    }
  }

  async search(params: {
    embedding: number[];
    filter: import("@/services/permissions/access").VectorAccessFilter;
    topK: number;
  }): Promise<SearchHit[]> {
    requireCompanyId(params.filter.companyId);
    const hits: SearchHit[] = [];
    for (const point of this.points.values()) {
      if (!isChunkVisible(point.payload, params.filter)) continue;
      hits.push({
        score: cosine(params.embedding, point.embedding),
        payload: point.payload,
      });
    }
    return hits.sort((a, b) => b.score - a.score).slice(0, params.topK);
  }

  async deleteByDocument(params: { companyId: string; documentId: string }) {
    requireCompanyId(params.companyId);
    for (const [id, point] of this.points) {
      if (
        point.payload.companyId === params.companyId &&
        point.payload.documentId === params.documentId
      ) {
        this.points.delete(id);
      }
    }
  }

  async updateAccess(params: {
    companyId: string;
    documentId: string;
    departmentIds: string[];
    allEmployees: boolean;
  }) {
    requireCompanyId(params.companyId);
    for (const point of this.points.values()) {
      if (
        point.payload.companyId === params.companyId &&
        point.payload.documentId === params.documentId
      ) {
        point.payload.departmentIds = params.departmentIds;
        point.payload.allEmployees = params.allEmployees;
      }
    }
  }
}
