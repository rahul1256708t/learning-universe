create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.chats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Untitled chat',
  model text not null,
  mode text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references public.chats(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.usage_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  model text not null,
  tokens_used integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.chats enable row level security;
alter table public.messages enable row level security;
alter table public.usage_logs enable row level security;

drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile"
  on public.profiles for select to authenticated
  using (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
  on public.profiles for insert to authenticated
  with check (auth.uid() = id);

drop policy if exists "Users can read own chats" on public.chats;
create policy "Users can read own chats"
  on public.chats for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own chats" on public.chats;
create policy "Users can insert own chats"
  on public.chats for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own chats" on public.chats;
create policy "Users can update own chats"
  on public.chats for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own chats" on public.chats;
create policy "Users can delete own chats"
  on public.chats for delete to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can read own messages" on public.messages;
create policy "Users can read own messages"
  on public.messages for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own messages" on public.messages;
create policy "Users can insert own messages"
  on public.messages for insert to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.chats
      where chats.id = messages.chat_id
        and chats.user_id = auth.uid()
    )
  );

drop policy if exists "Users can delete own messages" on public.messages;
create policy "Users can delete own messages"
  on public.messages for delete to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can read own usage logs" on public.usage_logs;
create policy "Users can read own usage logs"
  on public.usage_logs for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own usage logs" on public.usage_logs;
create policy "Users can insert own usage logs"
  on public.usage_logs for insert to authenticated
  with check (auth.uid() = user_id);

create index if not exists chats_user_created_at_idx
  on public.chats (user_id, created_at desc);

create index if not exists messages_chat_created_at_idx
  on public.messages (chat_id, created_at asc);

create index if not exists usage_logs_user_created_at_idx
  on public.usage_logs (user_id, created_at desc);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

revoke execute on function public.handle_new_user() from anon;
revoke execute on function public.handle_new_user() from authenticated;
revoke execute on function public.handle_new_user() from public;
