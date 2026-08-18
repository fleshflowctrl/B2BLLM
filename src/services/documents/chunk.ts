import { DEFAULT_CHUNK_OVERLAP, DEFAULT_CHUNK_SIZE } from "@/lib/constants";

export type TextPage = {
  pageNumber?: number;
  text: string;
};

export type TextChunk = {
  chunkIndex: number;
  pageNumber: number | null;
  text: string;
};

export function cleanText(input: string) {
  return input
    .replace(/\u0000/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function splitBySize(text: string, size: number, overlap: number) {
  if (text.length <= size) return [text];
  const parts: string[] = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + size, text.length);
    parts.push(text.slice(start, end).trim());
    if (end === text.length) break;
    start = Math.max(end - overlap, start + 1);
  }
  return parts.filter(Boolean);
}

export function chunkPages(
  pages: TextPage[],
  chunkSize = DEFAULT_CHUNK_SIZE,
  overlap = DEFAULT_CHUNK_OVERLAP,
): TextChunk[] {
  const chunks: TextChunk[] = [];
  for (const page of pages) {
    const text = cleanText(page.text);
    if (!text) continue;
    const pieces = splitBySize(text, chunkSize, overlap);
    for (const piece of pieces) {
      chunks.push({
        chunkIndex: chunks.length,
        pageNumber: page.pageNumber ?? null,
        text: piece,
      });
    }
  }
  return chunks;
}
