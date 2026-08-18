import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api";
import { notFound } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/services/auth/session";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const conversation = await prisma.conversation.findFirst({
      where: { id, companyId: user.companyId, userId: user.id },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });
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
    const conversation = await prisma.conversation.findFirst({
      where: { id, companyId: user.companyId, userId: user.id },
    });
    if (!conversation) throw notFound("Conversation not found");
    await prisma.conversation.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
