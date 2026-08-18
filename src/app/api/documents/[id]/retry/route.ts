import { after } from "next/server";
import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api";
import { badRequest, notFound } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/services/auth/session";
import { enqueueDocumentIngest } from "@/services/documents/ingest";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAdmin();
    const { id } = await context.params;
    const document = await prisma.document.findFirst({
      where: { id, companyId: user.companyId },
    });
    if (!document) throw notFound("Document not found");
    if (document.status !== "FAILED") throw badRequest("Only failed documents can be retried");
    await prisma.document.update({
      where: { id },
      data: { status: "UPLOADED", errorMessage: null },
    });
    after(() => enqueueDocumentIngest(id));
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
