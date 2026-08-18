import { DEFAULT_SYSTEM_PROMPT } from "@/lib/constants";
import { createAiSettings, getAiSettingsRow } from "@/lib/db";
import { getEnv } from "@/lib/env";

export async function getAiSettings(companyId: string) {
  const env = getEnv();
  const existing = await getAiSettingsRow(companyId);
  if (existing) return existing;
  return createAiSettings({
    companyId,
    chatModel: env.OLLAMA_MODEL,
    embeddingModel: env.EMBEDDING_MODEL,
    topK: 5,
    temperature: 0.2,
    systemPrompt: DEFAULT_SYSTEM_PROMPT,
  });
}
