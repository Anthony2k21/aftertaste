-- Aftertaste ratings.
-- Run this once in the Supabase SQL editor: Dashboard → SQL → New query → Run.
-- Row level security lets a signed-in person read, add, and delete only their own rows.

create extension if not exists pgcrypto;

create table if not exists public.ratings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null default '',
  url text not null default '',
  scores jsonb not null,
  total integer not null check (total >= 0 and total <= 100),
  created_at timestamptz not null default now()
);

create index if not exists ratings_user_created_idx
  on public.ratings (user_id, created_at desc);

alter table public.ratings enable row level security;

drop policy if exists "Users read their own ratings" on public.ratings;
drop policy if exists "Users insert their own ratings" on public.ratings;
drop policy if exists "Users delete their own ratings" on public.ratings;

create policy "Users read their own ratings"
  on public.ratings
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users insert their own ratings"
  on public.ratings
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users delete their own ratings"
  on public.ratings
  for delete
  to authenticated
  using (auth.uid() = user_id);

revoke all on table public.ratings from public;
revoke all on table public.ratings from anon;
grant select, insert, delete on table public.ratings to authenticated;
