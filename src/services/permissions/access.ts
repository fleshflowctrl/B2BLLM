import type { AccessContext } from "@/types/auth";
import { isAdmin } from "@/types/auth";

export type VectorAccessFilter = {
  companyId: string;
  isAdmin: boolean;
  departmentIds: string[];
};

export type ChunkAccessPayload = {
  companyId: string;
  allEmployees: boolean;
  departmentIds: string[];
};

export function requireCompanyId(companyId: string | undefined | null): string {
  if (!companyId) {
    throw new Error("Refusing vector search without companyId");
  }
  return companyId;
}

export function getVectorAccessFilter(user: AccessContext): VectorAccessFilter {
  return {
    companyId: requireCompanyId(user.companyId),
    isAdmin: isAdmin(user),
    departmentIds: user.departmentIds,
  };
}

export function isChunkVisible(
  payload: ChunkAccessPayload,
  filter: VectorAccessFilter,
): boolean {
  requireCompanyId(filter.companyId);
  if (payload.companyId !== filter.companyId) return false;
  if (filter.isAdmin) return true;
  if (payload.allEmployees) return true;
  const allowed = new Set(filter.departmentIds);
  return payload.departmentIds.some((id) => allowed.has(id));
}

export function isDocumentListed(
  user: AccessContext,
  document: { companyId: string; visibility: "ALL_EMPLOYEES" | "DEPARTMENTS"; departmentIds: string[] },
) {
  return canAccessDocument(user, document);
}

export function canAccessDocument(
  user: AccessContext,
  document: {
    companyId: string;
    visibility: "ALL_EMPLOYEES" | "DEPARTMENTS";
    departmentIds: string[];
  },
) {
  if (document.companyId !== user.companyId) return false;
  if (isAdmin(user)) return true;
  if (document.visibility === "ALL_EMPLOYEES") return true;
  return document.departmentIds.some((id) => user.departmentIds.includes(id));
}

export function toQdrantFilter(filter: VectorAccessFilter) {
  requireCompanyId(filter.companyId);
  const must: Array<Record<string, unknown>> = [
    { key: "companyId", match: { value: filter.companyId } },
  ];
  if (filter.isAdmin) {
    return { must };
  }
  const should: Array<Record<string, unknown>> = [
    { key: "allEmployees", match: { value: true } },
  ];
  if (filter.departmentIds.length > 0) {
    should.push({
      key: "departmentIds",
      match: { any: filter.departmentIds },
    });
  }
  return {
    must,
    should,
    min_should: { conditions: 1 },
  };
}
