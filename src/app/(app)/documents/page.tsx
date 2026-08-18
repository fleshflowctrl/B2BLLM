import { DocumentsClient } from "@/components/documents/documents-client";
import { listCompanyDepartments, listCompanyDocuments } from "@/lib/repo";
import { requireUserPage } from "@/services/auth/session";
import { isAdmin } from "@/types/auth";

export default async function DocumentsPage() {
  const user = await requireUserPage();
  const [documents, departments] = await Promise.all([
    listCompanyDocuments(user),
    listCompanyDepartments(user.companyId),
  ]);

  return (
    <DocumentsClient
      isAdmin={isAdmin(user)}
      departments={departments.map((department) => ({ id: department.id, name: department.name }))}
      documents={documents.map((document) => ({
        id: document.id,
        originalFilename: document.original_filename,
        status: document.status,
        visibility: document.is_company_wide ? "ALL_EMPLOYEES" : "DEPARTMENTS",
        fileSize: document.file_size,
        createdAt: document.created_at,
        uploadedByName: document.profiles?.full_name ?? "Unknown",
        errorMessage: document.processing_error,
        departments: (document.document_departments ?? [])
          .map((row: { departments?: { id: string; name: string } }) => row.departments)
          .filter(Boolean)
          .map((department: { id: string; name: string }) => ({ id: department.id, name: department.name })),
      }))}
    />
  );
}
