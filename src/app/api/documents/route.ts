import { createHash } from "node:crypto";
import { after } from "next/server";
import { NextResponse } from "next/server";
import { jsonError, getRequestIp } from "@/lib/api";
import { UPLOAD_RATE_LIMIT } from "@/lib/constants";
import { badRequest, forbidden } from "@/lib/errors";
import { assertAllowedUpload } from "@/lib/files";
import { countDepartments, createDocument, listDocuments, setDocumentDepartments, updateDocument } from "@/lib/db";
import { getRateLimiter } from "@/lib/rate-limit";
import { writeAuditLog } from "@/services/audit";
import { requireAdmin, requireUser } from "@/services/auth/session";
import { enqueueDocumentIngest } from "@/services/documents/ingest";
import { canAccessDocument } from "@/services/permissions/access";
import { getDocumentStorage } from "@/services/storage/local";
import { isAdmin } from "@/types/auth";

export async function GET() {
  try {
    const user = await requireUser();
    const documents = (await listDocuments(user.companyId)).filter((document) =>
      canAccessDocument(user, {
        companyId: document.companyId,
        visibility: document.visibility,
        departmentIds: document.departments.map((row) => row.departmentId),
      }),
    );
    return NextResponse.json({ documents });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAdmin();
    const limited = getRateLimiter().check(
      `upload:${user.id}`,
      UPLOAD_RATE_LIMIT.limit,
      UPLOAD_RATE_LIMIT.windowMs,
    );
    if (!limited.ok) {
      return NextResponse.json({ error: "Too many uploads. Please wait." }, { status: 429 });
    }

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw badRequest("File is required");
    const visibility = String(form.get("visibility") ?? "DEPARTMENTS");
    const departmentIds = form.getAll("departmentIds").map(String).filter(Boolean);

    if (visibility !== "ALL_EMPLOYEES" && visibility !== "DEPARTMENTS") {
      throw badRequest("Invalid visibility");
    }
    if (visibility === "DEPARTMENTS" && departmentIds.length === 0) {
      throw badRequest("Select at least one department");
    }
    if (!isAdmin(user)) throw forbidden();

    const bytes = Buffer.from(await file.arrayBuffer());
    assertAllowedUpload(file.name, file.type || "application/octet-stream", bytes.length);
    const checksum = createHash("sha256").update(bytes).digest("hex");

    if (departmentIds.length > 0) {
      const count = await countDepartments(user.companyId, departmentIds);
      if (count !== departmentIds.length) throw badRequest("Invalid department selection");
    }

    const document = await createDocument({
      companyId: user.companyId,
      uploadedById: user.id,
      filename: file.name,
      originalFilename: file.name,
      mimeType: file.type || "application/octet-stream",
      fileSize: bytes.length,
      checksum,
      storagePath: "pending",
      status: "UPLOADED",
      visibility: visibility as "ALL_EMPLOYEES" | "DEPARTMENTS",
    });
    if (visibility === "DEPARTMENTS") {
      await setDocumentDepartments(document.id, departmentIds);
    }

    const stored = await getDocumentStorage().put({
      companyId: user.companyId,
      documentId: document.id,
      filename: file.name,
      bytes,
    });
    await updateDocument(document.id, { storagePath: stored.storagePath });
    after(() => enqueueDocumentIngest(document.id));
    await writeAuditLog({
      companyId: user.companyId,
      userId: user.id,
      event: "DOCUMENT_UPLOAD",
      metadata: { documentId: document.id, filename: file.name },
      ipAddress: getRequestIp(request),
    });
    return NextResponse.json({ document }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
