# HQ.ai Developer Handoff

For a developer reviewing the project before a meeting with the founder. Read top-to-bottom in 15-20 minutes.

---

## Repository

- **GitHub:** https://github.com/jraynerhumanistiqs/hqai (private - request collaborator access)
- **Branch to read:** `main` - everything ships from here
- **Vercel auto-deploys** on every push to main

## Live deployment

- **URL:** https://hqai.vercel.app
- **Hosting:** Vercel Pro
- **Database:** Supabase (`https://rbuxsuuvbeojxcxwxcjf.supabase.co`)

## Read-first files (in this order)

1. `CLAUDE.md` - project overview, tech stack, design system tokens, brand voice, current build status, known issues. The single most useful file to start with.
2. `docs/HANDOFF-2026-04-30.md` - recent project state snapshot
3. `docs/CHAT-ARCHITECTURE-V2.md` + `docs/CHAT-V2-IMPLEMENTATION.md` - strategic spec for the AI advisor and demo-day chat work
4. `docs/CV-SCREENING-RESEARCH.md` - full v1 spec for the new CV Screening module with 22 cited sources
5. `docs/CAMPAIGN-COACH-RESEARCH.md` - research that drove the Campaign Coach wizard
6. `docs/RAG-HANDOFF.md` - original RAG corpus design and ingestion approach

## Code orientation

| Concern | File / folder |
|---|---|
| HQ People streaming chat (tool-use loop, heartbeat, timeouts, triage short-circuit) | `app/api/chat/route.ts` |
| Chat frontend (SSE consumer, escalation card, graceful timeout) | `components/chat/ChatInterface.tsx` |
| All system prompts, escalation detection, hard-triage regex, document templates | `lib/prompts.ts` |
| Citation fence stripper + inline marker stripper | `lib/parse-citations.ts` |
| pgvector + BM25 hybrid retrieval | `lib/rag.ts` |
| CV Screening types and standard rubric library | `lib/cv-screening-types.ts`, `lib/cv-screening-rubrics.ts` |
| CV Screening API routes (score, handoff, rubrics CRUD, suggest-rubric) | `app/api/cv-screening/` |
| CV Screening UI (client, scorecard panel, new-rubric modal) | `components/recruit/cv-screening/` |
| Campaign Coach streaming wizard backend | `app/api/campaign/draft/route.ts` |
| Campaign Coach wizard UI (5 steps) | `components/recruit/campaign-coach/` |
| Video pre-screen public flow | `app/prescreen/[id]/page.tsx`, `components/prescreen/*` |
| Cloudflare Stream + Deepgram pipeline | `app/api/prescreen/videos/*`, `app/api/prescreen/responses/*` |
| Document generation (DOCX) | `app/api/documents/contract/route.ts`, `app/api/documents/download/route.ts`, `app/api/documents/generate/route.ts` |
| Schema and migrations | `supabase/schema.sql`, `supabase/migrations/*` |

## Tech stack at a glance

- **Frontend / framework:** Next.js 16 App Router, TypeScript, Tailwind CSS v3 with custom design tokens
- **AI:** Anthropic Claude `claude-sonnet-4-20250514` with streaming + structured-output tool-use
- **Database:** Supabase (Postgres + pgvector for the RAG corpus, RLS disabled for beta)
- **Video:** Cloudflare Stream for upload and playback
- **Transcription:** Deepgram Nova-3
- **Email:** Resend
- **Payments:** Stripe portal wired, checkout flow incomplete
- **Hosting:** Vercel Pro

## Current product surface

| Module | Status |
|---|---|
| **HQ People** - RAG-grounded HR advisor chat (Australian employment law) | Working, citations + triage card, ~20-30s simple queries |
| **HQ Recruit / Campaign Coach** - 5-step coached wizard producing job ad + careers microsite | Working |
| **HQ Recruit / CV Screening** - upload CVs, blind-by-default scoring against rubric, scorecard with evidence quotes, video pre-screen handoff | Working (V2 just shipped) |
| **HQ Recruit / Video Pre-screen** - candidate records short answers, AI transcription + per-dimension scoring, share with team | Working |
| **Document generation** - 33 HR templates with DOCX export | Working |
| **Strategy Coach** | Placeholder (ComingSoon) |
| **Compliance Audit** | Mid-migration from a separate Supabase project |
| **Awards Interpreter** | Placeholder |
| **Stripe subscription checkout** | Portal wired, checkout incomplete |
| **Calendly booking embed** | Placeholder |

