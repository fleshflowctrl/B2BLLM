import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, getRequestIp } from "@/lib/api";
import { badRequest } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/services/audit";
import { requireAdmin } from "@/services/auth/session";
import { hashPassword } from "@/services/auth/password";

const createSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email(),
  password: z.string().min(8).max(120),
  role: z.enum(["ADMIN", "EMPLOYEE"]),
  departmentIds: z.array(z.string()).default([]),
});

export async function GET() {
  try {
    const user = await requireAdmin();
    const users = await prisma.user.findMany({
      where: { companyId: user.companyId },
      include: { departments: { include: { department: true } } },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json({
      users: users.map((item) => {
        const { passwordHash, ...safe } = item;
        return { ...safe, passwordHash: undefined, hasPassword: Boolean(passwordHash) };
      }),
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    const parsed = createSchema.safeParse(await request.json());
    if (!parsed.success) throw badRequest("Invalid user payload");
    const email = parsed.data.email.trim().toLowerCase();
    const existing = await prisma.user.findFirst({
      where: { companyId: admin.companyId, email },
    });
    if (existing) throw badRequest("A user with that email already exists");
    if (parsed.data.departmentIds.length > 0) {
      const count = await prisma.department.count({
        where: { companyId: admin.companyId, id: { in: parsed.data.departmentIds } },
      });
      if (count !== parsed.data.departmentIds.length) throw badRequest("Invalid departments");
    }
    const created = await prisma.user.create({
      data: {
        companyId: admin.companyId,
        name: parsed.data.name.trim(),
        email,
        passwordHash: await hashPassword(parsed.data.password),
        role: parsed.data.role,
        departments: {
          create: parsed.data.departmentIds.map((departmentId) => ({ departmentId })),
        },
      },
      include: { departments: { include: { department: true } } },
    });
    await writeAuditLog({
      companyId: admin.companyId,
      userId: admin.id,
      event: "USER_CREATED",
      metadata: { createdUserId: created.id, email: created.email },
      ipAddress: getRequestIp(request),
    });
    const { passwordHash, ...safe } = created;
    void passwordHash;
    return NextResponse.json({ user: safe }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
