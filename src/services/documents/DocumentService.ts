import { createHash } from "node:crypto";
import { getEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { OllamaEmbeddingProvider } from "@/services/ai/OllamaEmbeddingProvider";
import { chunkPages } from "@/services/documents/chunk";
import { extractDocument } from "@/services/documents/extract";
import { SupabaseDocumentStorage } from "@/services/storage/SupabaseDocumentStorage";
import type { AccessContext } from "@/types/auth";

const storage = new SupabaseDocumentStorage();

export async function processDocument(documentId: string) {
  const supabase = createAdminClient();
  const { data: document, error } = await supabase
    .from("documents")
    .select("*, document_departments(department_id)")
    .eq("id", documentId)
    .maybeSingle();
  if (error || !document) throw new Error(error?.message ?? "Document not found");

  await supabase
    .from("documents")
    .update({ status: "PROCESSING", processing_error: null, updated_at: new Date().toISOString() })
    .eq("id", documentId);

  try {
    const bytes = await storage.download(document.storage_path);
    const extracted = await extractDocument(bytes, document.mime_type, document.original_filename);
    const chunks = chunkPages(extracted.pages, getEnv().MAX_UPLOAD_BYTES ? 800 : 800, 150);
    if (!chunks.length) throw new Error("The document did not contain extractable text.");

    const embeddings = await new OllamaEmbeddingProvider().embedBatch(chunks.map((chunk) => chunk.text));
    await supabase.from("document_chunks").delete().eq("document_id", documentId);

    const rows = chunks.map((chunk, index) => ({
      company_id: document.company_id,
      document_id: documentId,
      content: chunk.text,
      embedding: embeddings[index],
      page_number: chunk.pageNumber,
      chunk_index: chunk.chunkIndex,
      token_count: Math.ceil(chunk.text.length / 4),
      metadata: { filename: document.original_filename },
    }));
    const { error: insertError } = await supabase.from("document_chunks").insert(rows);
    if (insertError) throw new Error(insertError.message);

    await supabase
      .from("documents")
      .update({
        status: "READY",
        page_count: extracted.pageCount,
        chunk_count: chunks.length,
        processing_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", documentId);

    await supabase.from("audit_logs").insert({
      company_id: document.company_id,
      user_id: document.uploaded_by,
      event_type: "DOCUMENT_PROCESSING_COMPLETED",
      entity_type: "document",
      entity_id: documentId,
      metadata: { chunks: chunks.length, pages: extracted.pageCount },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 2000) : "Processing failed";
    await supabase
      .from("documents")
      .update({ status: "FAILED", processing_error: message, updated_at: new Date().toISOString() })
      .eq("id", documentId);
    await supabase.from("audit_logs").insert({
      company_id: document.company_id,
      user_id: document.uploaded_by,
      event_type: "DOCUMENT_PROCESSING_FAILED",
      entity_type: "document",
      entity_id: documentId,
      metadata: { error: message },
    });
    throw error;
  }
}

export async function uploadDocument(params: {
  user: AccessContext;
  file: File;
  departmentIds: string[];
  companyWide: boolean;
}) {
  const env = getEnv();
  const maxBytes = (env.MAX_UPLOAD_SIZE_MB ?? 25) * 1024 * 1024;
  if (params.file.size > Math.min(env.MAX_UPLOAD_BYTES, maxBytes)) {
    throw new Error("File is too large.");
  }
  const bytes = Buffer.from(await params.file.arrayBuffer());
  const checksum = createHash("sha256").update(bytes).digest("hex");
  const supabase = createAdminClient();
  const { data: document, error } = await supabase
    .from("documents")
    .insert({
      company_id: params.user.companyId,
      filename: params.file.name.replace(/[^a-zA-Z0-9._-]/g, "_"),
      original_filename: params.file.name,
      storage_path: "pending",
      mime_type: params.file.type || "application/octet-stream",
      file_size: params.file.size,
      status: "UPLOADED",
      is_company_wide: params.companyWide,
      uploaded_by: params.user.id,
      checksum,
    })
    .select("*")
    .single();
  if (error || !document) throw new Error(error?.message ?? "Could not create document");

  const storagePath = await storage.upload({
    companyId: params.user.companyId,
    documentId: document.id,
    filename: document.filename,
    bytes,
    contentType: document.mime_type,
  });
  await supabase.from("documents").update({ storage_path: storagePath }).eq("id", document.id);
  if (!params.companyWide && params.departmentIds.length) {
    await supabase.from("document_departments").insert(
      params.departmentIds.map((departmentId) => ({
        document_id: document.id,
        department_id: departmentId,
      })),
    );
  }
  await supabase.from("audit_logs").insert({
    company_id: params.user.companyId,
    user_id: params.user.id,
    event_type: "DOCUMENT_UPLOAD",
    entity_type: "document",
    entity_id: document.id,
    metadata: { filename: params.file.name },
  });
  return document.id;
}
