import { after } from "next/server";
import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api";
import { UPLOAD_RATE_LIMIT } from "@/lib/constants";
import { getRateLimiter } from "@/lib/rate-limit";
import { listCompanyDocuments } from "@/lib/repo";
import { requireAdmin, requireUser } from "@/services/auth/session";
import { processDocument, uploadDocument } from "@/services/documents/DocumentService";
import { isAdmin } from "@/types/auth";

export async function GET() {
  try {
    const user = await requireUser();
    const documents = await listCompanyDocuments(user);
    return NextResponse.json({ documents });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAdmin();
    const limited = getRateLimiter().check(`upload:${user.id}`, UPLOAD_RATE_LIMIT.limit, UPLOAD_RATE_LIMIT.windowMs);
    if (!limited.ok) {
      return NextResponse.json({ error: "Too many uploads. Please wait." }, { status: 429 });
    }
    if (!isAdmin(user)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "File is required" }, { status: 400 });
    }
    const visibility = String(form.get("visibility") ?? "DEPARTMENTS");
    const departmentIds = form.getAll("departmentIds").map(String).filter(Boolean);
    const documentId = await uploadDocument({
      user,
      file,
      departmentIds,
      companyWide: visibility === "ALL_EMPLOYEES",
    });
    after(() => processDocument(documentId).catch((error) => console.error(error)));
    return NextResponse.json({ documentId }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
