# Work In Flight - 8 May 2026

Tracking the batch of fixes from the post-Phase-1-prep session. Done items struck through; deferred items have a one-line reason.

## Done in this session

- [x] **RLS SQL bug** - prescreen tables resolve business via `created_by -> profiles.business_id`, not `prescreen_sessions.business_id` (which doesn't exist). `supabase/migrations/rls_all_tables.sql` updated. Re-run on staging.
- [x] **Login screen "letterbox emoji" bug** - text colours were `text-white` on a white card, so the email and message were invisible. Fixed.
- [x] **Magic link redirects to login** - rewrote `app/auth/callback/page.tsx` as a client-side handler that supports all three Supabase flows: implicit (URL fragment), PKCE (`?code=`), and email OTP (`?token_hash=&type=`). Verifies which one is present and runs the right setSession / exchangeCodeForSession / verifyOtp. Server-side `route.ts` removed.
- [x] **HQ Recruit landing page** - `/dashboard/recruit` now shows three tile cards (Campaign Coach, CV Screening, Shortlist Agent) with emojis and a numbered funnel order. Existing dashboard moved to `/dashboard/recruit/shortlist`.
- [x] **Inter-tool routing** - Campaign Coach Step 5 now has "Move to CV Screening" + "Skip to Shortlist Agent" CTAs. CV Screening header has "Move to Shortlist Agent" CTA. Sidebar Shortlist Agent link points at the new path.
- [x] **Sidebar - "AI Advisor [name]" -> "AI Advisor"**.
- [x] **Sidebar - "Video Pre-screen" -> "Shortlist Agent"**.
- [x] **Bottom advisor container removed** - replaced with a small "Need more HR or recruitment support?" line and a Contact HQ Advisor button. Clicking opens a multi-step modal: pick HR or Recruitment, write a quick summary, submit. Backend route `/api/support/contact-advisor` emails the request to `jrayner@humanistiqs.com.au` via Resend.
- [x] **Heading parity** - CV Screening and Shortlist Agent headings now use the Campaign Coach style (`font-display ... uppercase tracking-wider` with NEW badge).
- [x] **Award "Remove from campaign" link** - added next to "Change award" in Step 2.
- [x] **Kanban "Video Interview" tile** - new stage added between In Review and Shortlisted. 5 columns instead of 4.
- [x] **CRON_SECRET deployment guide** - `docs/OPS-CRON-AND-DOMAIN.md` with step-by-step.
- [x] **Custom domain (humanistiqs.ai) guide** - same doc covers swapping `NEXT_PUBLIC_BASE_URL` once the DNS is set up.
- [x] **Job board integration research** - `docs/JOB-BOARD-INTEGRATION-RESEARCH.md` (committed as `2cebf0c`).

## Deferred to next pass (with reason)

- [ ] **AI Advisor common-topics tree** - This is a sizeable UX change (new pre-input topic picker + question-tree state machine + free-text fallback exactly like Claude.ai). Worth doing properly, not bolted on in 30 minutes. Scoped as a follow-up commit.
- [ ] **Step 1 chat container restyle + 5 industry-relevant roles + coaching points** - Three changes that interlock. The roles list needs to be filtered against the business's `industry` field and probably the awards taxonomy. Coaching points need a new prompt and possibly a separate tool call. Scoped together as a separate Step 1 redesign.
- [ ] **AI Recommendation card on candidate review** - Needs a new column on `prescreen_evaluations` (or computed live from existing scores), prompt change to produce a recommendation+rationale, and UI placement. Currently the existing star rating + scoring fills part of this gap; the recommendation is the missing piece.
- [ ] **Anonymise toggle hides videos + only shows AI summary** - Currently anonymise just swaps the candidate name. To extend it to hide video thumbnails and the player, we need to gate those component renders on `anonymise && !revealAfterShortlist`. Targeted but needs care to not break the "reveal" flow when a candidate is shortlisted.
- [ ] **Templated email "Send invite" surfacing** - The endpoint already exists at `/api/prescreen/sessions/{id}/invite`; the existing UI calls it. The user may want the email TEMPLATE made customisable / preview-able before send. Needs scoping conversation.
- [ ] **Job board integration implementation** - Research is done. V1 cut per the report is deep-link redirects + the existing copy-paste flow. Already partially implemented (Step 5 has SEEK / Indeed / LinkedIn deep-link buttons). The full Phase 2 integration (SEEK partner application, Indeed Job Sync, Jora XML feed) is several weeks of work and partner approvals.

## Pending James-action items

- [ ] **CRON_SECRET in Vercel Production env + redeploy** (per `docs/OPS-CRON-AND-DOMAIN.md` section 1)
- [ ] **Add `humanistiqs.ai` (or chosen subdomain) as a Vercel custom domain** + update `NEXT_PUBLIC_BASE_URL` (per same doc, section 2). This fixes the Shortlist Agent video URLs showing as `vercel.app`.
- [ ] **Re-run `rls_all_tables.sql` on staging** now that the prescreen-tables fix has been applied.
- [ ] **Apply `roles_and_telemetry.sql` migration** if not already done.
