import { NextResponse } from "next/server";
import { jsonError, getRequestIp } from "@/lib/api";
import { badRequest, notFound } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/services/audit";
import { requireAdmin, requireUser } from "@/services/auth/session";
import { canAccessDocument } from "@/services/permissions/access";
import { getDocumentStorage } from "@/services/storage/local";
import { getVectorStore } from "@/services/vector/qdrant";

async function loadDocument(id: string, companyId: string) {
  return prisma.document.findFirst({
    where: { id, companyId },
    include: {
      uploadedBy: { select: { id: true, name: true, email: true } },
      departments: { include: { department: true } },
    },
  });
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const document = await loadDocument(id, user.companyId);
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
    const document = await loadDocument(id, user.companyId);
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
      const count = await prisma.department.count({
        where: { companyId: user.companyId, id: { in: departmentIds } },
      });
      if (count !== departmentIds.length) throw badRequest("Invalid department selection");
    }

    await prisma.$transaction([
      prisma.documentDepartment.deleteMany({ where: { documentId: id } }),
      prisma.document.update({
        where: { id },
        data: {
          visibility,
          departments:
            visibility === "DEPARTMENTS"
              ? { create: departmentIds.map((departmentId) => ({ departmentId })) }
              : undefined,
        },
      }),
    ]);

    await getVectorStore().updateAccess({
      companyId: user.companyId,
      documentId: id,
      departmentIds: visibility === "DEPARTMENTS" ? departmentIds : [],
      allEmployees: visibility === "ALL_EMPLOYEES",
    });

    const updated = await loadDocument(id, user.companyId);
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
    const document = await prisma.document.findFirst({
      where: { id, companyId: user.companyId },
    });
    if (!document) throw notFound("Document not found");
    await getVectorStore().deleteByDocument({
      companyId: user.companyId,
      documentId: id,
    });
    await getDocumentStorage().delete(document.storagePath);
    await prisma.document.delete({ where: { id } });
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
