import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError } from "@/lib/api";
import { badRequest } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireUser } from "@/services/auth/session";

export async function GET() {
  try {
    const user = await requireUser();
    const departments = await prisma.department.findMany({
      where: { companyId: user.companyId },
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ departments });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    const parsed = z.object({ name: z.string().min(1).max(80) }).safeParse(await request.json());
    if (!parsed.success) throw badRequest("Department name is required");
    const name = parsed.data.name.trim();
    const existing = await prisma.department.findFirst({
      where: { companyId: admin.companyId, name },
    });
    if (existing) throw badRequest("A department with that name already exists");
    const department = await prisma.department.create({
      data: { companyId: admin.companyId, name },
    });
    return NextResponse.json({ department }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
