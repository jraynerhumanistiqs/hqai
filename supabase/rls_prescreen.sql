-- ── HQ Recruit: Prescreen RLS Policies ───────────────────────────────────────
-- Run in Supabase → SQL Editor → New query
-- These tables were created in supabase_migration.sql — apply RLS on top.

-- ── PRESCREEN_SESSIONS ────────────────────────────────────────────────────────

alter table prescreen_sessions enable row level security;

-- Staff can see sessions created by anyone in their business
create policy "Business sees own sessions" on prescreen_sessions
  for select
  using (
    created_by in (
      select id from profiles
      where business_id = (select business_id from profiles where id = auth.uid())
    )
  );

-- Staff can create sessions (must be authenticated)
create policy "Auth users create sessions" on prescreen_sessions
  for insert
  with check (auth.uid() is not null);

-- Staff can update sessions in their business
create policy "Business updates own sessions" on prescreen_sessions
  for update
  using (
    created_by in (
      select id from profiles
      where business_id = (select business_id from profiles where id = auth.uid())
    )
  );

-- Public (candidates, client review links) can read active sessions by ID.
-- This is handled via the service-role admin client in the API route
-- (api/prescreen/sessions/[id]/route.ts) which bypasses RLS intentionally,
-- so no anon SELECT policy is needed here.

-- ── CANDIDATE_RESPONSES ───────────────────────────────────────────────────────

alter table candidate_responses enable row level security;

-- Candidates insert their own responses (public, unauthenticated).
-- This is handled via service-role admin client in the API route, so anon
-- INSERT is not required — the admin client bypasses RLS.

-- Staff can read responses for their business's sessions
create policy "Business reads own responses" on candidate_responses
  for select
  using (
    session_id in (
      select id from prescreen_sessions
      where created_by in (
        select id from profiles
        where business_id = (select business_id from profiles where id = auth.uid())
      )
    )
  );

-- Staff can update (rate, share) responses for their business
create policy "Business updates own responses" on candidate_responses
  for update
  using (
    session_id in (
      select id from prescreen_sessions
      where created_by in (
        select id from profiles
        where business_id = (select business_id from profiles where id = auth.uid())
      )
    )
  );
