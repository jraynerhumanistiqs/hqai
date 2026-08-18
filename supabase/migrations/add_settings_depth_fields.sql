-- Settings depth fields (Aug 2026).
--
-- Adds the employer legal/contact details that the Settings page now
-- collects. The business fields in particular feed generated employment
-- documents (contracts, letters, offers), which need the legal employer
-- name, ABN and address - so richer business settings directly improve
-- document quality.
--
-- Additive, nullable, idempotent - safe to run and re-run. The Settings save
-- is self-healing (it retries without these columns on error), so applying
-- this migration simply lights the new fields up; nothing breaks before it.

-- businesses: employer legal + contact details
alter table businesses add column if not exists legal_name text;   -- registered entity name (vs trading name in `name`)
alter table businesses add column if not exists abn text;          -- Australian Business Number
alter table businesses add column if not exists address text;      -- business address (letterhead / employer address on documents)
alter table businesses add column if not exists website text;
alter table businesses add column if not exists phone text;

-- profiles: personal depth
alter table profiles add column if not exists job_title text;
