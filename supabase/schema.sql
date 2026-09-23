create extension if not exists pgcrypto;

create table if not exists public.cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  grader text not null check (grader in ('Degree', 'PSA', 'CGC', 'PGS', 'Collect Direct', 'GMA', 'Integrity Grading', 'CSG', 'C3G', 'SGC', 'GAS')),
  cert_number text not null check (length(trim(cert_number)) > 0),
  grade text not null default '',
  year text not null default '',
  brand text not null default '',
  set_name text not null default '',
  subject text not null default '',
  card_number text not null default '',
  variant text not null default '',
  front_image_url text not null default '',
  back_image_url text not null default '',
  cert_url text not null default '',
  population integer check (population is null or population >= 0),
  grader_specific jsonb not null default '{}'::jsonb,
  manual boolean not null default false,
  added_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cards_user_grader_cert_unique unique (user_id, grader, cert_number)
);

create index if not exists cards_user_added_at_idx on public.cards (user_id, added_at desc);

create or replace function public.set_cards_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists cards_set_updated_at on public.cards;
create trigger cards_set_updated_at before update on public.cards
for each row execute function public.set_cards_updated_at();

alter table public.cards enable row level security;
revoke all on table public.cards from anon, authenticated;
grant select, insert, update, delete on table public.cards to authenticated;

drop policy if exists "Users read their own cards" on public.cards;
create policy "Users read their own cards" on public.cards
for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users insert their own cards" on public.cards;
create policy "Users insert their own cards" on public.cards
for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users update their own cards" on public.cards;
create policy "Users update their own cards" on public.cards
for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users delete their own cards" on public.cards;
create policy "Users delete their own cards" on public.cards
for delete to authenticated
using ((select auth.uid()) = user_id);
