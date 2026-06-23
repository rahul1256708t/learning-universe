# Learning Universe — AI Research Agent

Learning Universe is a production-ready, universe-themed **AI Research Agent** for students, built with Next.js App Router, TypeScript, Tailwind CSS, shadcn/ui, Supabase, OpenRouter, and Tavily. It is **not a chatbot** — for factual, latest, or source-based questions it searches the web, reads trusted sources, verifies the facts, and only then answers with inline citations and a confidence score.

## The research workflow

Every question runs through a visible pipeline (streamed live to the UI):

1. **Understand** the question and **classify** it (school doubt · current info · coding · exam prep · deep research).
2. **Decide** whether research is required — factual / latest / source-based questions always research first.
3. **Search** the web (Tavily), **read** multiple sources, **extract** facts, **compare** them, and **drop** weak/outdated ones.
4. **Write** a student-friendly answer grounded in the sources, with `[n]` citations.
5. Show **source cards**, a **confidence meter**, and a **"What I checked"** transparency panel.
6. **Log** the run and save a reusable **learning memory** in Supabase.

## Features

- **AI Research Agent** at `/api/agent` — orchestrates the full research workflow and streams progress as NDJSON events
- **Research modes**: Fast Research · Deep Research · NCERT · Exam · Coding Research · Step-by-Step Tutor
- **Tavily web search** with source extraction, trust ranking, de-duplication, and citation formatting
- **Confidence scoring** + **"What I checked"** + **"Sources used"** under every researched answer
- **Model fallback chain** — if the primary model fails, the agent retries down a chain so the student still gets an answer
- **Optional direct Anthropic API** for Claude Opus 4.8, otherwise everything runs via OpenRouter
- **Supabase memory / RAG** via pgvector (optional — degrades gracefully to keyword recall without an embedding key)
- **Per-user rate limiting**, error handling, and full audit logging (question, answer, sources, model, mode, confidence)
- Agent quality rules: never invents sources or citations, prefers official/NCERT/research sources, flags disagreement and uncertainty
- Supabase email/password auth, protected dashboard, history sidebar, and automatic saving
- All API keys (OpenRouter, Anthropic, Tavily, embeddings, Supabase service) are **server-side only** — never exposed to the browser
- Supabase tables + RLS for `profiles`, `chats`, `messages`, `usage_logs`, `research_logs`, and `research_memory`

## Install

```bash
npm install
```

## Environment Variables

Create `.env.local` from `.env.example`:

```bash
# Required
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
OPENROUTER_API_KEY=
OPENROUTER_SITE_URL=http://localhost:3000
OPENROUTER_SITE_NAME=Learning Universe

# Recommended — enables live web research + citations
TAVILY_API_KEY=

# Optional — Claude Opus 4.8 via the direct Anthropic API
ANTHROPIC_API_KEY=

# Optional — enables pgvector memory / RAG (OpenAI embeddings)
EMBEDDING_API_KEY=
```

Only the `NEXT_PUBLIC_*` values reach the browser. **`OPENROUTER_API_KEY`, `TAVILY_API_KEY`, `ANTHROPIC_API_KEY`, and `EMBEDDING_API_KEY` must stay server-only** — never prefix them with `NEXT_PUBLIC_`. Each lib file marks exactly where its key is read.

## Supabase Setup

1. Create a Supabase project.
2. Copy the project URL into `NEXT_PUBLIC_SUPABASE_URL`.
3. Copy the anon or publishable public key into `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
4. In the Supabase SQL editor, run the migrations in order:
   - `supabase/migrations/20260617120000_learning_universe.sql`
   - `supabase/migrations/20260623120000_research_agent.sql` (research logs + memory; enables pgvector if your plan allows it, otherwise skips it cleanly)
5. Enable email/password auth in Supabase Auth settings if it is not already enabled.

The migrations enable Row Level Security so users can only read and write their own profiles, chats, messages, usage logs, research logs, and memories.

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
- `src/app/api/agent/route.ts` - the Research Agent endpoint (orchestrates + streams the workflow)
- `src/app/api/chat/route.ts` - legacy OpenRouter chat route (still used by flashcards)
- `src/components/research-agent.tsx` - the Research Agent console UI
- `src/components/research/` - reusable research UI (steps, source cards, confidence meter)
- `src/lib/research/` - the agent core:
  - `classify.ts` - question type + research-required decision
  - `tavily.ts` / `trust.ts` - web search tool + source trust ranking
  - `sources.ts` - source extraction, comparison/filtering, citation formatter, confidence scoring
  - `llm.ts` - OpenRouter + direct-Anthropic streaming with model fallback
  - `memory.ts` - Supabase research logging + memory/RAG
  - `modes.ts` / `models.ts` / `rate-limit.ts` - modes, model config, rate limiting
- `src/lib/supabase` - browser, server, and proxy Supabase clients
- `supabase/migrations` - SQL schema and RLS policies
