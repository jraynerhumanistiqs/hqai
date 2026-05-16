# HQ.ai - Project Context for Claude Code

## What this is
HQ.ai is an AI-powered HR and recruitment SaaS for Australian SMEs
under the parent brand Humanistiqs (Rayner Consulting Group Pty Ltd).
Owner: Jimmy Rayner.

## Live URL
https://hqai.vercel.app

## GitHub
https://github.com/jraynerhumanistiqs/hqai

## Tech stack
- Next.js 16 (App Router) + TypeScript
- Tailwind CSS v3 with custom design tokens (tailwind.config.ts)
- Supabase (auth + PostgreSQL) - RLS disabled for beta
- Anthropic Claude API (claude-sonnet-4-20250514) with streaming
- Cloudflare Stream - candidate video upload/playback
- Resend - transactional email (candidate invite + submission notify)
- Vercel (hosting)
- Stripe (portal wired, payments not yet live)

## Design system (v3 - Uber-inspired, April 2026)
Source of truth: DESIGN-uber.md (in project root)

### Tokens (tailwind.config.ts)
- Primary:    #000000  - buttons, headings, nav text (bg-black / text-black)
- Background: #FFFFFF  - page surfaces (bg-white / bg-bg)
- Charcoal:   #1F1F1F  - body text on white (text-charcoal)
- Mid:        #4b4b4b  - secondary text (text-mid)
- Muted:      #afafaf  - tertiary text, placeholders (text-muted)
- Light:      #efefef  - chip/filter bg (bg-light)
- Border:     #e2e2e2  - dividers, input borders (border-border)
- Accent:     #000000  - primary CTA (bg-accent = bg-black)
- Danger:     #D94F4F  - errors (text-danger / bg-danger)
- Warning:    #C8850A  - escalation (text-warning)
- Success:    #3D8A5E  - confirmations

### Typography
- Font: DM Sans only (all roles - sans, display, serif all map to DM Sans)
- Loaded via Google Fonts in app/globals.css
- DO NOT add Bebas Neue or Fraunces - they were removed
- Scale: display 52px, h1 36px, h2 32px, h3 24px, body 16px, small 14px, xs 12px

