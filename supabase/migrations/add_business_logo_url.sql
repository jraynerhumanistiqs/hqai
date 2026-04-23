-- ============================================================================
-- Add logo_url column to businesses
-- ----------------------------------------------------------------------------
-- The settings page + upload-logo route write to businesses.logo_url, but the
-- column was never added to production. Upload fails with:
--   "Could not find the 'logo_url' column of 'businesses' in the schema cache"
--
-- Apply: Supabase Dashboard -> SQL Editor -> paste + run. Idempotent.
-- ============================================================================

alter table public.businesses
  add column if not exists logo_url text;
