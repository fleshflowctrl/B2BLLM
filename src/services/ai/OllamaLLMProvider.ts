import { getOllamaChatModel } from "@/lib/env";
import { streamChat, type ChatMessage } from "@/services/ai/ollama";
import type { LLMProvider } from "@/services/ai/LLMProvider";

export class OllamaLLMProvider implements LLMProvider {
  constructor(private model = getOllamaChatModel()) {}

  async generate(params: {
    messages: ChatMessage[];
    temperature?: number;
    model?: string;
  }) {
    let text = "";
    for await (const token of streamChat({
      model: params.model ?? this.model,
      messages: params.messages,
      temperature: params.temperature ?? 0.2,
    })) {
      text += token;
    }
    if (!text.trim()) {
      throw new Error("Local AI service is currently unavailable.");
    }
    return text;
  }

  async *stream(params: {
    messages: ChatMessage[];
    temperature?: number;
    model?: string;
  }) {
    yield* streamChat({
      model: params.model ?? this.model,
      messages: params.messages,
      temperature: params.temperature ?? 0.2,
    });
  }
}
