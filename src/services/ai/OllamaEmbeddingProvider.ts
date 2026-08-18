import { getEnv, getOllamaEmbeddingModel } from "@/lib/env";
import { embedQuery, embedTexts } from "@/services/ai/ollama";
import type { EmbeddingProvider } from "@/services/ai/EmbeddingProvider";

export class OllamaEmbeddingProvider implements EmbeddingProvider {
  constructor(private model = getOllamaEmbeddingModel()) {}

  async embed(text: string) {
    void getEnv().OLLAMA_BASE_URL;
    return embedQuery(text, this.model);
  }

  async embedBatch(texts: string[]) {
    return embedTexts(texts, this.model);
  }
}
