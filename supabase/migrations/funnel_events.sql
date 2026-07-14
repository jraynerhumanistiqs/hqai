-- funnel_events - self-serve sales funnel telemetry (July 2026).
--
-- One row per funnel event (pricing_viewed, plan_selected,
-- signup_completed, onboarding_completed, checkout_started,
-- checkout_completed, ...). Written exclusively by the service-role
-- client via POST /api/telemetry/funnel (and the Stripe webhook for
-- checkout_completed); the app soft-fails if this table is missing, so
-- the migration is additive and safe to apply any time.
--
-- anon_id stitches anonymous pre-signup events to the same browser;
-- user_id is filled once a session exists. The allowed event names live
-- in lib/funnel-events.ts.

create table if not exists funnel_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  event text not null,
  anon_id text,
  user_id uuid,
  plan text,
  cycle text,
  step int,
  source text,
  props jsonb default '{}'::jsonb
);

-- The funnel read is always "events of type X over time".
create index if not exists funnel_events_event_created_idx
  on funnel_events (event, created_at desc);

-- Stitching a single visitor's journey.
create index if not exists funnel_events_anon_idx
  on funnel_events (anon_id)
  where anon_id is not null;
