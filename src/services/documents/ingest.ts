import { prisma } from "@/lib/prisma";
import { embedTexts } from "@/services/ai/ollama";
import { chunkPages } from "@/services/documents/chunk";
import { extractDocument } from "@/services/documents/extract";
import { getJobQueue } from "@/services/jobs/queue";
import { getAiSettings } from "@/services/settings";
import { getDocumentStorage } from "@/services/storage/local";
import { getVectorStore } from "@/services/vector/qdrant";

async function ingestDocument(documentId: string) {
  const document = await prisma.document.findUnique({
    where: { id: documentId },
    include: { departments: true },
  });
  if (!document) return;

  await prisma.document.update({
    where: { id: documentId },
    data: { status: "PROCESSING", errorMessage: null },
  });

  try {
    const storage = getDocumentStorage();
    const bytes = await storage.get(document.storagePath);
    const extracted = await extractDocument(
      bytes,
      document.mimeType,
      document.originalFilename,
    );
    const chunks = chunkPages(extracted.pages);
    if (chunks.length === 0) {
      throw new Error("No extractable text found in document");
    }

    const settings = await getAiSettings(document.companyId);
    const embeddings = await embedTexts(
      chunks.map((chunk) => chunk.text),
      settings.embeddingModel,
    );
    const vector = getVectorStore();
    await vector.deleteByDocument({
      companyId: document.companyId,
      documentId: document.id,
    });
    await vector.upsert(
      chunks.map((chunk, index) => ({
        id: crypto.randomUUID(),
        embedding: embeddings[index],
        payload: {
          companyId: document.companyId,
          documentId: document.id,
          chunkId: `${document.id}:${chunk.chunkIndex}`,
          departmentIds: document.departments.map((row) => row.departmentId),
          allEmployees: document.visibility === "ALL_EMPLOYEES",
          filename: document.originalFilename,
          pageNumber: chunk.pageNumber,
          chunkIndex: chunk.chunkIndex,
          text: chunk.text,
        },
      })),
    );

    await prisma.document.update({
      where: { id: documentId },
      data: {
        status: "READY",
        pageCount: extracted.pageCount,
        chunkCount: chunks.length,
        extractedChars: extracted.text.length,
        processedAt: new Date(),
        errorMessage: null,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message.slice(0, 2000) : "Ingestion failed";
    await prisma.document.update({
      where: { id: documentId },
      data: { status: "FAILED", errorMessage: message },
    });
  }
}

export function registerIngestJobs() {
  const queue = getJobQueue();
  queue.register("ingest-document", async ({ documentId }) => {
    await ingestDocument(documentId);
  });
}

export function enqueueDocumentIngest(documentId: string) {
  registerIngestJobs();
  getJobQueue().enqueue("ingest-document", { documentId });
}

export { ingestDocument };
