import { mkdir, readFile, unlink } from "node:fs/promises";
import path from "node:path";
import { getEnv } from "@/lib/env";
import type { DocumentStorage } from "@/services/storage/types";
import { sanitizeFilename } from "@/services/storage/types";

function assertInsideRoot(root: string, target: string) {
  const resolvedRoot = path.resolve(root);
  const resolvedTarget = path.resolve(target);
  const prefix = resolvedRoot.endsWith(path.sep)
    ? resolvedRoot
    : resolvedRoot + path.sep;
  if (resolvedTarget !== resolvedRoot && !resolvedTarget.startsWith(prefix)) {
    throw new Error("Invalid storage path");
  }
  return resolvedTarget;
}

export class LocalDocumentStorage implements DocumentStorage {
  constructor(private root = getEnv().STORAGE_PATH) {}

  async put(params: {
    companyId: string;
    documentId: string;
    filename: string;
    bytes: Buffer;
  }) {
    const filename = sanitizeFilename(params.filename);
    const relative = path.join(params.companyId, params.documentId, filename);
    const absolute = assertInsideRoot(this.root, path.join(this.root, relative));
    await mkdir(path.dirname(absolute), { recursive: true });
    const { writeFile } = await import("node:fs/promises");
    await writeFile(absolute, params.bytes);
    return { storagePath: relative };
  }

  async get(storagePath: string) {
    const absolute = assertInsideRoot(this.root, path.join(this.root, storagePath));
    return readFile(absolute);
  }

  async delete(storagePath: string) {
    const absolute = assertInsideRoot(this.root, path.join(this.root, storagePath));
    await unlink(absolute).catch(() => undefined);
  }
}

export function getDocumentStorage() {
  return new LocalDocumentStorage();
}
