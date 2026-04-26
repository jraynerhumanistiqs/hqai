-- Add country column to businesses for international onboarding.
-- Idempotent — safe to re-run.

alter table public.businesses
  add column if not exists country text default 'Australia';

-- Backfill existing rows (no-op if column was just created with default).
update public.businesses set country = 'Australia' where country is null;
