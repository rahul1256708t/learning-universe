-- ════════════════════════════════════════════════════════════════════
--  Learning Universe — Research Agent tables
--    • research_logs    : audit trail of every researched answer
--    • research_memory  : reusable "useful learning" memories (RAG)
--
--  pgvector is OPTIONAL. If the `vector` extension is available we store a
--  1536-dim embedding and enable similarity recall; otherwise the embedding
--  column is simply left null and recall falls back to keyword search.
-- ════════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto;

-- Try to enable pgvector. Wrapped so the whole migration still applies on
-- projects/plans where the extension isn't permitted.
do $$
begin
  create extension if not exists vector;
exception when others then
  raise notice 'pgvector not available — research_memory.embedding will be unused.';
end $$;

-- ── research_logs ───────────────────────────────────────────────────
create table if not exists public.research_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  chat_id uuid references public.chats(id) on delete set null,
  question text not null,
  answer text not null,
  sources jsonb not null default '[]'::jsonb,
  model text not null,
  mode text not null,
  question_type text,
  research_used boolean not null default false,
  confidence integer not null default 0,
  created_at timestamptz not null default now()
);

-- ── research_memory ─────────────────────────────────────────────────
create table if not exists public.research_memory (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  topic text not null,
  summary text not null,
  source_urls jsonb not null default '[]'::jsonb,
  mode text,
  created_at timestamptz not null default now()
);

-- Add the embedding column only if pgvector is installed.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'vector') then
    alter table public.research_memory
      add column if not exists embedding vector(1536);
  end if;
end $$;

-- ── RLS ─────────────────────────────────────────────────────────────
alter table public.research_logs enable row level security;
alter table public.research_memory enable row level security;

drop policy if exists "Users can read own research logs" on public.research_logs;
create policy "Users can read own research logs"
  on public.research_logs for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own research logs" on public.research_logs;
create policy "Users can insert own research logs"
  on public.research_logs for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can read own research memory" on public.research_memory;
create policy "Users can read own research memory"
  on public.research_memory for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own research memory" on public.research_memory;
create policy "Users can insert own research memory"
  on public.research_memory for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own research memory" on public.research_memory;
create policy "Users can delete own research memory"
  on public.research_memory for delete to authenticated
  using (auth.uid() = user_id);

-- ── Indexes ─────────────────────────────────────────────────────────
create index if not exists research_logs_user_created_at_idx
  on public.research_logs (user_id, created_at desc);

create index if not exists research_memory_user_created_at_idx
  on public.research_memory (user_id, created_at desc);

-- Vector index + similarity RPC, only when pgvector exists.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'vector') then
    -- IVFFlat index for cosine similarity search.
    execute 'create index if not exists research_memory_embedding_idx
             on public.research_memory using ivfflat (embedding vector_cosine_ops)
             with (lists = 100)';

    -- Similarity recall RPC used by recallMemories(). SECURITY DEFINER but
    -- always filtered by the caller-supplied user id, and we still keep RLS.
    execute $fn$
      create or replace function public.match_research_memory(
        query_embedding vector(1536),
        match_count int,
        match_user uuid
      )
      returns table (id uuid, topic text, summary text, similarity float)
      language sql stable
      as $body$
        select m.id, m.topic, m.summary,
               1 - (m.embedding <=> query_embedding) as similarity
        from public.research_memory m
        where m.user_id = match_user
          and m.embedding is not null
        order by m.embedding <=> query_embedding
        limit match_count
      $body$;
    $fn$;
  end if;
end $$;
