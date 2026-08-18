import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, getRequestIp } from "@/lib/api";
import { badRequest, forbidden, notFound } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/services/audit";
import { requireAdmin } from "@/services/auth/session";

const patchSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  role: z.enum(["ADMIN", "EMPLOYEE"]).optional(),
  status: z.enum(["ACTIVE", "DEACTIVATED"]).optional(),
  departmentIds: z.array(z.string()).optional(),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await requireAdmin();
    const { id } = await context.params;
    const user = await prisma.user.findFirst({
      where: { id, companyId: admin.companyId },
    });
    if (!user) throw notFound("User not found");
    const parsed = patchSchema.safeParse(await request.json());
    if (!parsed.success) throw badRequest("Invalid user payload");
    if (id === admin.id && parsed.data.status === "DEACTIVATED") {
      throw forbidden("You cannot deactivate your own account");
    }
    if (id === admin.id && parsed.data.role === "EMPLOYEE") {
      throw forbidden("You cannot remove your own admin role");
    }
    if (parsed.data.departmentIds) {
      const count = await prisma.department.count({
        where: { companyId: admin.companyId, id: { in: parsed.data.departmentIds } },
      });
      if (count !== parsed.data.departmentIds.length) throw badRequest("Invalid departments");
      await prisma.userDepartment.deleteMany({ where: { userId: id } });
    }
    const updated = await prisma.user.update({
      where: { id },
      data: {
        name: parsed.data.name?.trim(),
        role: parsed.data.role,
        status: parsed.data.status,
        departments: parsed.data.departmentIds
          ? { create: parsed.data.departmentIds.map((departmentId) => ({ departmentId })) }
          : undefined,
      },
      include: { departments: { include: { department: true } } },
    });
    await writeAuditLog({
      companyId: admin.companyId,
      userId: admin.id,
      event: "USER_UPDATED",
      metadata: { targetUserId: id, changes: parsed.data },
      ipAddress: getRequestIp(request),
    });
    const { passwordHash, ...safe } = updated;
    void passwordHash;
    return NextResponse.json({ user: safe });
  } catch (error) {
    return jsonError(error);
  }
}
