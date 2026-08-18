import { DEFAULT_SYSTEM_PROMPT } from "@/lib/constants";
import { createAiSettings, getAiSettingsRow } from "@/lib/db";
import { getOllamaChatModel, getOllamaEmbeddingModel } from "@/lib/env";

export async function getAiSettings(companyId: string) {
  const existing = await getAiSettingsRow(companyId);
  if (existing) return existing;
  return createAiSettings({
    companyId,
    chatModel: getOllamaChatModel(),
    embeddingModel: getOllamaEmbeddingModel(),
    topK: 5,
    temperature: 0.2,
    systemPrompt: DEFAULT_SYSTEM_PROMPT,
  });
}
