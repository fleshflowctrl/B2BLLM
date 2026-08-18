import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api";
import { notFound } from "@/lib/errors";
import { deleteConversation, getConversation } from "@/lib/db";
import { requireUser } from "@/services/auth/session";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const conversation = await getConversation(id, user.companyId, user.id);
    if (!conversation) throw notFound("Conversation not found");
    return NextResponse.json({ conversation });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const conversation = await getConversation(id, user.companyId, user.id);
    if (!conversation) throw notFound("Conversation not found");
    await deleteConversation(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
