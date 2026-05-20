-- ============================================================================
-- HQ.ai - RLS policies for prescreen_transcripts + prescreen_share_views
-- ----------------------------------------------------------------------------
-- WHAT THIS DOES
--   Adds tenant-scoped SELECT policies to two tables that currently have
--   RLS enabled but no policies declared. Without policies, the tables
--   behave as deny-everyone for any RLS-respecting caller (anon /
--   authenticated). Service-role callers bypass RLS entirely so the
--   tables work today, but the Supabase Database Advisor flags this as
--   INFO lint 0008 (RLS Enabled No Policy) because the configuration is
--   almost certainly a misconfiguration.
--
--   We declare explicit SELECT policies that join through the
--   prescreen_responses + prescreen_sessions chain to the calling
--   business's `business_id`. Writes stay service-role-only (matching
--   the rest of the prescreen tables: anonymous candidates submit via
--   the admin client; recruiters never write directly).
--
-- WHY NOW
--   See https://supabase.com/docs/guides/database/database-advisors -
--   specifically lint 0008 (rls_enabled_no_policy). INFO-level lint -
--   safe to defer, but cheap to address while we're already cleaning up
--   the security advisor backlog.
--
-- HOW TO APPLY
--   Open Supabase Dashboard -> SQL Editor -> New Query, paste this file,
--   run. Idempotent and safe to re-run.
--
-- HOW TO ROLL BACK
--   drop policy if exists "prescreen_transcripts_business_select"
--     on public.prescreen_transcripts;
--   drop policy if exists "prescreen_share_views_business_select"
--     on public.prescreen_share_views;
-- ============================================================================

-- ──────────────────────────────────────────────────────────────────
-- 1. prescreen_transcripts
-- ──────────────────────────────────────────────────────────────────
-- Schema: id, response_id (FK -> prescreen_responses), provider, raw,
-- text, utterances, created_at. No direct business_id column - the
-- tenant boundary is reached through the response_id -> session_id
-- chain.
--
-- SELECT: a transcript belongs to the calling business if the parent
-- prescreen_session's business_id matches public.current_business_id().
--
-- INSERT/UPDATE/DELETE: service-role only. The transcribe / score /
-- rescore routes all use supabaseAdmin which bypasses RLS, and no
-- recruiter-facing path writes to this table directly.

do $$
begin
  if exists (select 1 from pg_tables
             where schemaname = 'public' and tablename = 'prescreen_transcripts') then
    execute 'alter table public.prescreen_transcripts enable row level security';

    drop policy if exists "prescreen_transcripts_business_select" on public.prescreen_transcripts;
    execute $POLICY$
      create policy "prescreen_transcripts_business_select" on public.prescreen_transcripts
        for select to authenticated
        using (
          response_id in (
            select pr.id
            from public.prescreen_responses pr
            join public.prescreen_sessions  ps on ps.id = pr.session_id
            where ps.business_id = public.current_business_id()
          )
        )
    $POLICY$;
  end if;
end$$;

-- ──────────────────────────────────────────────────────────────────
-- 2. prescreen_share_views
-- ──────────────────────────────────────────────────────────────────
-- Schema: id, link_id (FK -> prescreen_share_links), viewed_at, ip,
-- user_agent. Tracking table for share-link analytics (records every
-- view of a recruiter-issued candidate share link).
--
-- Tenant boundary: link_id -> prescreen_share_links.response_id ->
-- prescreen_responses.session_id -> prescreen_sessions.business_id.
--
-- SELECT: only the business that owns the parent share link can see
-- its view-tracking rows. Lets recruiters audit how often their share
-- links are opened without exposing IPs / user_agents across tenants.
--
-- INSERT/UPDATE/DELETE: service-role only. The /api/review/[token]
-- route writes a row each time an anonymous reviewer opens a share
-- link, but that write happens via supabaseAdmin from a server route -
-- never via the anon key.

do $$
begin
  if exists (select 1 from pg_tables
             where schemaname = 'public' and tablename = 'prescreen_share_views') then
    execute 'alter table public.prescreen_share_views enable row level security';

    drop policy if exists "prescreen_share_views_business_select" on public.prescreen_share_views;
    execute $POLICY$
      create policy "prescreen_share_views_business_select" on public.prescreen_share_views
        for select to authenticated
        using (
          link_id in (
            select psl.id
            from public.prescreen_share_links psl
            join public.prescreen_responses   pr  on pr.id = psl.response_id
            join public.prescreen_sessions    ps  on ps.id = pr.session_id
            where ps.business_id = public.current_business_id()
          )
        )
    $POLICY$;
  end if;
end$$;
