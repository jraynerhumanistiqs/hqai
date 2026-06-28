-- Campaign Coach recruitment Tip Bot.
--
-- Source of truth: docs/research/recruitment-research/recruitment-tips.json
-- (150 curated tips). This table mirrors the JSON shape; re-ingest after any
-- change to the JSON via POST /api/campaign/tips/ingest (idempotent upsert).
-- RLS is disabled in beta; the read API uses the service-role client.

create table if not exists recruitment_tips (
  id             text primary key,
  category       text,
  campaign_stage text not null,   -- brief | role_profile | draft | distribution | launch
  tip            text not null,
  why_it_works   text,
  region         text,            -- lineage only; not used for routing/display
  confidence     text,            -- high | medium
  legislative    boolean default false,  -- tied to an Australian legal requirement
  evidence       text,
  source         text,
  source_url     text,
  source_date    text,
  updated_at     timestamptz not null default now()
);

-- For tables created before the legislative flag existed.
alter table recruitment_tips add column if not exists legislative boolean default false;

create index if not exists idx_recruitment_tips_stage
  on recruitment_tips (campaign_stage);
create index if not exists idx_recruitment_tips_stage_region_conf
  on recruitment_tips (campaign_stage, region, confidence);

-- Engagement telemetry sink for the Tip Bot. Events:
-- tip_viewed / tip_cycled / tip_dismissed / tip_source_clicked.
-- Writes are fire-and-forget; failures are swallowed by the API route.
create table if not exists tip_events (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid,
  user_id     uuid,
  event       text not null,
  tip_id      text,
  stage       text,
  region      text,
  category    text,
  created_at  timestamptz not null default now()
);

create index if not exists idx_tip_events_event   on tip_events (event);
create index if not exists idx_tip_events_created  on tip_events (created_at);
