import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type Role = "ADMIN" | "EMPLOYEE";
export type UserStatus = "ACTIVE" | "DEACTIVATED";
export type DocumentStatus = "UPLOADED" | "PROCESSING" | "READY" | "FAILED";
export type DocumentVisibility = "ALL_EMPLOYEES" | "DEPARTMENTS";
export type MessageRole = "USER" | "ASSISTANT";
export type AuditEvent =
  | "USER_LOGIN"
  | "DOCUMENT_UPLOAD"
  | "DOCUMENT_DELETE"
  | "USER_CREATED"
  | "USER_UPDATED"
  | "AI_QUERY";

export type Company = { id: string; name: string; slug: string; createdAt: string; updatedAt: string };
export type User = {
  id: string;
  companyId: string;
  email: string;
  name: string;
  passwordHash: string;
  role: Role;
  status: UserStatus;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
};
export type Department = { id: string; companyId: string; name: string; createdAt: string; updatedAt: string };
export type Document = {
  id: string;
  companyId: string;
  uploadedById: string;
  filename: string;
  originalFilename: string;
  mimeType: string;
  fileSize: number;
  checksum: string;
  storagePath: string;
  status: DocumentStatus;
  visibility: DocumentVisibility;
  errorMessage: string | null;
  pageCount: number | null;
  chunkCount: number | null;
  extractedChars: number | null;
  processedAt: string | null;
  createdAt: string;
  updatedAt: string;
};
export type Conversation = {
  id: string;
  companyId: string;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
};
export type Message = {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  citations: unknown;
  createdAt: string;
};
export type AiSettings = {
  id: string;
  companyId: string;
  chatModel: string;
  embeddingModel: string;
  topK: number;
  temperature: number;
  systemPrompt: string;
};

function requireSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  }
  return { url, key };
}

