# Learning Universe

Learning Universe is a production-ready universe-themed AI learning app built with Next.js App Router, TypeScript, Tailwind CSS, shadcn/ui, Supabase, and OpenRouter.

## Features

- Supabase email/password signup, login, logout, profile, and protected dashboard
- Secure `/api/chat` route that calls OpenRouter only on the server
- **Study agent with tool use**: the chat route runs an agent loop that can search the student's uploaded materials (RAG) and run exact calculations, then answer — not just a single-shot chatbot
- **Persistent knowledge base (Materials)**: upload notes/textbooks/documents that are chunked, embedded with pgvector, and retrieved by the agent across sessions
- Streaming AI responses with Markdown rendering and copy buttons
- File attachments in chat: attach a text/code file or image and ask questions about it (text is embedded into the prompt; images are sent to vision-capable models)
- Chat history sidebar, new chat, delete chat, clear all history, and automatic saving
- Learning modes: Tutor, Homework, Notes, Quiz, Exam Prep, ELI5, Formula Helper, and NCERT-style answers
- Supabase tables and RLS policies for `profiles`, `chats`, `messages`, `usage_logs`, `documents`, and `document_chunks`
- Vercel-ready environment variable setup

## Install

```bash
npm install
```

## Environment Variables

Create `.env.local` from `.env.example`:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
OPENROUTER_API_KEY=
OPENROUTER_SITE_URL=http://localhost:3000
OPENROUTER_SITE_NAME=Learning Universe

# Embeddings for the Materials knowledge base (RAG). Optional, but required to
# upload and search study materials. Defaults to OpenAI text-embedding-3-small.
EMBEDDINGS_API_KEY=
# Optional overrides (any OpenAI-compatible embeddings endpoint works):
# EMBEDDINGS_BASE_URL=https://api.openai.com/v1
# EMBEDDINGS_MODEL=text-embedding-3-small
```

`OPENROUTER_API_KEY` and `EMBEDDINGS_API_KEY` must stay server-only. Do not prefix them with `NEXT_PUBLIC_`. If you use a non-OpenAI embeddings model, make sure its output dimensions match the `vector(1536)` column in the migration (or update the migration to match).

## Supabase Setup

1. Create a Supabase project.
2. Copy the project URL into `NEXT_PUBLIC_SUPABASE_URL`.
3. Copy the anon or publishable public key into `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
4. In the Supabase SQL editor, run `supabase/migrations/20260617120000_learning_universe.sql`.
5. Then run `supabase/migrations/20260620120000_agent_documents.sql` to enable `pgvector` and create the `documents` / `document_chunks` tables and the `match_document_chunks` search function used by the study agent.
6. Enable email/password auth in Supabase Auth settings if it is not already enabled.

The migrations enable Row Level Security so users can only read and write their own profiles, chats, messages, usage logs, and study materials.

## Run Locally

```bash
npm run dev
```

Open `http://localhost:3000`.

## Build

```bash
npm run build
```

## Deploy on Vercel

1. Push the project to GitHub.
2. Import the repo in Vercel.
3. Add all environment variables from `.env.example`.
4. Deploy.

Vercel will detect Next.js automatically. Keep `OPENROUTER_API_KEY` as a server-side environment variable only.

## Folder Structure

- `src/app` - App Router pages, layouts, and API routes
- `src/app/api/chat/route.ts` - secure OpenRouter server route
- `src/components` - reusable UI and product components
- `src/lib/supabase` - browser, server, and proxy Supabase clients
- `src/lib/learning.ts` - model list and mode system prompts
- `supabase/migrations` - SQL schema and RLS policies
