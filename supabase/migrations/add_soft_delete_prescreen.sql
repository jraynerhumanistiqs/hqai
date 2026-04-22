-- Add soft-delete support to prescreen_sessions with 80-day retention
alter table prescreen_sessions
  add column if not exists deleted_at timestamptz;

create index if not exists idx_prescreen_sessions_deleted_at
  on prescreen_sessions (deleted_at);

-- Optional: helper view for active sessions
create or replace view active_prescreen_sessions as
  select * from prescreen_sessions where deleted_at is null;
