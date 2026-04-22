-- Adds an optional custom URL slug to prescreen_sessions so clients can share
-- friendly candidate invite links like /prescreen/acme-finance-mgr-2026
-- instead of raw UUIDs. The existing /prescreen/[uuid] routes still work
-- because the page/API falls back to lookup by id when no slug matches.
--
-- IMPORTANT: Apply this migration manually via the Supabase SQL editor.
-- It is NOT run automatically.

ALTER TABLE prescreen_sessions ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;
