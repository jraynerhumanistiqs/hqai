-- Reviewer Visual Telemetry (Tier 2) - storage column.
--
-- Stores aggregate visual diagnostics per response: in-frame %,
-- at-camera %, face brightness, and frames sampled. Per-question
-- breakdown lives under `per_question`.
--
-- Important: this column is read ONLY by the staff-side review UI.
-- It is NEVER referenced in any AI scoring pipeline (the score
-- route reads prescreen_transcripts.text only). See
-- docs/AIA-visual-telemetry.md for the formal commitment.

alter table public.prescreen_responses
  add column if not exists visual_diagnostics jsonb;

-- Optional index if we later want to filter by frames-sampled
-- (skipped for now to keep the migration light).
