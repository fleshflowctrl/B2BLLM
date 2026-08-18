import { describe, expect, it } from "vitest";
import {
  canAccessDocument,
  getVectorAccessFilter,
  isChunkVisible,
  requireCompanyId,
} from "@/services/permissions/access";
import type { AccessContext } from "@/types/auth";

const sales: AccessContext = {
  id: "sales",
  email: "sales@acme.local",
  name: "Sales",
  role: "EMPLOYEE",
  status: "ACTIVE",
  companyId: "acme",
  companyName: "Acme",
  departmentIds: ["sales"],
};

const hrDoc = {
  companyId: "acme",
  visibility: "DEPARTMENTS" as const,
  departmentIds: ["hr"],
};

describe("document permissions", () => {
  it("does not allow a sales employee to access an HR-only document", () => {
    expect(canAccessDocument(sales, hrDoc)).toBe(false);
  });

  it("never returns HR chunks to a sales user", () => {
    const filter = getVectorAccessFilter(sales);
    const visible = isChunkVisible(
      { companyId: "acme", allEmployees: false, departmentIds: ["hr"] },
      filter,
    );
    expect(visible).toBe(false);
  });

  it("allows all-employee documents", () => {
    expect(
      canAccessDocument(sales, {
        companyId: "acme",
        visibility: "ALL_EMPLOYEES",
        departmentIds: [],
      }),
    ).toBe(true);
  });
});

describe("tenant isolation", () => {
  it("rejects missing companyId before search", () => {
    expect(() => requireCompanyId("")).toThrow(/companyId/);
  });

  it("hides another company's document", () => {
    expect(
      canAccessDocument(sales, {
        companyId: "other",
        visibility: "ALL_EMPLOYEES",
        departmentIds: [],
      }),
    ).toBe(false);
  });
});
