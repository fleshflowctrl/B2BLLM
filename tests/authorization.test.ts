import { describe, expect, it } from "vitest";
import { canAccessDocument } from "@/services/permissions/access";
import type { AccessContext } from "@/types/auth";

const sales: AccessContext = {
  id: "sales",
  email: "sales@acme.local",
  name: "Sales",
  role: "EMPLOYEE",
  status: "ACTIVE",
  companyId: "company-a",
  companyName: "Acme",
  departmentIds: ["sales"],
};

const hr: AccessContext = {
  ...sales,
  id: "hr",
  email: "hr@acme.local",
  departmentIds: ["hr"],
};

const companyAAdmin: AccessContext = {
  ...sales,
  id: "admin",
  role: "ADMIN",
  departmentIds: ["sales", "hr"],
};

describe("retrieval authorization", () => {
  it("does not allow a sales employee to access an HR-only salary document", () => {
    expect(
      canAccessDocument(sales, {
        companyId: "company-a",
        visibility: "DEPARTMENTS",
        departmentIds: ["hr"],
      }),
    ).toBe(false);
  });

  it("allows HR to access the HR salary document", () => {
    expect(
      canAccessDocument(hr, {
        companyId: "company-a",
        visibility: "DEPARTMENTS",
        departmentIds: ["hr"],
      }),
    ).toBe(true);
  });

  it("never returns another company's document", () => {
    expect(
      canAccessDocument(companyAAdmin, {
        companyId: "company-b",
        visibility: "ALL_EMPLOYEES",
        departmentIds: [],
      }),
    ).toBe(false);
  });
});
