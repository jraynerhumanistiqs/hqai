-- ============================================================================
-- HQ.ai Phase 4 - Candidate Outcome Automation + Calendly Integration
-- ----------------------------------------------------------------------------
-- APPLY MANUALLY: Open Supabase Dashboard -> SQL Editor -> New Query.
-- Paste this entire file and run. Idempotent: safe to re-run.
-- Adds:
--   * Outcome-email config on prescreen_sessions
--   * prescreen_outcome_events audit + queue table
--   * businesses.calendly_url (workspace-wide default)
--   * prescreen_interview_bookings (Calendly webhook landing)
-- ============================================================================

-- 1. Per-session outcome-email configuration ---------------------------------
ALTER TABLE public.prescreen_sessions
  ADD COLUMN IF NOT EXISTS auto_send_outcomes BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS outcome_email_shortlisted TEXT NULL,
  ADD COLUMN IF NOT EXISTS outcome_email_rejected TEXT NULL,
  ADD COLUMN IF NOT EXISTS calendly_url_override TEXT NULL;

-- 2. Outcome event log -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.prescreen_outcome_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  response_id UUID NOT NULL REFERENCES public.prescreen_responses(id) ON DELETE CASCADE,
  outcome TEXT NOT NULL CHECK (outcome IN ('shortlisted','rejected')),
  email_sent BOOLEAN DEFAULT false,
  email_to TEXT NULL,
  email_subject TEXT NULL,
  email_body TEXT NULL,
  triggered_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_outcome_response
  ON public.prescreen_outcome_events(response_id);

-- 3. Business-wide Calendly URL ---------------------------------------------
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS calendly_url TEXT NULL;

-- 4. Calendly interview bookings --------------------------------------------
CREATE TABLE IF NOT EXISTS public.prescreen_interview_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  response_id UUID NOT NULL REFERENCES public.prescreen_responses(id) ON DELETE CASCADE,
  invitee_email TEXT NOT NULL,
  event_start TIMESTAMPTZ NOT NULL,
  event_end TIMESTAMPTZ NOT NULL,
  calendly_event_uri TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_booking_response
  ON public.prescreen_interview_bookings(response_id);