export function getDb(): SupabaseClient {
  const { url, key } = requireSupabaseEnv();
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function fail(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}

export function newId() {
  return crypto.randomUUID();
}

export function nowIso() {
  return new Date().toISOString();
}

export async function getCompany(id: string) {
  const { data, error } = await getDb().from("Company").select("*").eq("id", id).maybeSingle();
  fail(error);
  return data as Company | null;
}

export async function getCompanyBySlug(slug: string) {
  const { data, error } = await getDb().from("Company").select("*").eq("slug", slug).maybeSingle();
  fail(error);
  return data as Company | null;
}

export async function createCompany(input: { name: string; slug: string }) {
  const row = { id: newId(), name: input.name, slug: input.slug, createdAt: nowIso(), updatedAt: nowIso() };
  const { data, error } = await getDb().from("Company").insert(row).select("*").single();
  fail(error);
  return data as Company;
}

export async function getUserById(id: string) {
  const { data, error } = await getDb().from("User").select("*").eq("id", id).maybeSingle();
  fail(error);
  return data as User | null;
}

export async function findUsersByEmail(email: string) {
  const { data, error } = await getDb().from("User").select("*").eq("email", email);
  fail(error);
  return (data ?? []) as User[];
}

export async function findUser(filter: { id?: string; companyId?: string; email?: string; role?: Role; status?: UserStatus }) {
  let query = getDb().from("User").select("*");
  if (filter.id) query = query.eq("id", filter.id);
  if (filter.companyId) query = query.eq("companyId", filter.companyId);
  if (filter.email) query = query.eq("email", filter.email);
  if (filter.role) query = query.eq("role", filter.role);
  if (filter.status) query = query.eq("status", filter.status);
  const { data, error } = await query.order("createdAt", { ascending: true }).limit(1).maybeSingle();
  fail(error);
  return data as User | null;
}

export async function listUsers(companyId: string) {
  const { data, error } = await getDb().from("User").select("*").eq("companyId", companyId).order("createdAt");
  fail(error);
  return (data ?? []) as User[];
}

export async function createUser(input: Omit<User, "id" | "createdAt" | "updatedAt" | "lastLoginAt"> & { lastLoginAt?: string | null }) {
  const row = {
    id: newId(),
    ...input,
    lastLoginAt: input.lastLoginAt ?? null,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  const { data, error } = await getDb().from("User").insert(row).select("*").single();
  fail(error);
  return data as User;
}

export async function updateUser(id: string, patch: Partial<User>) {
  const { data, error } = await getDb()
    .from("User")
    .update({ ...patch, updatedAt: nowIso() })
    .eq("id", id)
    .select("*")
    .single();
  fail(error);
  return data as User;
}

export async function getUserDepartmentIds(userId: string) {
  const { data, error } = await getDb().from("UserDepartment").select("departmentId").eq("userId", userId);
  fail(error);
  return (data ?? []).map((row) => row.departmentId as string);
}

export async function setUserDepartments(userId: string, departmentIds: string[]) {
  const db = getDb();
  const { error: delError } = await db.from("UserDepartment").delete().eq("userId", userId);
  fail(delError);
  if (departmentIds.length === 0) return;
  const { error } = await db.from("UserDepartment").insert(
    departmentIds.map((departmentId) => ({ userId, departmentId })),
  );
  fail(error);
}

export async function listDepartments(companyId: string) {
  const { data, error } = await getDb().from("Department").select("*").eq("companyId", companyId).order("name");
  fail(error);
  return (data ?? []) as Department[];
}

export async function countDepartments(companyId: string, ids?: string[]) {
  let query = getDb().from("Department").select("id", { count: "exact", head: true }).eq("companyId", companyId);
  if (ids?.length) query = query.in("id", ids);
  const { count, error } = await query;
  fail(error);
  return count ?? 0;
}

export async function getDepartment(id: string, companyId: string) {
  const { data, error } = await getDb().from("Department").select("*").eq("id", id).eq("companyId", companyId).maybeSingle();
  fail(error);
  return data as Department | null;
}

export async function createDepartment(companyId: string, name: string) {
  const row = { id: newId(), companyId, name, createdAt: nowIso(), updatedAt: nowIso() };
  const { data, error } = await getDb().from("Department").insert(row).select("*").single();
  fail(error);
  return data as Department;
}

export async function updateDepartment(id: string, name: string) {
  const { data, error } = await getDb().from("Department").update({ name, updatedAt: nowIso() }).eq("id", id).select("*").single();
  fail(error);
  return data as Department;
}

export async function deleteDepartment(id: string) {
  const { error } = await getDb().from("Department").delete().eq("id", id);
  fail(error);
}

export async function attachUsers(users: User[]) {
  const result = [];
  for (const user of users) {
    const departmentIds = await getUserDepartmentIds(user.id);
    const departments = departmentIds.length
      ? ((await getDb().from("Department").select("*").in("id", departmentIds)).data ?? [])
      : [];
    result.push({
      ...user,
      departments: departments.map((department) => ({
        departmentId: department.id,
        department,
      })),
    });
  }
  return result;
}

export async function attachDocuments(documents: Document[]) {
  if (documents.length === 0) return [];
  const db = getDb();
  const ids = documents.map((doc) => doc.id);
  const uploaderIds = [...new Set(documents.map((doc) => doc.uploadedById))];
  const [{ data: links }, { data: uploaders }] = await Promise.all([
    db.from("DocumentDepartment").select("*").in("documentId", ids),
    db.from("User").select("id,name,email").in("id", uploaderIds),
  ]);
  const deptIds = [...new Set((links ?? []).map((row) => row.departmentId as string))];
  const { data: departments } = deptIds.length
    ? await db.from("Department").select("*").in("id", deptIds)
    : { data: [] as Department[] };
  const deptMap = new Map((departments ?? []).map((item) => [item.id, item]));
  const userMap = new Map((uploaders ?? []).map((item) => [item.id, item]));
  return documents.map((doc) => ({
    ...doc,
    uploadedBy: userMap.get(doc.uploadedById) ?? { id: doc.uploadedById, name: "", email: "" },
    departments: (links ?? [])
      .filter((row) => row.documentId === doc.id)
      .map((row) => ({
        departmentId: row.departmentId,
        department: deptMap.get(row.departmentId),
      })),
  }));
}

export async function listDocuments(companyId: string) {
  const { data, error } = await getDb().from("Document").select("*").eq("companyId", companyId).order("createdAt", { ascending: false });
  fail(error);
  return attachDocuments((data ?? []) as Document[]);
}

export async function getDocument(id: string, companyId?: string) {
  let query = getDb().from("Document").select("*").eq("id", id);
  if (companyId) query = query.eq("companyId", companyId);
  const { data, error } = await query.maybeSingle();
  fail(error);
  if (!data) return null;
  const [attached] = await attachDocuments([data as Document]);
  return attached;
}

export async function createDocument(input: Omit<Document, "id" | "createdAt" | "updatedAt" | "errorMessage" | "pageCount" | "chunkCount" | "extractedChars" | "processedAt"> & Partial<Document>) {
  const row = {
    id: newId(),
    errorMessage: null,
    pageCount: null,
    chunkCount: null,
    extractedChars: null,
    processedAt: null,
    ...input,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  const { data, error } = await getDb().from("Document").insert(row).select("*").single();
  fail(error);
  return data as Document;
}

export async function updateDocument(id: string, patch: Partial<Document>) {
  const { data, error } = await getDb().from("Document").update({ ...patch, updatedAt: nowIso() }).eq("id", id).select("*").single();
  fail(error);
  return data as Document;
}

export async function deleteDocument(id: string) {
  const { error } = await getDb().from("Document").delete().eq("id", id);
  fail(error);
}

export async function setDocumentDepartments(documentId: string, departmentIds: string[]) {
  const db = getDb();
  const { error: delError } = await db.from("DocumentDepartment").delete().eq("documentId", documentId);
  fail(delError);
  if (!departmentIds.length) return;
  const { error } = await db.from("DocumentDepartment").insert(
    departmentIds.map((departmentId) => ({ documentId, departmentId })),
  );
  fail(error);
}

export async function countRows(table: string, match: Record<string, string>) {
  let query = getDb().from(table).select("id", { count: "exact", head: true });
  for (const [key, value] of Object.entries(match)) {
    query = query.eq(key, value);
  }
  const { count, error } = await query;
  fail(error);
  return count ?? 0;
}

export async function listConversations(companyId: string, userId: string) {
  const { data, error } = await getDb()
    .from("Conversation")
    .select("*")
    .eq("companyId", companyId)
    .eq("userId", userId)
    .order("updatedAt", { ascending: false });
  fail(error);
  return (data ?? []) as Conversation[];
}

export async function getConversation(id: string, companyId: string, userId: string) {
  const { data, error } = await getDb()
    .from("Conversation")
    .select("*")
    .eq("id", id)
    .eq("companyId", companyId)
    .eq("userId", userId)
    .maybeSingle();
  fail(error);
  if (!data) return null;
  const { data: messages, error: messageError } = await getDb()
    .from("Message")
    .select("*")
    .eq("conversationId", id)
    .order("createdAt", { ascending: true });
  fail(messageError);
  return { ...(data as Conversation), messages: (messages ?? []) as Message[] };
}

export async function createConversation(input: { companyId: string; userId: string; title: string }) {
  const row = { id: newId(), ...input, createdAt: nowIso(), updatedAt: nowIso() };
  const { data, error } = await getDb().from("Conversation").insert(row).select("*").single();
  fail(error);
  return data as Conversation;
}

export async function updateConversation(id: string, patch: Partial<Conversation>) {
  const { data, error } = await getDb().from("Conversation").update({ ...patch, updatedAt: nowIso() }).eq("id", id).select("*").single();
  fail(error);
  return data as Conversation;
}

export async function deleteConversation(id: string) {
  const { error } = await getDb().from("Conversation").delete().eq("id", id);
  fail(error);
}

export async function createMessage(input: { conversationId: string; role: MessageRole; content: string; citations?: unknown }) {
  const row = { id: newId(), citations: input.citations ?? null, createdAt: nowIso(), ...input };
  const { data, error } = await getDb().from("Message").insert(row).select("*").single();
  fail(error);
  return data as Message;
}

export async function deleteMessage(id: string) {
  const { error } = await getDb().from("Message").delete().eq("id", id);
  fail(error);
}

export async function getAiSettingsRow(companyId: string) {
  const { data, error } = await getDb().from("AiSettings").select("*").eq("companyId", companyId).maybeSingle();
  fail(error);
  return data as AiSettings | null;
}

export async function createAiSettings(input: Omit<AiSettings, "id">) {
  const row = { id: newId(), ...input };
  const { data, error } = await getDb().from("AiSettings").insert(row).select("*").single();
  fail(error);
  return data as AiSettings;
}

export async function updateAiSettings(id: string, patch: Partial<AiSettings>) {
  const { data, error } = await getDb().from("AiSettings").update(patch).eq("id", id).select("*").single();
  fail(error);
  return data as AiSettings;
}

export async function createAuditLog(input: {
  companyId: string;
  userId?: string | null;
  event: AuditEvent;
  metadata?: unknown;
  ipAddress?: string | null;
}) {
  const row = {
    id: newId(),
    companyId: input.companyId,
    userId: input.userId ?? null,
    event: input.event,
    metadata: input.metadata ?? null,
    ipAddress: input.ipAddress ?? null,
    createdAt: nowIso(),
  };
  const { error } = await getDb().from("AuditLog").insert(row);
  fail(error);
}
