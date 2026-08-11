-- AI Advisor per-message feedback (thumbs up / down).
--
-- Captures the lightweight helpful / not-helpful signal from the chat
-- Actions row so it can feed the same quality/eval loop as chat_audit_log
-- and chat_telemetry. Additive and nullable throughout: the /api/chat/feedback
-- route is best-effort and soft-warns if this migration has not been applied,
-- so shipping the UI ahead of the migration never breaks the chat surface.
--
-- This is a telemetry sink only. It is NEVER read by any live response path.

create table if not exists public.chat_feedback (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  user_id         uuid,
  business_id     uuid,
  conversation_id uuid,
  module          text,
  rating          text check (rating in ('up', 'down')),
  tier            text,
  user_message    text,
  assistant_text  text
);

-- Lookup by conversation when reviewing a thread's feedback.
create index if not exists chat_feedback_conversation_idx
  on public.chat_feedback (conversation_id);

-- Time-ordered scan for the eval loop.
create index if not exists chat_feedback_created_idx
  on public.chat_feedback (created_at desc);
