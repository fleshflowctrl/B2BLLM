import { createHash } from "node:crypto";
import { after } from "next/server";
import { NextResponse } from "next/server";
import { jsonError, getRequestIp } from "@/lib/api";
import { UPLOAD_RATE_LIMIT } from "@/lib/constants";
import { badRequest, forbidden } from "@/lib/errors";
import { assertAllowedUpload } from "@/lib/files";
import { prisma } from "@/lib/prisma";
import { getRateLimiter } from "@/lib/rate-limit";
import { writeAuditLog } from "@/services/audit";
import { requireAdmin, requireUser } from "@/services/auth/session";
import { enqueueDocumentIngest } from "@/services/documents/ingest";
import { documentListWhere } from "@/services/permissions/access";
import { getDocumentStorage } from "@/services/storage/local";
import { isAdmin } from "@/types/auth";

export async function GET() {
  try {
    const user = await requireUser();
    const documents = await prisma.document.findMany({
      where: documentListWhere(user),
      include: {
        uploadedBy: { select: { id: true, name: true, email: true } },
        departments: { include: { department: true } },
      },
      orderBy: { createdAt: "desc" },
    });
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
    const departmentIds = form
      .getAll("departmentIds")
      .map(String)
      .filter(Boolean);

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
      const count = await prisma.department.count({
        where: { companyId: user.companyId, id: { in: departmentIds } },
      });
      if (count !== departmentIds.length) throw badRequest("Invalid department selection");
    }

    const document = await prisma.document.create({
      data: {
        companyId: user.companyId,
        uploadedById: user.id,
        filename: file.name,
        originalFilename: file.name,
        mimeType: file.type || "application/octet-stream",
        fileSize: bytes.length,
        checksum,
        storagePath: "pending",
        status: "UPLOADED",
        visibility,
        departments:
          visibility === "DEPARTMENTS"
            ? { create: departmentIds.map((departmentId) => ({ departmentId })) }
            : undefined,
      },
    });

    const stored = await getDocumentStorage().put({
      companyId: user.companyId,
      documentId: document.id,
      filename: file.name,
      bytes,
    });
    await prisma.document.update({
      where: { id: document.id },
      data: { storagePath: stored.storagePath },
    });

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
