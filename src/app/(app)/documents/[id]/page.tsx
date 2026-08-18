import { notFound } from "next/navigation";
import { getDocument } from "@/lib/db";
import { formatBytes, formatDate } from "@/lib/format";
import { requireUserPage } from "@/services/auth/session";
import { canAccessDocument } from "@/services/permissions/access";

export default async function DocumentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUserPage();
  const { id } = await params;
  const document = await getDocument(id, user.companyId);
  if (
    !document ||
    !canAccessDocument(user, {
      companyId: document.companyId,
      visibility: document.visibility,
      departmentIds: document.departments.map((row) => row.departmentId),
    })
  ) {
    notFound();
  }

  return (
    <div className="h-full overflow-auto p-8">
      <h1 className="text-xl font-semibold">{document.originalFilename}</h1>
      <p className="mt-1 text-sm text-zinc-500">
        {document.status} · {formatBytes(document.fileSize)} · {formatDate(document.createdAt)} ·{" "}
        {document.uploadedBy.name}
      </p>
      {document.errorMessage ? <p className="mt-3 text-sm text-red-600">{document.errorMessage}</p> : null}
      <p className="mt-3 text-sm text-zinc-600">
        Access:{" "}
        {document.visibility === "ALL_EMPLOYEES"
          ? "All employees"
          : document.departments.map((row) => row.department?.name).filter(Boolean).join(", ")}
      </p>
      <iframe
        className="mt-6 h-[70vh] w-full rounded-xl border border-zinc-200 bg-white"
        src={`/api/documents/${document.id}/file`}
        title={document.originalFilename}
      />
    </div>
  );
}
