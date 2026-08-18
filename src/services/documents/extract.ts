import mammoth from "mammoth";
import { extractText, getDocumentProxy } from "unpdf";
import { badRequest } from "@/lib/errors";
import { cleanText, type TextPage } from "@/services/documents/chunk";

export type ExtractedDocument = {
  pages: TextPage[];
  pageCount: number;
  text: string;
};

export async function extractDocument(
  bytes: Buffer,
  mimeType: string,
  filename: string,
): Promise<ExtractedDocument> {
  const lower = filename.toLowerCase();
  if (mimeType === "application/pdf" || lower.endsWith(".pdf")) {
    const pdf = await getDocumentProxy(new Uint8Array(bytes));
    const result = await extractText(pdf, { mergePages: false });
    const pages = result.text.map((text, index) => ({
      pageNumber: index + 1,
      text: cleanText(text),
    }));
    return {
      pages,
      pageCount: result.totalPages,
      text: pages.map((page) => page.text).join("\n\n"),
    };
  }

  if (
    mimeType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    lower.endsWith(".docx")
  ) {
    const extracted = await mammoth.extractRawText({ buffer: bytes });
    const text = cleanText(extracted.value);
    return { pages: [{ text }], pageCount: 1, text };
  }

  if (
    mimeType === "text/plain" ||
    mimeType === "text/markdown" ||
    lower.endsWith(".txt") ||
    lower.endsWith(".md")
  ) {
    const text = cleanText(bytes.toString("utf8"));
    return { pages: [{ text }], pageCount: 1, text };
  }

  throw badRequest("Unsupported file type");
}
