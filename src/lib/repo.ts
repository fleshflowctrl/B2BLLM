import { createAdminClient } from "@/lib/supabase/admin";
import { canAccessDocument } from "@/services/permissions/access";
import type { AccessContext } from "@/types/auth";

export async function listCompanyDepartments(companyId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("departments")
    .select("*")
    .eq("company_id", companyId)
    .order("name");
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function listCompanyDocuments(user: AccessContext) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("documents")
    .select("*, document_departments(department_id, departments(id,name)), profiles:uploaded_by(full_name)")
    .eq("company_id", user.companyId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).filter((document) =>
    canAccessDocument(user, {
      companyId: document.company_id,
      visibility: document.is_company_wide ? "ALL_EMPLOYEES" : "DEPARTMENTS",
      departmentIds: (document.document_departments ?? []).map((row: { department_id: string }) => row.department_id),
    }),
  );
}

export async function getCompanyDocument(id: string, companyId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("documents")
    .select("*, document_departments(department_id, departments(id,name)), profiles:uploaded_by(full_name)")
    .eq("id", id)
    .eq("company_id", companyId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function listCompanyUsers(companyId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*, user_departments(department_id, departments(id,name))")
    .eq("company_id", companyId)
    .order("created_at");
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function listUserConversations(companyId: string, userId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("conversations")
    .select("id,title,updated_at")
    .eq("company_id", companyId)
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getUserConversation(id: string, companyId: string, userId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("conversations")
    .select("*, messages(*, message_sources(*))")
    .eq("id", id)
    .eq("company_id", companyId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function companyCounts(companyId: string) {
  const supabase = createAdminClient();
  const [documents, users, departments, conversations, processing, failed] = await Promise.all([
    supabase.from("documents").select("id", { count: "exact", head: true }).eq("company_id", companyId),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("company_id", companyId),
    supabase.from("departments").select("id", { count: "exact", head: true }).eq("company_id", companyId),
    supabase.from("conversations").select("id", { count: "exact", head: true }).eq("company_id", companyId),
    supabase.from("documents").select("id", { count: "exact", head: true }).eq("company_id", companyId).eq("status", "PROCESSING"),
    supabase.from("documents").select("id", { count: "exact", head: true }).eq("company_id", companyId).eq("status", "FAILED"),
  ]);
  return {
    documents: documents.count ?? 0,
    users: users.count ?? 0,
    departments: departments.count ?? 0,
    conversations: conversations.count ?? 0,
    processing: processing.count ?? 0,
    failed: failed.count ?? 0,
  };
}
