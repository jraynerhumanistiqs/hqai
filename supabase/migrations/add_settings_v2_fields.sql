-- Settings v2 fields (Aug 2026).
--
-- Multi-state operation, structured Modern Awards, and AI Advisor
-- customisation. Additive, nullable, idempotent - safe to run and re-run.
-- The Settings save is self-healing (retries without these on error), so
-- applying this simply lights the new fields up; nothing breaks before it.

alter table businesses add column if not exists operating_states text;        -- comma-joined states the business operates in (state = HQ)
alter table businesses add column if not exists awards jsonb;                  -- [{ name, tier: 'primary'|'secondary', roles }]
alter table businesses add column if not exists advisor_tone text;            -- Formal | Balanced | Friendly
alter table businesses add column if not exists advisor_detail text;          -- Concise | Standard | Detailed
alter table businesses add column if not exists advisor_instructions text;    -- free-text custom instructions for the AI advisor
