import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  AUTH_SECRET: z.string().default("dev-only-insecure-secret-change-me-now-32"),
  AUTH_URL: z.string().default("http://localhost:3000"),
  OLLAMA_BASE_URL: z.string().default("http://localhost:11434"),
  OLLAMA_CHAT_MODEL: z.string().default("llama3.1"),
  OLLAMA_EMBEDDING_MODEL: z.string().default("nomic-embed-text"),
  OLLAMA_MODEL: z.string().optional(),
  EMBEDDING_MODEL: z.string().optional(),
  EMBEDDING_DIMENSIONS: z.coerce.number().default(768),
  MAX_UPLOAD_BYTES: z.coerce.number().default(25 * 1024 * 1024),
  STORAGE_PATH: z.string().default("./data/storage"),
  QDRANT_URL: z.string().default("http://localhost:6333"),
  QDRANT_COLLECTION: z.string().default("privateai_chunks"),
  MAX_UPLOAD_SIZE_MB: z.coerce.number().optional(),
  AUTH_DISABLED: z.enum(["true", "false", "1", "0"]).optional().default("false"),
  NEXT_PUBLIC_SUPABASE_URL: z.string().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
});

export type AppEnv = z.infer<typeof envSchema>;

let cached: AppEnv | null = null;

export function getEnv(): AppEnv {
  if (cached) return cached;
  cached = envSchema.parse({
    NODE_ENV: process.env.NODE_ENV,
    AUTH_SECRET: process.env.AUTH_SECRET,
    AUTH_URL: process.env.AUTH_URL,
    OLLAMA_BASE_URL: process.env.OLLAMA_BASE_URL,
    OLLAMA_CHAT_MODEL: process.env.OLLAMA_CHAT_MODEL ?? process.env.OLLAMA_MODEL,
    OLLAMA_EMBEDDING_MODEL: process.env.OLLAMA_EMBEDDING_MODEL ?? process.env.EMBEDDING_MODEL,
    OLLAMA_MODEL: process.env.OLLAMA_MODEL,
    EMBEDDING_MODEL: process.env.EMBEDDING_MODEL,
    EMBEDDING_DIMENSIONS: process.env.EMBEDDING_DIMENSIONS,
    MAX_UPLOAD_BYTES: process.env.MAX_UPLOAD_BYTES,
    STORAGE_PATH: process.env.STORAGE_PATH,
    QDRANT_URL: process.env.QDRANT_URL,
    QDRANT_COLLECTION: process.env.QDRANT_COLLECTION,
    MAX_UPLOAD_SIZE_MB: process.env.MAX_UPLOAD_SIZE_MB,
    AUTH_DISABLED: process.env.AUTH_DISABLED as "true" | "false" | "1" | "0" | undefined,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  });
  return cached;
}

export function isAuthDisabled() {
  const value = process.env.AUTH_DISABLED ?? "false";
  return value === "true" || value === "1";
}

export function getOllamaChatModel() {
  const env = getEnv();
  return env.OLLAMA_CHAT_MODEL || env.OLLAMA_MODEL || "llama3.1";
}

export function getOllamaEmbeddingModel() {
  const env = getEnv();
  return env.OLLAMA_EMBEDDING_MODEL || env.EMBEDDING_MODEL || "nomic-embed-text";
}
