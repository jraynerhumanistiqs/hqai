-- Privacy request log - APP 12/13 audit trail. Every data-subject
-- request (access, correction, erasure, consent withdrawal) lands here
-- with a reference number and timestamps so we can prove we responded
-- within 30 days.

create table if not exists public.privacy_requests (
  id uuid primary key default gen_random_uuid(),
  reference text unique not null,
  request_type text not null check (request_type in ('access','correction','erasure','withdraw_consent','other')),
  requester_name text not null,
  requester_email text not null,
  detail text,
  client_ip text,
  user_agent text,
  status text not null default 'received' check (status in ('received','verifying_identity','acknowledged','fulfilled','rejected')),
  staff_notes text,
  fulfilled_at timestamptz,
  fulfilled_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists privacy_requests_status_idx
  on public.privacy_requests(status, created_at desc);
create index if not exists privacy_requests_email_idx
  on public.privacy_requests(requester_email);
