-- HQ Performance (PPAD) entitlement flag.
--
-- PPAD is a paid add-on, not part of any current plan, so access is granted
-- per business rather than derived from `plan` or `subscription_status`. The
-- HQ Tools tab is visible to everyone (owner's call - it doubles as the upsell
-- surface) but the tool itself only loads when this is true.
--
-- Additive and nullable-safe: defaults to false, so every existing business is
-- unchanged and no code path has to handle a missing column. Safe to re-run.
--
-- Granting is deliberately a manual step for now. First-run setup of an org
-- (people directory, first admin, allocations) is done by HQ.ai, so flipping
-- this is part of that same onboarding conversation.

alter table businesses
  add column if not exists ppad_enabled boolean not null default false;

comment on column businesses.ppad_enabled is
  'HQ Performance add-on. False = HQ Tools tab shows the upsell instead of the tool.';
