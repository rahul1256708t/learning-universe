-- ════════════════════════════════════════════════════════════════════
--  Learning Universe — Study Tools
--    • flashcards     : persistent decks with spaced-repetition scheduling
--    • quiz_attempts  : saved interactive quiz results for progress tracking
-- ════════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto;

-- ── flashcards ──────────────────────────────────────────────────────
-- Scheduling follows a simplified SM-2: `ease` grows/shrinks with review
-- ratings, `interval_days` stretches on each successful review, and
-- `due_at` says when the card should be shown again.
create table if not exists public.flashcards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  topic text not null,
  question text not null,
  answer text not null,
  ease real not null default 2.5,
  interval_days real not null default 0,
  repetitions integer not null default 0,
  due_at timestamptz not null default now(),
  last_reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

-- ── quiz_attempts ───────────────────────────────────────────────────
create table if not exists public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  topic text not null,
  difficulty text not null default 'medium',
  total_questions integer not null,
  correct_count integer not null,
  questions jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

-- ── RLS ─────────────────────────────────────────────────────────────
alter table public.flashcards enable row level security;
alter table public.quiz_attempts enable row level security;

drop policy if exists "Users can read own flashcards" on public.flashcards;
create policy "Users can read own flashcards"
  on public.flashcards for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own flashcards" on public.flashcards;
create policy "Users can insert own flashcards"
  on public.flashcards for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own flashcards" on public.flashcards;
create policy "Users can update own flashcards"
  on public.flashcards for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own flashcards" on public.flashcards;
create policy "Users can delete own flashcards"
  on public.flashcards for delete to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can read own quiz attempts" on public.quiz_attempts;
create policy "Users can read own quiz attempts"
  on public.quiz_attempts for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own quiz attempts" on public.quiz_attempts;
create policy "Users can insert own quiz attempts"
  on public.quiz_attempts for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own quiz attempts" on public.quiz_attempts;
create policy "Users can delete own quiz attempts"
  on public.quiz_attempts for delete to authenticated
  using (auth.uid() = user_id);

-- ── Indexes ─────────────────────────────────────────────────────────
create index if not exists flashcards_user_due_idx
  on public.flashcards (user_id, due_at asc);

create index if not exists flashcards_user_topic_idx
  on public.flashcards (user_id, topic);

create index if not exists quiz_attempts_user_created_at_idx
  on public.quiz_attempts (user_id, created_at desc);
