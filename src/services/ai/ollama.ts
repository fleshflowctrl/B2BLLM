import { getEnv } from "@/lib/env";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

async function ollamaFetch(path: string, body: unknown, stream = false) {
  const env = getEnv();
  const response = await fetch(`${env.OLLAMA_BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Ollama request failed (${response.status}): ${text}`);
  }
  if (stream) return response;
  return response.json();
}

export async function embedTexts(texts: string[], model?: string) {
  const env = getEnv();
  const embeddings: number[][] = [];
  const batchSize = 8;
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    try {
      const json = (await ollamaFetch("/api/embed", {
        model: model ?? env.EMBEDDING_MODEL,
        input: batch,
      })) as { embeddings?: number[][] };
      if (!json.embeddings?.length) {
        throw new Error("Ollama embed response missing embeddings");
      }
      embeddings.push(...json.embeddings);
    } catch {
      for (const item of batch) {
        const json = (await ollamaFetch("/api/embeddings", {
          model: model ?? env.EMBEDDING_MODEL,
          prompt: item,
        })) as { embedding: number[] };
        embeddings.push(json.embedding);
      }
    }
  }
  return embeddings;
}

export async function embedQuery(text: string, model?: string) {
  const [embedding] = await embedTexts([text], model);
  return embedding;
}

export async function* streamChat(params: {
  model?: string;
  messages: ChatMessage[];
  temperature: number;
}) {
  const env = getEnv();
  const response = (await ollamaFetch(
    "/api/chat",
    {
      model: params.model ?? env.OLLAMA_MODEL,
      messages: params.messages,
      stream: true,
      options: { temperature: params.temperature },
    },
    true,
  )) as Response;

  if (!response.body) throw new Error("Ollama returned an empty stream");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.trim()) continue;
      const parsed = JSON.parse(line) as {
        message?: { content?: string };
        done?: boolean;
      };
      const token = parsed.message?.content ?? "";
      if (token) yield token;
    }
  }
}