### Component rules
- Buttons: always rounded-full (9999px) - never rounded-xl or rounded-lg
- Cards: bg-white shadow-card (no border) - shadow: 0 4px 16px rgba(0,0,0,0.12)
- Inputs: bg-white border border-border focus:border-black
- Sidebar stays dark (bg-[#000000]) - white/opacity text only
- No gradients, no color accents, no orange (#fd7325 is gone entirely)

## Key files
- DESIGN-uber.md - design system source of truth
- tailwind.config.ts - all design tokens
- app/globals.css - font import (DM Sans only), body base styles
- app/layout.tsx - root layout (no font Next.js import - done via CSS)
- lib/prompts.ts - all AI system prompts and escalation logic
- lib/supabase/server.ts - Supabase server client
- lib/supabase/client.ts - Supabase browser client
- lib/supabase/admin.ts - service-role admin client (lazy Proxy singleton)
- lib/email.ts - Resend helpers (sendCandidateInviteEmail, sendCandidateSubmittedEmail)
- lib/recruit-types.ts - PrescreenSession, CandidateResponse interfaces
- lib/template-ip.ts - 33 HR/recruitment document templates (ALL_TEMPLATES)
- app/api/chat/route.ts - Claude streaming API route
- app/api/prescreen/sessions/route.ts - create/list prescreen sessions
- app/api/prescreen/sessions/[id]/route.ts - get session (public)
- app/api/prescreen/sessions/[id]/responses/route.ts - submit candidate response
- app/api/prescreen/sessions/[id]/invite/route.ts - email candidate invite link
- app/api/prescreen/questions/generate/route.ts - AI question gen (no session side-effect)
- app/api/prescreen/videos/upload-url/route.ts - Cloudflare Stream upload URL
- components/chat/ChatInterface.tsx - HQ People AI chat UI
- components/sidebar/Sidebar.tsx - navigation sidebar (dark)
- components/recruit/RecruitDashboard.tsx - two-panel recruit dashboard
- components/recruit/CreateRoleModal.tsx - two-step role creation modal
- components/recruit/RoleDetail.tsx - role detail right panel
- components/prescreen/CandidateGate.tsx - candidate entry form (public)
- components/prescreen/RecordingFlow.tsx - video recording UI (public)
- supabase/schema.sql - full database schema
- supabase/rls_prescreen.sql - RLS policies for prescreen tables

## Supabase
URL: https://rbuxsuuvbeojxcxwxcjf.supabase.co
Keys in environment variables (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY)
RLS is disabled - re-enable before commercial launch.

### Prescreen tables (run supabase/rls_prescreen.sql to enable)
- prescreen_sessions - role title, company, questions, time limit, business_id
- candidate_responses - video_ids, candidate name/email, consent, session_id
- Public candidate writes use supabaseAdmin (service-role, bypasses RLS)

## Environment variables required
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
ANTHROPIC_API_KEY
CLOUDFLARE_ACCOUNT_ID
CLOUDFLARE_STREAM_API_TOKEN
RESEND_API_KEY
NEXT_PUBLIC_BASE_URL          # e.g. https://hqai.vercel.app
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
STRIPE_PRICE_ID_ESSENTIALS    # monthly recurring Price id from Stripe for Essentials ($99)
STRIPE_PRICE_ID_GROWTH        # monthly recurring Price id for Growth ($199)
STRIPE_PRICE_ID_SCALE         # monthly recurring Price id for Scale ($379)
STRIPE_PRICE_ID_LETTER_OF_OFFER  # one-off Price id for the $25 Letter of Offer experiment
VOYAGE_API_KEY                # voyage-law-2 embeddings (optional - falls back to OpenAI)
COHERE_API_KEY                # Cohere rerank-3 (optional)
```

## Current build status
WORKING:
- Auth (login, signup, magic link) - white/clean design
- Business onboarding wizard (3 steps) - white/clean design
- HQ People chat (Claude API streaming, DOCX generation, form detection)
- HQ Recruit dashboard (two-panel: role list left, detail right)
  - Create role modal with AI question generation
  - Candidate invite link copy + email send via Resend
  - Candidate video responses with Cloudflare Stream playback
  - Star rating, share/export per response
- Candidate prescreen flow (/prescreen/[id]) - public, no auth
  - CandidateGate (name/email/consent)
  - RecordingFlow (camera, per-question video, upload to Cloudflare)
  - ThankYouScreen on completion
- Email notifications via Resend:
  - Staff notified when candidate submits responses
  - Candidate emailed invite link by staff
- Document auto-save to Supabase
- Document library page
- HR Templates page (33 templates, download + customise)
- Settings page (business profile, logo upload, billing/Stripe portal)
- Sidebar navigation (dark theme, correct)
- Escalation detection with advisor card in chat
- Command bar (Cmd+K)
- Uber design system (v3) - white/black, DM Sans, pill buttons

NOT YET BUILT / INCOMPLETE:
- Stripe subscription payments (portal wired, checkout flow incomplete)
- Calendly advisor booking embed (/dashboard/booking placeholder)
- Team seat management
- Advisory hours tracking
- Supabase RLS policies (SQL written in rls_prescreen.sql, not applied yet)
- Review panel for candidates (/review/[token] exists but limited)
- Compliance assessment + audit tools (routes exist, pages placeholder)
- Leadership / Performance management tools (routes exist, pages placeholder)
- Recruitment Tools (Shortlist Agent, Screening, Campaign Coach - placeholders)
- Awards interpreter (/dashboard/awards - placeholder)

KNOWN ISSUES:
- Post-onboarding redirect to /dashboard can be unreliable on Vercel
  (session cookie not always persisting after signup)
- TypeScript errors suppressed via next.config.js ignoreBuildErrors: true
- Supabase RLS disabled - must enable before commercial launch
- Legacy recruit components (PrescreenDashboard, QuestionsPanel,
  ResponsesPanel, RoleSetupPanel, SessionSwitcher, RecruitTabs) still
  exist in components/recruit/ but are no longer imported - safe to delete

## Module architecture
### HQ People (/dashboard/people)
- AI HR advisor chat using Claude API streaming
- 33-template document detection → form interception → DOCX generation
- Escalation detection → advisor card → booking flow
- Module: 'people' passed to ChatInterface

### HQ Recruit (/dashboard/recruit)
- Two-panel dashboard: RecruitDashboard wraps CreateRoleModal + RoleDetail
- Sessions stored in prescreen_sessions (Supabase)
- Candidates access /prescreen/[id] - no auth required
- Videos stored in Cloudflare Stream
- Responses in candidate_responses (Supabase)
- Staff view responses in RoleDetail right panel

### Prescreen flow
1. Staff creates role (CreateRoleModal → POST /api/prescreen/sessions)
2. Staff copies/emails invite link (RoleDetail → POST /api/prescreen/sessions/[id]/invite)
3. Candidate opens /prescreen/[id] → CandidateGate → RecordingFlow → ThankYouScreen
4. Candidate submits → POST /api/prescreen/sessions/[id]/responses
5. Staff gets email notification, views videos in RoleDetail

## Brand positioning
"The operating system for people, compliance, and hiring -
powered by human-centred AI."

Anti-Employsure: AI handles self-service, same human advisor
handles complexity every time. No repeating yourself.

Australian employment law only: Fair Work Act, NES, Modern Awards.

## Pricing
- Free: 14-day trial
- Essentials: $99/month (3 seats)
- Growth: $199/month (6 seats) - most popular
- Scale: $379/month (12 seats)
- Advisory add-ons: $250/$400/$680/$1,100/month

## Next build priorities (in order)
1. Enable Supabase RLS (run rls_prescreen.sql, write policies for all tables)
2. Move any remaining hardcoded Supabase keys to env vars
3. Fix post-onboarding redirect (session cookie issue on Vercel)
4. Stripe subscription checkout flow (plans → Stripe → activate on webhook)
5. Calendly booking embed (/dashboard/booking)
6. Compliance assessment tool
7. Awards interpreter tool
8. Team seat management
9. Delete legacy recruit components (PrescreenDashboard etc.)
10. Add RESEND_API_KEY + verify domain hq.humanistiqs.ai in Resend dashboard

## Australian employment law context
HQ.ai's AI is grounded in Australian employment law exclusively.
Full prompt architecture in lib/prompts.ts.
IP knowledge base covers 33 HR/recruitment document templates
defined in lib/template-ip.ts (ALL_TEMPLATES, TEMPLATE_CATEGORIES).
