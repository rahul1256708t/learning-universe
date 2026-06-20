-- Agent foundation: persistent study materials with vector retrieval (RAG).
-- Requires the pgvector extension, available on Supabase.
create extension if not exists vector;

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type text,
  chunk_count integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.document_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  chunk_index integer not null,
  content text not null,
  -- 1536 dimensions matches OpenAI text-embedding-3-small (the default).
  embedding vector(1536),
  created_at timestamptz not null default now()
);

alter table public.documents enable row level security;
alter table public.document_chunks enable row level security;

drop policy if exists "Users can read own documents" on public.documents;
create policy "Users can read own documents"
  on public.documents for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own documents" on public.documents;
create policy "Users can insert own documents"
  on public.documents for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own documents" on public.documents;
create policy "Users can delete own documents"
  on public.documents for delete to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can read own document chunks" on public.document_chunks;
create policy "Users can read own document chunks"
  on public.document_chunks for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own document chunks" on public.document_chunks;
create policy "Users can insert own document chunks"
  on public.document_chunks for insert to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.documents
      where documents.id = document_chunks.document_id
        and documents.user_id = auth.uid()
    )
  );

drop policy if exists "Users can delete own document chunks" on public.document_chunks;
create policy "Users can delete own document chunks"
  on public.document_chunks for delete to authenticated
  using (auth.uid() = user_id);

create index if not exists documents_user_created_at_idx
  on public.documents (user_id, created_at desc);

create index if not exists document_chunks_document_idx
  on public.document_chunks (document_id, chunk_index asc);

-- Approximate nearest-neighbour index for cosine similarity search.
create index if not exists document_chunks_embedding_idx
  on public.document_chunks using hnsw (embedding vector_cosine_ops);

-- Cosine-similarity search scoped to the calling user via auth.uid().
-- Runs with the caller's privileges so row-level security still applies.
create or replace function public.match_document_chunks(
  query_embedding vector(1536),
  match_count integer default 5
)
returns table (
  id uuid,
  document_id uuid,
  document_name text,
  content text,
  similarity double precision
)
language sql
stable
as $$
  select
    c.id,
    c.document_id,
    d.name as document_name,
    c.content,
    1 - (c.embedding <=> query_embedding) as similarity
  from public.document_chunks c
  join public.documents d on d.id = c.document_id
  where c.user_id = auth.uid()
    and c.embedding is not null
  order by c.embedding <=> query_embedding
  limit match_count;
$$;

revoke execute on function public.match_document_chunks(vector, integer) from anon;
grant execute on function public.match_document_chunks(vector, integer) to authenticated;
