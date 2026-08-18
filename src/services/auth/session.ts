import { auth } from "@/auth";
import { isAuthDisabled } from "@/lib/env";
import {
  createCompany,
  createUser,
  findUser,
  getCompany,
  getCompanyBySlug,
  getUserById,
  getUserDepartmentIds,
} from "@/lib/db";
import { forbidden, unauthorized } from "@/lib/errors";
import { hashPassword } from "@/services/auth/password";
import type { AccessContext } from "@/types/auth";
import { isAdmin } from "@/types/auth";
import { redirect } from "next/navigation";

async function toAccessContextFromUser(user: {
  id: string;
  email: string;
  name: string;
  role: AccessContext["role"];
  status: AccessContext["status"];
  companyId: string;
}) {
  const company = await getCompany(user.companyId);
  const departmentIds = await getUserDepartmentIds(user.id);
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    status: user.status,
    companyId: user.companyId,
    companyName: company?.name ?? "Company",
    departmentIds,
  } satisfies AccessContext;
}

async function getPublicAccessContext(): Promise<AccessContext | null> {
  const existing = await findUser({ status: "ACTIVE", role: "ADMIN" });
  if (existing) return toAccessContextFromUser(existing);

  const company =
    (await getCompanyBySlug("acme-manufacturing")) ??
    (await createCompany({ name: "Acme Manufacturing", slug: "acme-manufacturing" }));
  const user = await createUser({
    companyId: company.id,
    email: "admin@acme.local",
    name: "Public demo",
    passwordHash: await hashPassword(crypto.randomUUID()),
    role: "ADMIN",
    status: "ACTIVE",
  });
  return toAccessContextFromUser(user);
}

export async function getAccessContext(): Promise<AccessContext | null> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    if (isAuthDisabled()) return getPublicAccessContext();
    return null;
  }

  const user = await getUserById(userId);
  if (!user || user.status !== "ACTIVE") {
    if (isAuthDisabled()) return getPublicAccessContext();
    return null;
  }
  return toAccessContextFromUser(user);
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
