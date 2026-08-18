import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api";
import { listConversations } from "@/lib/db";
import { requireUser } from "@/services/auth/session";

export async function GET() {
  try {
    const user = await requireUser();
    const conversations = await listConversations(user.companyId, user.id);
    return NextResponse.json({ conversations });
  } catch (error) {
    return jsonError(error);
  }
}
