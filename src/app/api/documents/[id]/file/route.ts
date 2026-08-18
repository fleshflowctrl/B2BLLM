import { jsonError } from "@/lib/api";
import { notFound } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/services/auth/session";
import { canAccessDocument } from "@/services/permissions/access";
import { getDocumentStorage } from "@/services/storage/local";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const document = await prisma.document.findFirst({
      where: { id, companyId: user.companyId },
      include: { departments: true },
    });
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
    const bytes = await getDocumentStorage().get(document.storagePath);
    return new Response(bytes, {
      headers: {
        "Content-Type": document.mimeType,
        "Content-Disposition": `inline; filename="${document.originalFilename.replaceAll('"', "")}"`,
        "Content-Length": String(bytes.length),
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
