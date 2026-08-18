import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api";
import { countRows } from "@/lib/db";
import { requireAdmin } from "@/services/auth/session";

export async function GET() {
  try {
    const admin = await requireAdmin();
    const companyId = admin.companyId;
    const [documents, users, departments, conversations, processing, failed] = await Promise.all([
      countRows("Document", { companyId }),
      countRows("User", { companyId }),
      countRows("Department", { companyId }),
      countRows("Conversation", { companyId }),
      countRows("Document", { companyId, status: "PROCESSING" }),
      countRows("Document", { companyId, status: "FAILED" }),
    ]);
    return NextResponse.json({
      stats: { documents, users, departments, conversations, processing, failed },
    });
  } catch (error) {
    return jsonError(error);
  }
}
