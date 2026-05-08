-- Phase 1 dress rehearsal RLS for every business-scoped table.
-- Apply on STAGING first per docs/PHASE-1-ENTRY-WORK.md Group D.
-- Production application is the Phase 2 entry gate (D8 in the decision log).
--
-- Pattern: every business-scoped row is readable/writable by users whose
-- profile maps to the same business_id. Service-role API routes bypass
-- RLS as before. The handle_new_user trigger and the public/candidate
-- entry points (prescreen public flow) are NOT touched here - they use
-- the supabaseAdmin client and that bypasses RLS by design.

-- ── 1. Enable RLS on all sensitive tables ─────────────────────────────
alter table if exists public.cv_screenings enable row level security;
alter table if exists public.cv_custom_rubrics enable row level security;
alter table if exists public.documents enable row level security;
alter table if exists public.conversations enable row level security;
alter table if exists public.messages enable row level security;
alter table if exists public.chat_audit_log enable row level security;
alter table if exists public.chat_telemetry enable row level security;
alter table if exists public.coach_field_edits enable row level security;
alter table if exists public.cv_screening_outputs enable row level security;
alter table if exists public.campaigns enable row level security;
alter table if exists public.prescreen_evaluations enable row level security;
alter table if exists public.prescreen_notes enable row level security;
alter table if exists public.prescreen_share_links enable row level security;
alter table if exists public.prescreen_outcome_events enable row level security;
alter table if exists public.prescreen_interview_bookings enable row level security;

-- ── 2. Helper: which business does the signed-in user belong to ───────
create or replace function public.current_business_id()
returns uuid
language sql stable security definer set search_path = public as $$
  select business_id from public.profiles where id = auth.uid()
$$;

-- ── 3. Standard policy template ───────────────────────────────────────
-- For every table below, two policies:
--   business_select  - SELECT where business_id matches signed-in user's
--   business_write   - INSERT / UPDATE / DELETE for owner role only;
--                      test_admin sees but cannot mutate.

-- 3a. cv_screenings
drop policy if exists "cv_screenings_business_select" on public.cv_screenings;
create policy "cv_screenings_business_select" on public.cv_screenings
  for select using (business_id = public.current_business_id());
drop policy if exists "cv_screenings_business_write" on public.cv_screenings;
create policy "cv_screenings_business_write" on public.cv_screenings
  for all using (
    business_id = public.current_business_id()
    and (select role from public.profiles where id = auth.uid()) = 'owner'
  )
  with check (
    business_id = public.current_business_id()
    and (select role from public.profiles where id = auth.uid()) = 'owner'
  );

-- 3b. cv_custom_rubrics
drop policy if exists "cv_custom_rubrics_business_select" on public.cv_custom_rubrics;
create policy "cv_custom_rubrics_business_select" on public.cv_custom_rubrics
  for select using (business_id = public.current_business_id());
drop policy if exists "cv_custom_rubrics_business_write" on public.cv_custom_rubrics;
create policy "cv_custom_rubrics_business_write" on public.cv_custom_rubrics
  for all using (
    business_id = public.current_business_id()
    and (select role from public.profiles where id = auth.uid()) = 'owner'
  )
  with check (
    business_id = public.current_business_id()
    and (select role from public.profiles where id = auth.uid()) = 'owner'
  );

-- 3c. documents
drop policy if exists "documents_business_select" on public.documents;
create policy "documents_business_select" on public.documents
  for select using (business_id = public.current_business_id());
drop policy if exists "documents_business_write" on public.documents;
create policy "documents_business_write" on public.documents
  for all using (
    business_id = public.current_business_id()
    and (select role from public.profiles where id = auth.uid()) = 'owner'
  )
  with check (
    business_id = public.current_business_id()
    and (select role from public.profiles where id = auth.uid()) = 'owner'
  );

-- 3d. conversations
drop policy if exists "conversations_business_select" on public.conversations;
create policy "conversations_business_select" on public.conversations
  for select using (business_id = public.current_business_id());
drop policy if exists "conversations_business_write" on public.conversations;
create policy "conversations_business_write" on public.conversations
  for all using (business_id = public.current_business_id())
  with check (business_id = public.current_business_id());

-- 3e. messages (gated through conversation -> business_id)
drop policy if exists "messages_business_select" on public.messages;
create policy "messages_business_select" on public.messages
  for select using (
    conversation_id in (
      select id from public.conversations
      where business_id = public.current_business_id()
    )
  );
drop policy if exists "messages_business_write" on public.messages;
create policy "messages_business_write" on public.messages
  for all using (
    conversation_id in (
      select id from public.conversations
      where business_id = public.current_business_id()
    )
  )
  with check (
    conversation_id in (
      select id from public.conversations
      where business_id = public.current_business_id()
    )
  );

