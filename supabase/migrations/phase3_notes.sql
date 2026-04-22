-- ============================================================================
-- HQ.ai Phase 3 - @mention notes + shareable review links
-- ----------------------------------------------------------------------------
-- APPLY MANUALLY: Open Supabase Dashboard -> SQL Editor -> New Query.
-- Paste this entire file and run. Idempotent: safe to re-run.
-- Notes table references prescreen_responses (renamed from candidate_responses
-- in phase1_ai_scoring.sql).
-- ============================================================================

-- -- NOTES -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.prescreen_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  response_id UUID NOT NULL REFERENCES public.prescreen_responses(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  mentions JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  edited_at TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_prescreen_notes_response
  ON public.prescreen_notes(response_id, created_at DESC);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.prescreen_notes';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END$$;

-- -- SHARE LINKS -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.prescreen_share_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  response_id UUID NOT NULL REFERENCES public.prescreen_responses(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '14 days'),
  revoked_at TIMESTAMPTZ NULL,
  label TEXT NULL
);

CREATE INDEX IF NOT EXISTS idx_share_token
  ON public.prescreen_share_links(token);

-- -- SHARE VIEWS -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.prescreen_share_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id UUID NOT NULL REFERENCES public.prescreen_share_links(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ DEFAULT NOW(),
  ip INET NULL,
  user_agent TEXT NULL
);

CREATE INDEX IF NOT EXISTS idx_share_views_link
  ON public.prescreen_share_views(link_id, viewed_at DESC);
