import { readFile } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { hashPassword } from "../src/services/auth/password";
import { DEFAULT_SYSTEM_PROMPT } from "../src/lib/constants";

const databaseUrl =
  process.env.DATABASE_URL ??
  "postgresql://privateai:privateai@localhost:5432/privateai";

const adapter = new PrismaPg({ connectionString: databaseUrl });
const prisma = new PrismaClient({ adapter });

async function main() {
  const passwordHash = await hashPassword("Password123!");
  const company = await prisma.company.upsert({
    where: { slug: "acme-manufacturing" },
    update: {},
    create: { name: "Acme Manufacturing", slug: "acme-manufacturing" },
  });

  const departmentNames = ["Management", "Sales", "Finance", "Engineering", "HR"];
  const departments = [];
  for (const name of departmentNames) {
    departments.push(
      await prisma.department.upsert({
        where: { companyId_name: { companyId: company.id, name } },
        update: {},
        create: { companyId: company.id, name },
      }),
    );
  }
  const byName = Object.fromEntries(departments.map((item) => [item.name, item]));

  const admin = await prisma.user.upsert({
    where: { companyId_email: { companyId: company.id, email: "admin@acme.local" } },
    update: { passwordHash, status: "ACTIVE", role: "ADMIN" },
    create: {
      companyId: company.id,
      email: "admin@acme.local",
      name: "Alex Admin",
      passwordHash,
      role: "ADMIN",
      departments: { create: departments.map((department) => ({ departmentId: department.id })) },
    },
  });

  await prisma.user.upsert({
    where: { companyId_email: { companyId: company.id, email: "sales@acme.local" } },
    update: { passwordHash, status: "ACTIVE" },
    create: {
      companyId: company.id,
      email: "sales@acme.local",
      name: "Sam Sales",
      passwordHash,
      role: "EMPLOYEE",
      departments: { create: [{ departmentId: byName.Sales.id }] },
    },
  });

  await prisma.user.upsert({
    where: { companyId_email: { companyId: company.id, email: "hr@acme.local" } },
    update: { passwordHash, status: "ACTIVE" },
    create: {
      companyId: company.id,
      email: "hr@acme.local",
      name: "Helen HR",
      passwordHash,
      role: "EMPLOYEE",
      departments: { create: [{ departmentId: byName.HR.id }] },
    },
  });

  await prisma.aiSettings.upsert({
    where: { companyId: company.id },
    update: {},
    create: {
      companyId: company.id,
      chatModel: process.env.OLLAMA_MODEL ?? "llama3.1",
      embeddingModel: process.env.EMBEDDING_MODEL ?? "nomic-embed-text",
      topK: 5,
      temperature: 0.2,
      systemPrompt: DEFAULT_SYSTEM_PROMPT,
    },
  });

  const docs = [
    {
      file: "employee-handbook.txt",
      visibility: "ALL_EMPLOYEES" as const,
      departmentIds: [] as string[],
    },
    {
      file: "sales-pricing-q3.txt",
      visibility: "DEPARTMENTS" as const,
      departmentIds: [byName.Sales.id],
    },
    {
      file: "hr-compensation-policy.txt",
      visibility: "DEPARTMENTS" as const,
      departmentIds: [byName.HR.id],
    },
    {
      file: "machine-482-failure.txt",
      visibility: "DEPARTMENTS" as const,
      departmentIds: [byName.Engineering.id],
    },
  ];

  const { LocalDocumentStorage } = await import("../src/services/storage/local");
  const storage = new LocalDocumentStorage(process.env.STORAGE_PATH ?? "./data/storage");

  for (const spec of docs) {
    const existing = await prisma.document.findFirst({
      where: { companyId: company.id, originalFilename: spec.file },
    });
    if (existing) continue;
    const bytes = await readFile(path.join(process.cwd(), "prisma/seed-docs", spec.file));
    const document = await prisma.document.create({
      data: {
        companyId: company.id,
        uploadedById: admin.id,
        filename: spec.file,
        originalFilename: spec.file,
        mimeType: "text/plain",
        fileSize: bytes.length,
        checksum: createHash("sha256").update(bytes).digest("hex"),
        storagePath: "pending",
        status: "UPLOADED",
        visibility: spec.visibility,
        departments: spec.departmentIds.length
          ? { create: spec.departmentIds.map((departmentId) => ({ departmentId })) }
          : undefined,
      },
    });
    const stored = await storage.put({
      companyId: company.id,
      documentId: document.id,
      filename: spec.file,
      bytes,
    });
    await prisma.document.update({
      where: { id: document.id },
      data: { storagePath: stored.storagePath },
    });
  }

  console.log("Seed complete.");
  console.log("  admin@acme.local / Password123!");
  console.log("  sales@acme.local / Password123!");
  console.log("  hr@acme.local / Password123!");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
