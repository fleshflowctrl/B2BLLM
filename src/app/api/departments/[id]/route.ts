import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError } from "@/lib/api";
import { badRequest, notFound } from "@/lib/errors";
import { deleteDepartment, getDepartment, updateDepartment } from "@/lib/db";
import { requireAdmin } from "@/services/auth/session";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await requireAdmin();
    const { id } = await context.params;
    const department = await getDepartment(id, admin.companyId);
    if (!department) throw notFound("Department not found");
    const parsed = z.object({ name: z.string().min(1).max(80) }).safeParse(await request.json());
    if (!parsed.success) throw badRequest("Department name is required");
    const updated = await updateDepartment(id, parsed.data.name.trim());
    return NextResponse.json({ department: updated });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await requireAdmin();
    const { id } = await context.params;
    const department = await getDepartment(id, admin.companyId);
    if (!department) throw notFound("Department not found");
    await deleteDepartment(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
