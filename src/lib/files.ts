import path from "node:path";
import { ALLOWED_EXTENSIONS, ALLOWED_MIME_TYPES } from "@/lib/constants";
import { getEnv } from "@/lib/env";
import { badRequest } from "@/lib/errors";

export function assertAllowedUpload(filename: string, mimeType: string, size: number) {
  const env = getEnv();
  if (size <= 0) throw badRequest("Empty file");
  if (size > env.MAX_UPLOAD_BYTES) {
    throw badRequest(`File exceeds the ${Math.round(env.MAX_UPLOAD_BYTES / 1024 / 1024)}MB limit`);
  }
  const extension = path.extname(filename).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(extension as (typeof ALLOWED_EXTENSIONS)[number])) {
    throw badRequest("Unsupported file type. Upload PDF, TXT, Markdown, or DOCX.");
  }
  if (
    mimeType &&
    mimeType !== "application/octet-stream" &&
    !ALLOWED_MIME_TYPES.includes(mimeType as (typeof ALLOWED_MIME_TYPES)[number])
  ) {
    throw badRequest("Unsupported file type. Upload PDF, TXT, Markdown, or DOCX.");
  }
}