## Architectural conventions worth knowing

- **Anti-Employsure positioning.** AI handles tier-one self-service; the same human advisor handles complexity every time. Reflected in the chat's escalation card UX and the deny-list in `lib/prompts.ts`.
- **Australian employment law only.** Jurisdiction lock baked into the master prompt - the model refuses to compare or apply UK/US/NZ law unless asked.
- **Blind-by-default in CV Screening.** Names, photos, addresses, DOB, graduation year, school name are masked from the scorer; only the recruiter sees the full name in the pipeline.
- **Structured output via forced tool-use.** Campaign Coach steps and CV Screening scoring both use Anthropic tool-use with `tool_choice: { type: 'tool', name: '...' }` to guarantee JSON shape under streaming.
- **Citation contract.** Tool-returned citations flow on a separate SSE channel and the frontend renders them in a `Sources` panel - the model is told NOT to insert inline `[n]` markers or emit a fenced citations block. `lib/parse-citations.ts` strips both as defence-in-depth.
- **Stream resilience.** Chat route wraps non-streaming Anthropic calls with `withTimeout` (60s) and `withHeartbeat` (8s SSE pulses). Streaming turn has a stall watchdog that propagates to the SDK via AbortController. Frontend has a 60s graceful-timeout button that injects an escalation card if the route never returns.
- **Pre-flight triage.** `detectHardTriage` regex catches 7 categories of high-stakes input (workplace violence, sexual harassment incident, mental health crisis, active litigation, visa, discriminatory request, imminent termination) and short-circuits to a hardcoded handoff card without any LLM call.
- **No em-dashes or en-dashes anywhere in UI copy.** Project rule. Plain hyphens only.

## Known issues / debt

- **Supabase RLS not yet enabled.** SQL written in `supabase/rls_prescreen.sql`, not applied. Required before commercial launch.
- **TypeScript errors suppressed.** `next.config.js` has `ignoreBuildErrors: true`. Most errors are pre-existing Supabase typing edges (foreign-key relationships return arrays from typed selects).
- **Chat smoke test.** `npm run smoke:chat` against the deployed route is currently 4/10 passing - triage short-circuit cases pass, LLM-path queries time out at 90s. Investigation paused for demo prep. The frontend has a 60s graceful-timeout fallback so the user-visible failure mode is the escalation card, not a hang.
- **Post-onboarding redirect** can be unreliable on Vercel - session cookie sometimes doesn't persist after signup.
- **Legacy recruit components** (`PrescreenDashboard`, `QuestionsPanel`, `ResponsesPanel`, `RoleSetupPanel`, `SessionSwitcher`, `RecruitTabs`) still live in `components/recruit/` but are no longer imported - safe to delete.

## Migrations they may need to apply

- `supabase/migrations/cv_screening.sql` - CV screenings table
- `supabase/migrations/cv_screening_custom_rubrics.sql` - custom rubrics table (added in V2)
- `supabase/migrations/audit_schema_helpers.sql` - audit project integration helpers

## Required environment variables

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
ANTHROPIC_API_KEY
CLOUDFLARE_ACCOUNT_ID
CLOUDFLARE_STREAM_API_TOKEN
RESEND_API_KEY
NEXT_PUBLIC_BASE_URL
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
EVAL_BYPASS_TOKEN     # optional - for the chat smoke test
```

## What you can do without account setup

- Read the repo and the docs above
- Browse the live site at https://hqai.vercel.app and sign up for a free trial account
- Walk through HQ People chat (try a simple wage query first, then a complaint that triggers triage)
- Walk through Campaign Coach end-to-end
- Walk through CV Screening (drag in a couple of CVs, watch them score, click into the scorecard)

## What you'll need to be productive

- GitHub repo collaborator invite
- Vercel team membership
- Supabase project access
- Anthropic API key (or your own for local dev)
- Resend API key (or your own)
- Cloudflare Stream account membership
- Local `.env.local` with the env vars above

## Local dev quickstart

```bash
git clone https://github.com/jraynerhumanistiqs/hqai
cd hqai
npm install
cp .env.local.example .env.local   # populate with the keys above
npm run dev                        # http://localhost:3000
```

There's no test runner wired up beyond the chat smoke script (`npm run smoke:chat`). Manual QA is the standard for now.
