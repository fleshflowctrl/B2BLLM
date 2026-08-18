import "dotenv/config";
import { createCompany, createUser, getCompanyBySlug, getDb } from "../src/lib/db";
import { hashPassword } from "../src/services/auth/password";

async function main() {
  const password = process.env.SEED_PASSWORD;
  if (!password) {
    throw new Error("Set SEED_PASSWORD in your environment before seeding.");
  }
  const passwordHash = await hashPassword(password);
  const company =
    (await getCompanyBySlug("acme-manufacturing")) ??
    (await createCompany({ name: "Acme Manufacturing", slug: "acme-manufacturing" }));

  const db = getDb();
  const departmentNames = ["Management", "Sales", "Finance", "Engineering", "HR"];
  const departments = [];
  for (const name of departmentNames) {
    const existing = await db.from("Department").select("*").eq("companyId", company.id).eq("name", name).maybeSingle();
    if (existing.data) {
      departments.push(existing.data);
      continue;
    }
    const { data, error } = await db
      .from("Department")
      .insert({
        id: crypto.randomUUID(),
        companyId: company.id,
        name,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .select("*")
      .single();
    if (error) throw error;
    departments.push(data);
  }

  const existingAdmin = await db.from("User").select("*").eq("email", "admin@acme.local").maybeSingle();
  if (!existingAdmin.data) {
    await createUser({
      companyId: company.id,
      email: "admin@acme.local",
      name: "Alex Admin",
      passwordHash,
      role: "ADMIN",
      status: "ACTIVE",
    });
  }
  if (!(await db.from("User").select("id").eq("email", "sales@acme.local").maybeSingle()).data) {
    await createUser({
      companyId: company.id,
      email: "sales@acme.local",
      name: "Sam Sales",
      passwordHash,
      role: "EMPLOYEE",
      status: "ACTIVE",
    });
  }
  if (!(await db.from("User").select("id").eq("email", "hr@acme.local").maybeSingle()).data) {
    await createUser({
      companyId: company.id,
      email: "hr@acme.local",
      name: "Helen HR",
      passwordHash,
      role: "EMPLOYEE",
      status: "ACTIVE",
    });
  }

  console.log("Seed complete.");
  console.log("  admin@acme.local");
  console.log("  sales@acme.local");
  console.log("  hr@acme.local");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
