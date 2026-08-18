import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/services/auth/session";

export async function GET() {
  try {
    const admin = await requireAdmin();
    const companyId = admin.companyId;
    const [documents, users, departments, conversations, processing, failed] =
      await Promise.all([
        prisma.document.count({ where: { companyId } }),
        prisma.user.count({ where: { companyId } }),
        prisma.department.count({ where: { companyId } }),
        prisma.conversation.count({ where: { companyId } }),
        prisma.document.count({ where: { companyId, status: "PROCESSING" } }),
        prisma.document.count({ where: { companyId, status: "FAILED" } }),
      ]);
    return NextResponse.json({
      stats: { documents, users, departments, conversations, processing, failed },
    });
  } catch (error) {
    return jsonError(error);
  }
}
