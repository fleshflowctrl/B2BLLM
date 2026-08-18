import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { forbidden, unauthorized } from "@/lib/errors";
import type { AccessContext } from "@/types/auth";
import { isAdmin } from "@/types/auth";
import { redirect } from "next/navigation";

export async function getAccessContext(): Promise<AccessContext | null> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      company: true,
      departments: true,
    },
  });

  if (!user || user.status !== "ACTIVE") return null;

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    status: user.status,
    companyId: user.companyId,
    companyName: user.company.name,
    departmentIds: user.departments.map((row) => row.departmentId),
  };
}

export async function requireUser(): Promise<AccessContext> {
  const user = await getAccessContext();
  if (!user) throw unauthorized();
  return user;
}

export async function requireAdmin(): Promise<AccessContext> {
  const user = await requireUser();
  if (!isAdmin(user)) throw forbidden("Administrator access required");
  return user;
}

export async function requireUserPage(): Promise<AccessContext> {
  const user = await getAccessContext();
  if (!user) redirect("/login");
  return user;
}

export async function requireAdminPage(): Promise<AccessContext> {
  const user = await requireUserPage();
  if (!isAdmin(user)) redirect("/");
  return user;
}
