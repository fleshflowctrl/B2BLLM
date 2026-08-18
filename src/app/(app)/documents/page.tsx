import { DocumentsClient } from "@/components/documents/documents-client";
import { prisma } from "@/lib/prisma";
import { requireUserPage } from "@/services/auth/session";
import { documentListWhere } from "@/services/permissions/access";
import { isAdmin } from "@/types/auth";

export default async function DocumentsPage() {
  const user = await requireUserPage();
  const [documents, departments] = await Promise.all([
    prisma.document.findMany({
      where: documentListWhere(user),
      include: {
        uploadedBy: { select: { name: true, email: true } },
        departments: { include: { department: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.department.findMany({
      where: { companyId: user.companyId },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <DocumentsClient
      isAdmin={isAdmin(user)}
      departments={departments}
      documents={documents.map((document) => ({
        id: document.id,
        originalFilename: document.originalFilename,
        status: document.status,
        visibility: document.visibility,
        fileSize: document.fileSize,
        createdAt: document.createdAt.toISOString(),
        uploadedByName: document.uploadedBy.name,
        errorMessage: document.errorMessage,
        departments: document.departments.map((row) => ({
          id: row.department.id,
          name: row.department.name,
        })),
      }))}
    />
  );
}
