import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z
    .string()
    .default("postgresql://privateai:privateai@localhost:5432/privateai"),
  AUTH_SECRET: z.string().default("dev-only-insecure-secret-change-me-now-32"),
  AUTH_URL: z.string().default("http://localhost:3000"),
  OLLAMA_BASE_URL: z.string().default("http://localhost:11434"),
  OLLAMA_MODEL: z.string().default("llama3.1"),
  EMBEDDING_MODEL: z.string().default("nomic-embed-text"),
  EMBEDDING_DIMENSIONS: z.coerce.number().default(768),
  QDRANT_URL: z.string().default("http://localhost:6333"),
  QDRANT_COLLECTION: z.string().default("privateai_chunks"),
  STORAGE_PATH: z.string().default("./data/storage"),
  MAX_UPLOAD_BYTES: z.coerce.number().default(25 * 1024 * 1024),
  // Temporary: leave unset/true so anyone can use the app without signing in.
  AUTH_DISABLED: z
    .enum(["true", "false", "1", "0"])
    .optional()
    .default("true"),
  NEXT_PUBLIC_SUPABASE_URL: z.string().optional(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().optional(),
});

export type AppEnv = z.infer<typeof envSchema>;

let cached: AppEnv | null = null;

export function getEnv(): AppEnv {
  if (cached) return cached;
  cached = envSchema.parse({
    NODE_ENV: process.env.NODE_ENV,
    DATABASE_URL: process.env.DATABASE_URL,
    AUTH_SECRET: process.env.AUTH_SECRET,
    AUTH_URL: process.env.AUTH_URL,
    OLLAMA_BASE_URL: process.env.OLLAMA_BASE_URL,
    OLLAMA_MODEL: process.env.OLLAMA_MODEL,
    EMBEDDING_MODEL: process.env.EMBEDDING_MODEL,
    EMBEDDING_DIMENSIONS: process.env.EMBEDDING_DIMENSIONS,
    QDRANT_URL: process.env.QDRANT_URL,
    QDRANT_COLLECTION: process.env.QDRANT_COLLECTION,
    STORAGE_PATH: process.env.STORAGE_PATH,
    MAX_UPLOAD_BYTES: process.env.MAX_UPLOAD_BYTES,
    AUTH_DISABLED: process.env.AUTH_DISABLED as "true" | "false" | "1" | "0" | undefined,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
  return cached;
}

export function isAuthDisabled() {
  const value = process.env.AUTH_DISABLED ?? "true";
  return value !== "false" && value !== "0";
}
