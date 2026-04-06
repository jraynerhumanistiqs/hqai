-- HQ.ai Database Schema
-- Run this entire file in Supabase → SQL Editor → New query

-- ── BUSINESSES ────────────────────────────────────────────────
create table if not exists businesses (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  name text not null,
  industry text,
  state text,
  award text,
  headcount text,
  employment_types text,
  plan text default 'growth',
  stripe_customer_id text,
  stripe_subscription_id text,
  subscription_status text default 'trialing',
  advisor_name text default 'Sarah',
  advisor_email text,
  calendly_link text
);

-- ── PROFILES ──────────────────────────────────────────────────
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  business_id uuid references businesses(id),
  full_name text,
  email text,
  role text default 'owner'
);

-- ── CONVERSATIONS ─────────────────────────────────────────────
create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  business_id uuid references businesses(id),
  user_id uuid references profiles(id),
  title text,
  module text default 'people',
  escalated boolean default false,
  escalation_summary text
);

-- ── MESSAGES ──────────────────────────────────────────────────
create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  conversation_id uuid references conversations(id) on delete cascade,
  role text not null,
  content text not null,
  has_document boolean default false,
  has_escalation boolean default false
);

-- ── DOCUMENTS ─────────────────────────────────────────────────
create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  business_id uuid references businesses(id),
  user_id uuid references profiles(id),
  conversation_id uuid references conversations(id),
  title text not null,
  type text,
  content text not null,
  status text default 'draft'
);

-- ── ROW LEVEL SECURITY ────────────────────────────────────────
alter table businesses enable row level security;
alter table profiles enable row level security;
alter table conversations enable row level security;
alter table messages enable row level security;
alter table documents enable row level security;

-- Businesses
create policy "Users see own business" on businesses for all
  using (id = (select business_id from profiles where id = auth.uid()));

-- Profiles
create policy "Users manage own profile" on profiles for all
  using (id = auth.uid());

create policy "Users see teammate profiles" on profiles for select
  using (business_id = (select business_id from profiles where id = auth.uid()));

-- Conversations
create policy "Business sees own conversations" on conversations for all
  using (business_id = (select business_id from profiles where id = auth.uid()));

-- Messages
create policy "Business sees own messages" on messages for all
  using (
    conversation_id in (
      select id from conversations
      where business_id = (select business_id from profiles where id = auth.uid())
    )
  );

-- Documents
create policy "Business sees own documents" on documents for all
  using (business_id = (select business_id from profiles where id = auth.uid()));

-- ── AUTO-CREATE PROFILE ON SIGNUP ─────────────────────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
