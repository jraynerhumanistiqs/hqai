# HQ.ai — Project Context for Claude Code

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
- Tailwind CSS with custom design system
- Supabase (auth + database) — RLS currently disabled for beta
- Anthropic Claude API (claude-sonnet-4) with streaming
- Vercel (hosting)
- Stripe (not yet integrated)

## Design system (v2 — brand brief applied)
- Primary: #0A0A0A (soft black)
- Background: #F7F7F5 (warm off-white)
- Accent: #6F8F7A (deep sage — CTAs, active states, AI highlights)
- Border: #E4E4E2
- Mid gray: #6B6B6B
- Fonts: Fraunces (serif, display/headings only) + DM Sans (all UI)
- Philosophy: Notion + Linear + Stripe — clarity, speed, whitespace
- Command bar: Cmd+K (components/ui/CommandBar.tsx)
- Microinteractions: hover-lift, click-compress, fade-in, slide-up
- Skeleton loading states (not spinners)

## Key files
- lib/prompts.ts — all AI system prompts and escalation logic
- lib/supabase/server.ts — Supabase keys currently hardcoded
- lib/supabase/client.ts — Supabase keys currently hardcoded
- app/api/chat/route.ts — Claude streaming API route
- components/chat/ChatInterface.tsx — main chat UI
- components/sidebar/Sidebar.tsx — navigation sidebar
- components/ui/CommandBar.tsx — Cmd+K command bar
- supabase/schema.sql — full database schema
- tailwind.config.ts — design tokens

## Supabase
URL: https://rbuxsuuvbeojxcxwxcjf.supabase.co
Keys are hardcoded in lib/supabase/server.ts and client.ts.
RLS is disabled — re-enable before commercial launch.

## Current build status
WORKING:
- Auth (login, signup, magic link)
- Business onboarding wizard (3 steps)
- HQ People chat (Claude API streaming)
- HQ Recruit chat (Claude API streaming)
- Document auto-save to Supabase
- Document library page
- Settings page
- Sidebar navigation
- Escalation detection with advisor card
- Command bar (Cmd+K)
- New design system (v2)

NOT YET BUILT:
- Stripe subscription payments
- DOCX document download
- Calendly advisor booking embed
- Team seat management
- Advisory hours tracking
- Email notifications (Resend)
- Supabase RLS policies
- Dashboard homepage (activity, quick actions, insights)

KNOWN ISSUES:
- Post-onboarding redirect to /dashboard unreliable on Vercel
  (session cookie not persisting after signup — investigate)
- TypeScript errors suppressed via next.config.js ignoreBuildErrors
- Supabase keys hardcoded instead of env vars

## Brand positioning
"The operating system for people, compliance, and hiring — 
powered by human-centred AI."

Anti-Employsure: AI handles self-service, same human advisor 
handles complexity every time. No repeating yourself.

Australian employment law only: Fair Work Act, NES, Modern Awards.

## Pricing
- Free: 14-day trial
- Essentials: $99/month (3 seats)
- Growth: $199/month (6 seats) — most popular
- Scale: $379/month (12 seats)
- Advisory add-ons: $250/$400/$680/$1,100/month

## Next build priorities (in order)
1. Fix post-onboarding redirect — session not persisting on Vercel
2. Move Supabase keys back to environment variables
3. Dashboard homepage — welcome, quick actions, recent activity
4. Stripe subscription integration
5. DOCX document download
6. Calendly advisor booking embed
7. Re-enable Supabase RLS
8. Team seat management
9. Email notifications via Resend

## Australian employment law context
HQ.ai's AI is grounded in Australian employment law exclusively.
Full prompt architecture in lib/prompts.ts.
IP knowledge base covers 33 HR/recruitment document templates.
