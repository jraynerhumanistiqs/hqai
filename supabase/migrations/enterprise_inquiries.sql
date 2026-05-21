-- Enterprise tier inquiry capture.
--
-- Backs the discovery-call form on /enterprise. Every Enterprise sale
-- starts here: the form posts to /api/enterprise-inquiry, which writes
-- a row via supabaseAdmin and emails the founder for triage.
--
-- The table is founder-only intel. There are NO RLS policies granting
-- anon, authenticated, or any other role access. supabaseAdmin
-- (service-role) bypasses RLS for the insert; the founder reads via
-- the Supabase dashboard or a future authenticated-admin view.
--
-- Source of truth for shape: docs/research/enterprise-tier-strategy.md §5.1.

create table if not exists public.enterprise_inquiries (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  full_name text not null,
  work_email text not null,
  business_name text not null,
  staff_headcount text not null,           -- free text bucket: "30-50", "50-150", "150+"
  variant_interest text not null,          -- 'people' | 'recruit' | 'full' | 'unsure'
  current_spend text,                      -- free text
  urgency text not null,                   -- 'this-month' | 'next-month' | 'this-quarter' | 'exploring'
  notes text,                              -- free text from customer
  status text not null default 'new',      -- 'new' | 'qualified' | 'declined' | 'converted'
  founder_notes text,                      -- founder fills post-discovery call
  inquirer_ip text,
  inquirer_user_agent text
);

-- Service-role only writes; no anon access at all. The form posts to a
-- server route that uses supabaseAdmin. No RLS policies grant authenticated
-- access either - inquiries are founder-only intel.
alter table public.enterprise_inquiries enable row level security;
-- Deliberately no policies. supabaseAdmin bypasses RLS.

create index if not exists enterprise_inquiries_created_at_idx
  on public.enterprise_inquiries (created_at desc);
create index if not exists enterprise_inquiries_status_idx
  on public.enterprise_inquiries (status);
