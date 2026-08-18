# PrivateAI

Self-hosted company knowledge assistant. Employees ask questions against internal documents. Retrieval is filtered by company and department **before** the local LLM sees any context.

> Your company's knowledge. Your infrastructure. Your AI.

## Stack

- Next.js App Router, TypeScript, Tailwind, shadcn/ui
- Supabase (Postgres via the Supabase API)
- Qdrant
- Ollama (chat + embeddings)
- Local disk storage for originals

## Quick start (local app + Docker dependencies)

```bash
cp .env.example .env
docker compose up -d qdrant ollama
# In Supabase → SQL Editor, run supabase/schema.sql
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Demo accounts (set `SEED_PASSWORD` in `.env` before seeding):

| Email | Role | Access |
| --- | --- | --- |
| `admin@acme.local` | Admin | All company documents |
| `sales@acme.local` | Employee | Sales + company-wide |
| `hr@acme.local` | Employee | HR + company-wide |

Pull models once Ollama is up:

```bash
docker compose exec ollama ollama pull llama3.1
docker compose exec ollama ollama pull nomic-embed-text
```

Then retry processing on `/documents` so embeddings can be generated.

## Full Docker

```bash
docker compose up -d --build
docker compose exec app npm run db:seed
```

The web app is published on port 3000. Postgres, Qdrant, and Ollama bind to localhost only.

## Environment

See `.env.example`. Important variables:

- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `AUTH_SECRET`
- `OLLAMA_BASE_URL` / `OLLAMA_MODEL`
- `EMBEDDING_MODEL` / `EMBEDDING_DIMENSIONS`
- `QDRANT_URL` / `QDRANT_COLLECTION`
- `STORAGE_PATH` / `MAX_UPLOAD_BYTES`

## Tests

```bash
npm test
```

Critical coverage: department ACL, tenant isolation, citation retrieval, and the insufficient-context answer path.
