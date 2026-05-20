-- Marketplace pre-launch reservation list.
-- Captures emails from the landing-page "Reserve your spot" CTA so we
-- can email them when the pay-as-you-go marketplace ships.
-- RLS is enabled; only service-role (via the API route) inserts.

create table if not exists public.marketplace_reservations (
  id          uuid primary key default gen_random_uuid(),
  email       text not null,
  created_at  timestamptz not null default now(),
  source      text default 'landing'
);

create index if not exists marketplace_reservations_email_idx
  on public.marketplace_reservations (email);

alter table public.marketplace_reservations enable row level security;

-- No public/anon read or write. The /api/marketplace/reserve route
-- uses the service-role client which bypasses RLS for the insert.
-- (No policies created intentionally - default-deny on RLS.)