-- 3f. chat_audit_log (read-only to users; service role writes)
drop policy if exists "chat_audit_log_business_select" on public.chat_audit_log;
create policy "chat_audit_log_business_select" on public.chat_audit_log
  for select using (business_id = public.current_business_id());

-- 3g. chat_telemetry (read-only to users; service role writes)
drop policy if exists "chat_telemetry_business_select" on public.chat_telemetry;
create policy "chat_telemetry_business_select" on public.chat_telemetry
  for select using (business_id = public.current_business_id());

-- 3h. coach_field_edits (read-only to users; service role writes)
drop policy if exists "coach_field_edits_business_select" on public.coach_field_edits;
create policy "coach_field_edits_business_select" on public.coach_field_edits
  for select using (business_id = public.current_business_id());

-- 3i. cv_screening_outputs (read-only to users; service role writes)
drop policy if exists "cv_screening_outputs_business_select" on public.cv_screening_outputs;
create policy "cv_screening_outputs_business_select" on public.cv_screening_outputs
  for select using (business_id = public.current_business_id());

-- 3j. campaigns
drop policy if exists "campaigns_business_select" on public.campaigns;
create policy "campaigns_business_select" on public.campaigns
  for select using (business_id = public.current_business_id());
drop policy if exists "campaigns_business_write" on public.campaigns;
create policy "campaigns_business_write" on public.campaigns
  for all using (
    business_id = public.current_business_id()
    and (select role from public.profiles where id = auth.uid()) = 'owner'
  )
  with check (
    business_id = public.current_business_id()
    and (select role from public.profiles where id = auth.uid()) = 'owner'
  );

-- prescreen_sessions does NOT have a business_id column - it resolves
-- business via created_by -> profiles.business_id (per supabase/rls_prescreen.sql).
-- All prescreen-derived policies use the same chain.

-- 3k. prescreen_evaluations - resolves business via response -> session -> created_by
drop policy if exists "prescreen_evaluations_business_select" on public.prescreen_evaluations;
create policy "prescreen_evaluations_business_select" on public.prescreen_evaluations
  for select using (
    response_id in (
      select cr.id from public.candidate_responses cr
      join public.prescreen_sessions ps on ps.id = cr.session_id
      where ps.created_by in (
        select id from public.profiles
        where business_id = public.current_business_id()
      )
    )
  );

-- 3l. prescreen_notes / share_links / outcome_events / interview_bookings
-- All resolve to business via response -> session -> created_by -> profiles.business_id.
drop policy if exists "prescreen_notes_business_select" on public.prescreen_notes;
create policy "prescreen_notes_business_select" on public.prescreen_notes
  for select using (
    response_id in (
      select cr.id from public.candidate_responses cr
      join public.prescreen_sessions ps on ps.id = cr.session_id
      where ps.created_by in (
        select id from public.profiles
        where business_id = public.current_business_id()
      )
    )
  );

drop policy if exists "prescreen_share_links_business_select" on public.prescreen_share_links;
create policy "prescreen_share_links_business_select" on public.prescreen_share_links
  for select using (
    response_id in (
      select cr.id from public.candidate_responses cr
      join public.prescreen_sessions ps on ps.id = cr.session_id
      where ps.created_by in (
        select id from public.profiles
        where business_id = public.current_business_id()
      )
    )
  );

drop policy if exists "prescreen_outcome_events_business_select" on public.prescreen_outcome_events;
create policy "prescreen_outcome_events_business_select" on public.prescreen_outcome_events
  for select using (
    response_id in (
      select cr.id from public.candidate_responses cr
      join public.prescreen_sessions ps on ps.id = cr.session_id
      where ps.created_by in (
        select id from public.profiles
        where business_id = public.current_business_id()
      )
    )
  );

drop policy if exists "prescreen_interview_bookings_business_select" on public.prescreen_interview_bookings;
create policy "prescreen_interview_bookings_business_select" on public.prescreen_interview_bookings
  for select using (
    response_id in (
      select cr.id from public.candidate_responses cr
      join public.prescreen_sessions ps on ps.id = cr.session_id
      where ps.created_by in (
        select id from public.profiles
        where business_id = public.current_business_id()
      )
    )
  );

-- ── 4. Smoke test (run as a non-admin auth user) ──────────────────────
-- After applying, sign in as a non-admin user and run these in SQL Editor
-- with your role context. All queries should return 0 rows for any
-- business_id that is not yours.
--
--   select count(*) from cv_screenings;            -- only your business
--   select count(*) from cv_screenings where business_id <> public.current_business_id(); -- 0
--   select count(*) from messages;                 -- only your conversations
--   select count(*) from chat_audit_log where business_id <> public.current_business_id(); -- 0
--
-- If any of the cross-business probes return > 0, halt and review the
-- offending policy before flipping production.
