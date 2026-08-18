import { auth } from "@/auth";
import { isAuthDisabled } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { forbidden, unauthorized } from "@/lib/errors";
import { hashPassword } from "@/services/auth/password";
import type { AccessContext } from "@/types/auth";
import { isAdmin } from "@/types/auth";
import { redirect } from "next/navigation";

function toAccessContext(
  user: {
    id: string;
    email: string;
    name: string;
    role: AccessContext["role"];
    status: AccessContext["status"];
    companyId: string;
    company: { name: string };
    departments: { departmentId: string }[];
  },
): AccessContext {
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

async function getPublicAccessContext(): Promise<AccessContext | null> {
  const existing = await prisma.user.findFirst({
    where: { status: "ACTIVE", role: "ADMIN" },
    include: { company: true, departments: true },
    orderBy: { createdAt: "asc" },
  });
  if (existing) return toAccessContext(existing);

  const company = await prisma.company.upsert({
    where: { slug: "acme-manufacturing" },
    update: {},
    create: { name: "Acme Manufacturing", slug: "acme-manufacturing" },
  });
  const user = await prisma.user.create({
    data: {
      companyId: company.id,
      email: "admin@acme.local",
      name: "Public demo",
      passwordHash: await hashPassword(crypto.randomUUID()),
      role: "ADMIN",
    },
    include: { company: true, departments: true },
  });
  return toAccessContext(user);
}

export async function getAccessContext(): Promise<AccessContext | null> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    if (isAuthDisabled()) return getPublicAccessContext();
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      company: true,
      departments: true,
    },
  });

  if (!user || user.status !== "ACTIVE") {
    if (isAuthDisabled()) return getPublicAccessContext();
    return null;
  }

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
