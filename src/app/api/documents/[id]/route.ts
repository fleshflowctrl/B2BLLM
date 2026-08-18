import { NextResponse } from "next/server";
import { jsonError, getRequestIp } from "@/lib/api";
import { badRequest, notFound } from "@/lib/errors";
import {
  countDepartments,
  deleteDocument,
  getDocument,
  setDocumentDepartments,
  updateDocument,
} from "@/lib/db";
import { writeAuditLog } from "@/services/audit";
import { requireAdmin, requireUser } from "@/services/auth/session";
import { canAccessDocument } from "@/services/permissions/access";
import { getDocumentStorage } from "@/services/storage/local";
import { getVectorStore } from "@/services/vector/qdrant";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const document = await getDocument(id, user.companyId);
    if (!document) throw notFound("Document not found");
    if (
      !canAccessDocument(user, {
        companyId: document.companyId,
        visibility: document.visibility,
        departmentIds: document.departments.map((row) => row.departmentId),
      })
    ) {
      throw notFound("Document not found");
    }
    return NextResponse.json({ document });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAdmin();
    const { id } = await context.params;
    const document = await getDocument(id, user.companyId);
    if (!document) throw notFound("Document not found");
    const body = (await request.json()) as {
      visibility?: "ALL_EMPLOYEES" | "DEPARTMENTS";
      departmentIds?: string[];
    };
    const visibility = body.visibility ?? document.visibility;
    const departmentIds = body.departmentIds ?? document.departments.map((row) => row.departmentId);
    if (visibility === "DEPARTMENTS" && departmentIds.length === 0) {
      throw badRequest("Select at least one department");
    }
    if (departmentIds.length > 0) {
      const count = await countDepartments(user.companyId, departmentIds);
      if (count !== departmentIds.length) throw badRequest("Invalid department selection");
    }
    await setDocumentDepartments(id, visibility === "DEPARTMENTS" ? departmentIds : []);
    await updateDocument(id, { visibility });
    await getVectorStore().updateAccess({
      companyId: user.companyId,
      documentId: id,
      departmentIds: visibility === "DEPARTMENTS" ? departmentIds : [],
      allEmployees: visibility === "ALL_EMPLOYEES",
    });
    const updated = await getDocument(id, user.companyId);
    return NextResponse.json({ document: updated });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAdmin();
    const { id } = await context.params;
    const document = await getDocument(id, user.companyId);
    if (!document) throw notFound("Document not found");
    await getVectorStore().deleteByDocument({ companyId: user.companyId, documentId: id });
    await getDocumentStorage().delete(document.storagePath);
    await deleteDocument(id);
    await writeAuditLog({
      companyId: user.companyId,
      userId: user.id,
      event: "DOCUMENT_DELETE",
      metadata: { documentId: id, filename: document.originalFilename },
      ipAddress: getRequestIp(request),
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
