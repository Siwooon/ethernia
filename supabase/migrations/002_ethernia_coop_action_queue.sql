alter table public.ethernia_coop_actions
  add column if not exists processed_at timestamptz,
  add column if not exists rejected_reason text;

create index if not exists ethernia_coop_actions_pending_idx
  on public.ethernia_coop_actions(session_id, processed_at, created_at asc);

drop policy if exists "ethernia coop actions update" on public.ethernia_coop_actions;
create policy "ethernia coop actions update"
  on public.ethernia_coop_actions for update
  using (true)
  with check (true);
