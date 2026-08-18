import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { forbidden, unauthorized } from "@/lib/errors";
import type { AccessContext } from "@/types/auth";
import { isAdmin } from "@/types/auth";
import { redirect } from "next/navigation";

function asAppRole(role: string): AccessContext["role"] {
  return role === "ADMIN" || role === "ADMIN" ? "ADMIN" : "EMPLOYEE";
}

function asAppStatus(status: string): AccessContext["status"] {
  return status === "INACTIVE" || status === "DEACTIVATED" ? "DEACTIVATED" : "ACTIVE";
}

export async function getAccessContext(): Promise<AccessContext | null> {
  const supabase = await createServerSupabase();
  const { data } = await supabase.auth.getUser();
  const authUser = data.user;
  if (!authUser) return null;

  const admin = createAdminClient();
  const { data: profile, error } = await admin
    .from("profiles")
    .select("id, company_id, email, full_name, role, status, companies(name)")
    .eq("id", authUser.id)
    .maybeSingle();
  if (error || !profile || asAppStatus(profile.status) !== "ACTIVE") return null;

  const { data: memberships } = await admin
    .from("user_departments")
    .select("department_id")
    .eq("user_id", authUser.id);

  const company = profile.companies as { name?: string } | { name?: string }[] | null;
  const companyName = Array.isArray(company) ? company[0]?.name : company?.name;

  return {
    id: profile.id,
    email: profile.email,
    name: profile.full_name,
    role: asAppRole(profile.role),
    status: asAppStatus(profile.status),
    companyId: profile.company_id,
    companyName: companyName ?? "Company",
    departmentIds: (memberships ?? []).map((row) => row.department_id as string),
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
