import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/services/auth/session";

export async function GET() {
  try {
    const user = await requireUser();
    const conversations = await prisma.conversation.findMany({
      where: { companyId: user.companyId, userId: user.id },
      orderBy: { updatedAt: "desc" },
      take: 50,
      select: { id: true, title: true, updatedAt: true },
    });
    return NextResponse.json({ conversations });
  } catch (error) {
    return jsonError(error);
  }
}
