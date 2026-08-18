import { DocumentsClient } from "@/components/documents/documents-client";
import { listDepartments, listDocuments } from "@/lib/db";
import { requireUserPage } from "@/services/auth/session";
import { canAccessDocument } from "@/services/permissions/access";
import { isAdmin } from "@/types/auth";

export default async function DocumentsPage() {
  const user = await requireUserPage();
  const [documents, departments] = await Promise.all([
    listDocuments(user.companyId),
    listDepartments(user.companyId),
  ]);
  const visible = documents.filter((document) =>
    canAccessDocument(user, {
      companyId: document.companyId,
      visibility: document.visibility,
      departmentIds: document.departments.map((row) => row.departmentId),
    }),
  );

  return (
    <DocumentsClient
      isAdmin={isAdmin(user)}
      departments={departments}
      documents={visible.map((document) => ({
        id: document.id,
        originalFilename: document.originalFilename,
        status: document.status,
        visibility: document.visibility,
        fileSize: document.fileSize,
        createdAt: document.createdAt,
        uploadedByName: document.uploadedBy.name,
        errorMessage: document.errorMessage,
        departments: document.departments
          .map((row) => row.department)
          .filter(Boolean)
          .map((department) => ({ id: department!.id, name: department!.name })),
      }))}
    />
  );
}
