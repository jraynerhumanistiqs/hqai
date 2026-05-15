-- Persist the exact consent text + version + timestamp + IP that a
-- candidate saw and accepted when they started the pre-screen flow.
-- This gives us an evidentiary record for the APP / Privacy Act
-- "demonstrable consent" obligation, separate from the existing boolean
-- `consent` column.
--
-- The route.ts is tolerant - if this migration has not been applied yet
-- the insert path falls back to the legacy column set. After applying
-- this migration, all NEW submissions will record the full consent
-- metadata. Older rows pre-dating this migration will have NULLs in
-- the new columns (correctly indicating we have only the boolean).

alter table public.prescreen_responses
  add column if not exists consent_text text,
  add column if not exists consent_version text,
  add column if not exists consent_at timestamptz,
  add column if not exists consent_ip text,
  add column if not exists consent_user_agent text;

create index if not exists prescreen_responses_consent_version_idx
  on public.prescreen_responses(consent_version)
  where consent_version is not null;
