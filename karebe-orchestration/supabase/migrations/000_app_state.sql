-- ============================================================
-- 000_app_state.sql — Legacy blob sync table
-- Run this FIRST, before 001_schema.sql
-- This is what the existing app.js uses for its saveState() sync
-- ============================================================

create table if not exists app_state (
  id         text        primary key,
  state      jsonb       not null default '{}',
  updated_at timestamptz not null default now()
);

-- Allow anon key to read/write (app uses anon key for this table)
alter table app_state enable row level security;

-- Public read/write on the single shared state row
-- (This is the legacy approach — all state in one row keyed by 'karebe_mvp_state')
create policy "app_state_public_rw" on app_state
  for all using (true) with check (true);

-- Enable realtime on app_state so changes broadcast to browser
alter publication supabase_realtime add table app_state;
