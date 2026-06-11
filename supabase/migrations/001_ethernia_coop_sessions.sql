create extension if not exists pgcrypto;

create table if not exists public.ethernia_coop_sessions (
  id uuid primary key default gen_random_uuid(),
  table_code text not null unique,
  host_device_id text not null,
  status text not null default 'lobby' check (status in ('lobby', 'running', 'finished')),
  lobby_state jsonb,
  run_state jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ethernia_coop_actions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.ethernia_coop_sessions(id) on delete cascade,
  device_id text not null,
  seat integer not null,
  hero_id integer,
  action_type text not null,
  payload jsonb not null default '{}'::jsonb,
  accepted boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists ethernia_coop_sessions_table_code_idx
  on public.ethernia_coop_sessions(table_code);

create index if not exists ethernia_coop_actions_session_idx
  on public.ethernia_coop_actions(session_id, created_at desc);

alter table public.ethernia_coop_sessions enable row level security;
alter table public.ethernia_coop_actions enable row level security;

-- Prototype: accès anon ouvert pour tester vite avec un code de table.
-- Pour une version publique, remplace ces politiques par Supabase Auth + règles par session.
drop policy if exists "ethernia coop sessions read" on public.ethernia_coop_sessions;
create policy "ethernia coop sessions read"
  on public.ethernia_coop_sessions for select
  using (true);

drop policy if exists "ethernia coop sessions insert" on public.ethernia_coop_sessions;
create policy "ethernia coop sessions insert"
  on public.ethernia_coop_sessions for insert
  with check (true);

drop policy if exists "ethernia coop sessions update" on public.ethernia_coop_sessions;
create policy "ethernia coop sessions update"
  on public.ethernia_coop_sessions for update
  using (true)
  with check (true);

drop policy if exists "ethernia coop actions read" on public.ethernia_coop_actions;
create policy "ethernia coop actions read"
  on public.ethernia_coop_actions for select
  using (true);

drop policy if exists "ethernia coop actions insert" on public.ethernia_coop_actions;
create policy "ethernia coop actions insert"
  on public.ethernia_coop_actions for insert
  with check (true);
