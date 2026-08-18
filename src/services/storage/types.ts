export interface DocumentStorage {
  put(params: {
    companyId: string;
    documentId: string;
    filename: string;
    bytes: Buffer;
  }): Promise<{ storagePath: string }>;
  get(storagePath: string): Promise<Buffer>;
  delete(storagePath: string): Promise<void>;
}

export function sanitizeFilename(original: string) {
  const base = original.replace(/\\/g, "/").split("/").pop() ?? "document";
  const cleaned = base.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/^\.+/, "");
  if (!cleaned || cleaned === "." || cleaned === "..") return "document";
  return cleaned.slice(0, 180);
}
