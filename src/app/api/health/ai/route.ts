import { NextResponse } from "next/server";
import { getEnv, getOllamaChatModel, getOllamaEmbeddingModel } from "@/lib/env";

export async function GET() {
  const env = getEnv();
  try {
    const response = await fetch(`${env.OLLAMA_BASE_URL}/api/tags`, { cache: "no-store" });
    if (!response.ok) throw new Error("unreachable");
    const json = (await response.json()) as { models?: { name: string }[] };
    const names = (json.models ?? []).map((model) => model.name);
    return NextResponse.json({
      connected: true,
      chatModel: getOllamaChatModel(),
      embeddingModel: getOllamaEmbeddingModel(),
      chatAvailable: names.some((name) => name.includes(getOllamaChatModel())),
      embeddingAvailable: names.some((name) => name.includes(getOllamaEmbeddingModel())),
    });
  } catch {
    return NextResponse.json({
      connected: false,
      message: "Local AI service is currently unavailable.",
    });
  }
}
