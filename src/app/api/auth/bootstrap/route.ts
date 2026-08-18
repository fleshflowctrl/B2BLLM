import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createServerSupabase } from "@/lib/supabase/server";

const DEFAULT_DEPARTMENTS = ["Management", "Sales", "Engineering", "HR", "Finance"];

export async function POST() {
  try {
    const supabase = await createServerSupabase();
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }
    const authUser = authData.user;
    const admin = createAdminClient();

    const { data: existing } = await admin.from("profiles").select("id").eq("id", authUser.id).maybeSingle();
    if (existing) {
      return NextResponse.json({ ok: true, created: false });
    }

    const { data: companyRow } = await admin
      .from("companies")
      .select("id")
      .eq("slug", "acme-manufacturing")
      .maybeSingle();

    let companyId = companyRow?.id as string | undefined;
    if (!companyId) {
      const { data: createdCompany, error: companyError } = await admin
        .from("companies")
        .insert({ name: "Acme Manufacturing", slug: "acme-manufacturing" })
        .select("id")
        .single();
      if (companyError || !createdCompany) {
        throw new Error(companyError?.message ?? "Could not create company");
      }
      companyId = createdCompany.id;
    }

    const { error: profileError } = await admin.from("profiles").insert({
      id: authUser.id,
      company_id: companyId,
      email: authUser.email ?? "admin@acme.local",
      full_name: authUser.email?.split("@")[0] ?? "Admin",
      role: "ADMIN",
      status: "ACTIVE",
    });
    if (profileError) throw new Error(profileError.message);

    const { data: departments } = await admin.from("departments").select("id,name").eq("company_id", companyId);
    if (!departments?.length) {
      const { data: createdDepartments, error: departmentError } = await admin
        .from("departments")
        .insert(DEFAULT_DEPARTMENTS.map((name) => ({ company_id: companyId, name })))
        .select("id");
      if (departmentError) throw new Error(departmentError.message);
      if (createdDepartments?.length) {
        await admin.from("user_departments").insert(
          createdDepartments.map((department) => ({
            user_id: authUser.id,
            department_id: department.id,
          })),
        );
      }
    }

    const { data: settings } = await admin.from("company_settings").select("id").eq("company_id", companyId).maybeSingle();
    if (!settings) {
      await admin.from("company_settings").insert({
        company_id: companyId,
        chat_model: process.env.OLLAMA_CHAT_MODEL ?? "llama3.1",
        embedding_model: process.env.OLLAMA_EMBEDDING_MODEL ?? "nomic-embed-text",
        top_k: 5,
        temperature: 0.2,
        system_prompt:
          "You are PrivateAI, a secure assistant for this company. Answer only from the supplied company context.",
      });
    }

    return NextResponse.json({ ok: true, created: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not finish sign in" },
      { status: 500 },
    );
  }
}
