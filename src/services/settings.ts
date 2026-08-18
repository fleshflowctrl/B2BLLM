import { DEFAULT_SYSTEM_PROMPT } from "@/lib/constants";
import { getEnv } from "@/lib/env";
import { prisma } from "@/lib/prisma";

export async function getAiSettings(companyId: string) {
  const env = getEnv();
  const existing = await prisma.aiSettings.findUnique({ where: { companyId } });
  if (existing) return existing;
  return prisma.aiSettings.create({
    data: {
      companyId,
      chatModel: env.OLLAMA_MODEL,
      embeddingModel: env.EMBEDDING_MODEL,
      topK: 5,
      temperature: 0.2,
      systemPrompt: DEFAULT_SYSTEM_PROMPT,
    },
  });
}
