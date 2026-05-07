# Post-Meeting Report: Nathan (Developer) Walkthrough

**Date:** 7 May 2026
**Attendees:** James Rayner (HQ.ai founder), Nathan (external developer, ex-Jumbo Interactive engineering lead, currently growth engineer at a Goldie-based startup), Rav (Humanistiqs partner, recruitment lead).
**Context:** First external technical review of HQ.ai. Nathan was given the live deployment, the GitHub repo, and `docs/DEV-HANDOFF.md` to review prior. The session was an open walkthrough of HQ People, HQ Recruit (Campaign Coach + CV Screening + Video Pre-screen), the chat advisor, and the underlying architecture decisions.

This report captures every actionable observation, validation point, recommendation, and concern Nathan raised. It's organised by theme so the team can act against it directly.

---

## 1. Nathan's profile and credibility

Used so the team understands the weight to put on his feedback.

- Backend-first developer. Came up through Jumbo Interactive from graduate developer to team lead / engineering manager. Stepped back to IC work at startup Carded when he got tired of management overhead.
- Has shipped real AI tools in production: a radiology-report summariser (LLM wrapped around a structured template) and a voice AI agent that calls clinics to book appointments (still a work in progress).
- Practical and unhyped about AI. Self-described as "in between two minds" on vibe coding versus traditional engineering, similar to James's own framing.
- Clear about what he doesn't know: front-end work isn't his specialty, hasn't used Supabase as a database (only for auth), wasn't willing to quote on optimisation work without first poking at the code.
- Not a salesperson - did not push for paid engagement. Specifically said "I'd be doing something similar to you. It's just, I guess I've got a flashlight, and you're in the dark a little bit."

**Implication:** Nathan's opinions on backend architecture, observability, and shipping discipline carry weight. His UX/visual feedback is honest but lower priority for this stage.

---

## 2. Top-line verdict

> **Nathan, paraphrased:** "I think you've got the right direction. You're really focused on keeping the scope sort of narrow and what you want it to do, and keeping the guardrails on the whole time. I think where people get into trouble with vibe coding is they don't think about the guardrails at all, and then they complain later. I think you've done such a good job. Like it's there already."

He explicitly validated:
- The narrow-scope-with-guardrails approach to the AI advisor.
- Australian-employment-law-only as a defensible niche.
- The per-rubric-with-evidence-spans pattern in CV Screening.
- The structured-data-from-natural-language pattern in Campaign Coach ("that's a really cool use case for AI").
- The decision to use Anthropic Claude (he confirmed Sonnet 4 by inspecting the route).
- Not exposing the chat to the open web for general-purpose questions.

He flagged one structural concern (chat speed and scaling) and offered five categories of practical improvement (below).

---

## 3. Issues raised, mapped to action

### 3.1 Login is clunky

- **Quote:** "Login was sort of clunky. I think I tried to generate an auto magic link, and then that didn't actually log me in."
- **Severity:** Medium. First impression for any tester.
- **Likely root cause:** Either the magic-link redirect handler isn't completing the session set, or the email template / Supabase Site URL config is off for production.
- **Action:** Reproduce on a fresh browser profile. Check Supabase auth logs after the magic-link click. Verify the auth callback route is on the deployed URL (`https://hqai.vercel.app`) not localhost.
- **Owner:** James (today / this week before any internal pilot).

### 3.2 Chat speed and token usage are linked - and we have no instrumentation

- **Quote:** "I'm trying to figure out in my head, I guess, why it would be slow. I think if it's reading all of the files, I think that explains why it's slow and why you're chewing through tokens pretty quickly and filling up the context."
- **Severity:** High. This is the demo-blocker we already know about.
- **Recommended approach (Nathan's words):** "Try and do an initial classification of what the request is trying to do before loading all the files, and then try and do a lookup of the files that you need that relate to what you're doing. And that should be faster, because it's not having to read all the files and use less tokens."
- **Caveat (also Nathan's):** "Could change the whole model and how the framework of how your chat is working, and then you could also get less accuracy, because there's two stages. So there's a chance that you could misclassify the first request and then miss valuable information that you haven't loaded into context."
- **Action:**
  - Action item A: Capture per-request token usage (input, output, total) on every chat turn. Log to a `chat_telemetry` table with timestamp, conversation id, query length, tool calls made, tier classification, total time.
  - Action item B: Implement a Tier classifier per the V2 architecture spec (`docs/CHAT-ARCHITECTURE-V2.md` section 3) so simple lookups skip the full retrieval pipeline.
  - Action item C: Add a "soft cap" on retrieval breadth - cap topK to 4 chunks, content per chunk to 1500 chars. (Already in place per `lib/rag.ts` - verify on staging.)

### 3.3 No data feedback loop on AI accuracy

- **Quote (about Campaign Coach Step 2):** "Do you have the data on how often people are changing those things? How often is the AI mostly correct but a little bit wrong? And can you feed that back? I think that would be an annoying use case for the user, like that's annoying for me when AI doesn't get it quite right, because I can't trust it. I have to be like, looking at all the details still."
- **Quote on the bigger pattern:** "If you're just not capturing the data, you don't know, you're relying on your clients to come back to you and be like 'hey, that was wrong', which they probably wouldn't do. They would just sort of enforce it, change the field."
- **Severity:** High. Without this we cannot improve the AI over time and we cannot detect model drift.
- **Action:**
  - Capture every AI-generated structured output before user edit (e.g. Campaign Coach role profile, CV Screening scores, suggested rubric).
  - Capture the user-edited final value when they confirm.
  - Build a daily diff report showing "field changed in X% of sessions" per surface.
  - Trigger: any single field changed in >40% of sessions for two consecutive weeks = prompt revision required.
- **Owner:** Engineering (post-internal-pilot, before client pilot).

### 3.4 Observability and session replay

- **Quote:** "You can add observability. So there's tools where you can replay someone's whole session and see them clicking around, like full story, so you could get Claude to add that for you. Other like good logging, I think is always good if there are going to be issues."
- **Severity:** Medium. Not blocking for internal pilot, blocking for client pilot.
- **Action:**
  - Add structured server-side logging (Vercel logs are insufficient for this - use a dedicated sink: Logtail, Axiom, or a Supabase logs table for now).
  - Decide: Full Story or Microsoft Clarity (free) for client-pilot phase. Clarity is the lighter touch and gets you 90% of the value.
- **Owner:** Engineering (between internal pilot and client pilot).

### 3.5 Feature-flag protection of unfinished surfaces

- **Quote:** "You can put things behind feature flags so you can still keep testing around with it in your like dead environment while you're building, but on production they don't see it until you're ready for them to see it. And then yeah, just sort of like Gate features that way."
- **Severity:** High. Several modules currently visible in the sidebar are placeholders (Strategy Coach, Team Development, Awards Interpreter, parts of Compliance Audit).
- **Action:** Add a `feature_flags` table or a config map keyed by `environment` and `business_id`. Hide or disable Coming-Soon modules in production for client-pilot users. Allow internal Humanistiqs accounts to see everything. Use environment variables for the global toggle and Supabase row-level for per-business overrides.
- **Owner:** Engineering (before client pilot).

### 3.6 Database posture - Supabase concerns

- **Quote:** "I've only used Supabase for the auth side. I haven't used their database before because that sort of scares me, and their rest layer on top of it scares me, and you probably do need to be good at like securing that and understanding Supabase."
- **Specific concern:** Supabase's RLS being disabled on our beta is the obvious red flag. Nathan also flagged that the REST layer being publicly exposed (PostgREST through `supabase-js`) means any field on any table that isn't gated by RLS is reachable from a logged-in user's browser.
- **Alternative he suggested:** Neon for the database, with custom queries written in our own API routes. Trade-off: no auto-generated REST/RPC layer; we hand-write every query. Benefit: nothing exposed to the browser except our own API surface.
- **Action:**
  - Short-term (before client pilot): apply RLS policies to every existing table. SQL is already drafted at `supabase/rls_prescreen.sql` for the prescreen tables. Replicate the pattern for `cv_screenings`, `cv_custom_rubrics`, `documents`, `conversations`, `messages`, `chat_audit_log`, `campaigns`, `prescreen_evaluations`. Pattern: `business_id = (select business_id from profiles where id = auth.uid())`.
  - Medium-term (post-client-pilot): re-evaluate Neon migration. Not urgent given Supabase + RLS done well is fine, but worth a 1-day spike to compare.
- **Owner:** Engineering (RLS within 2 weeks of internal pilot start; Neon spike post-launch).

### 3.7 Scope creep is the headline risk

- **Quote:** "I look at what you've done, and it's good, but there's a lot going on. There's a lot of features that you're trying to ship with from day one. And then it looks like you're sort of like 'oh, this one's almost, this one's probably better, but this one's got some issues as well.' And I'm guessing you're jumping between them a little bit."
- **James's response in the meeting:** "The MVP was both of them, which I think is a problem. I'm more passionate about HQ People, because that makes sense. But yeah, I can see how the MVP for say HQ Recruit looks like."
- **Action:** Pick one product surface as the V1 launch wedge. Nathan's recommendation (read between the lines): HQ Recruit because it's closer to ready and Rav's team can use it directly. HQ People stays in beta with a clear "alpha" badge until the data feedback loop is in place.

### 3.8 Don't be precious about polish before users see it

- **Quote:** "There's a lot of unpolished products that are out there that have like open and spending money on marketing and advertising. So I wouldn't be scared about putting something that's unpolished in front of just internal people and people that you know."
- **Quote:** "I would ship it and just do it internally and get people using it. You're going to get feedback way quicker that way. It's what a lot of engineers do as well, as they just sit there and just try to perfect everything. I've worked in like most of my teams have been either startups or growth teams, and you're just trying to experiment as fast as possible."
- **Quote (on stakes):** "If it crashes, it crashes, you know. I've brought down where I worked at Jumbo, I brought down the website for like an hour before. I think it was one of the worst outages. These stuff happen, you know."
- **Action:** Stop polishing in the dark. Move to internal pilot this week.

---

## 4. What Nathan validated (preserve these decisions)

Don't second-guess these in the next iteration:

| Decision | Nathan's signal |
|---|---|
| Niche to AU employment law only | "If we niche down to that, there's still enough businesses in Australia that would allow for it" - he didn't push back |
| Tool-use guardrails (`get_pay_rate`, `search_knowledge`) instead of letting the model talk freely | "Limiting its scope to what it has access to. Like not giving it access to maybe your database candidates, right? Like that's probably IP that you don't want to let out." |
| Anthropic Claude as the model | He confirmed Sonnet 4 was a sensible pick, did not suggest switching providers |
| Per-criterion evidence spans in CV Screening | Spent the most positive time on this surface ("really cool use case for AI") |
| Hybrid retrieval grounded on uploaded corpus, not open-web | "If you have it have access to the whole internet... that's probably more risky" - he favoured the gated approach |
| Anti-Employsure positioning, "anti repeating yourself" | He used his own examples (his radiology client) to validate the per-customer context-loading idea |
| Hard refusal triage on serious incidents (the grinder example) | He didn't see the triage card in the meeting but the principle of "hard stop on key identifiers" matches his "guardrails first" advice |

---

## 5. Things Nathan offered to do himself

He repeatedly said he was happy to engage on paid work, but did not push. Specifically he offered:
- Token usage optimisation (his words: "I can look at optimising prompts and token usage and stuff like that as well")
- Database security review and the Neon migration if we go that route
- Caveated heavily that he'd be "doing something similar to you" but with a "flashlight" - i.e. specialist debugging not greenfield work

**Recommendation:** Engage Nathan on a fixed-scope piece - the chat-speed-and-token-tracking work (issue 3.2 above) - as a paid gig once internal pilot has produced enough telemetry to know what's actually slow. Don't engage him for greenfield feature work; the founder + Claude Code is sufficient for that.

---

## 6. Key takeaways (for Rav and the partners)

1. **The product is real.** An external technical reviewer with a backend pedigree said "you've done such a good job, it's there already." Stop hedging when describing it to clients.

2. **The main risk is internal, not technical.** Nathan's strongest critique was scope creep - jumping between HQ People and HQ Recruit. We need to commit to a wedge.

3. **The chat is the thing that needs the most work.** It is also the thing James is most passionate about. These two facts are in tension. Recommended resolution: HQ Recruit launches first as the beachhead, HQ People stays in alpha with internal-only access.

4. **We need data before we can trust the AI in front of clients.** Today we have no telemetry on token usage, request latency, AI accuracy, or user-correction frequency. We can't graduate from internal pilot to client pilot without instrumenting at least token usage, latency, and Campaign Coach field-edit rates.

5. **RLS is the biggest unaddressed security debt.** The repo's `CLAUDE.md` flags it. Nathan's review confirmed it. It needs to be done before any external client touches the system.

6. **A budget cap on Anthropic is in place.** Nathan asked, James confirmed already configured.

---

## 7. Product progression steps (specific, sequenced)

### Step A: Stabilise (this week)
- Fix magic-link login (issue 3.1).
- Add `chat_telemetry` table + per-request logging in `app/api/chat/route.ts` (token usage, latency, tool calls).
- Apply feature flags to hide Coming-Soon modules from non-internal accounts.
- Decide and write down: HQ Recruit is the launch wedge; HQ People is internal-alpha until further notice.

### Step B: Internal pilot (next 2 weeks)
- Onboard Humanistiqs partners and 1-2 internal team members (Rav, Jess, James).
- Use HQ Recruit on real client campaigns Rav is working.
- Capture feedback in a single doc; review weekly.
- Daily review of the chat telemetry to find what's actually slow / expensive.

### Step C: Apply RLS (parallel with Step B)
- Write and apply RLS policies for every Supabase table.
- Re-run the smoke test with a non-admin auth user to confirm policies hold.
- Sign-off blocker before Step D.

### Step D: Client pilot (weeks 3-4 after internal pilot starts)
- Invite 3-5 trusted SME founders (the construction mate, plus 2-4 others) as private beta.
- Frame explicitly as "early alpha, your feedback shapes V1".
- Add Microsoft Clarity for session replay.
- No advertising, no open signup.

### Step E: Engage Nathan (paid, fixed scope)
- Brief: "Cut the chat p95 latency from N seconds to under M, without regressing answer quality on the eval set."
- Deliverable: the two-stage classifier + retrieval-narrowing pattern Nathan described.
- Timing: only after Step B has produced enough telemetry to know the real numbers.

### Step F: Full launch
- Open signup gated by a free 14-day trial.
- Pricing tiers as designed (Essentials / Growth / Scale).
- Stripe subscription checkout completed (this is also outstanding from `CLAUDE.md` next-build priorities).
- Marketing site, content, public LinkedIn presence.

The phased plan to deliver A through F is in `docs/PHASED-ROLLOUT-PLAN.md` (being produced by the coordinator agent).

---

## 8. Things explicitly out of scope for now

Per Nathan's "narrow scope" advice, we are NOT doing these in the V1 launch wedge:
- Web search inside HQ People chat (he flagged the hallucination risk on the open-web variant)
- General-purpose AI assistant features unrelated to AU employment law
- Seek API integration (Nathan didn't push back on James's plan to use an internal job board first)
- Stripe checkout flow (deferred to post-pilot)
- Full migration to Neon (deferred - 1-day spike post-launch)
- Bias dashboard (already deferred to v2.5 in the CV Screening research)
- Live interview copilot, async video screen automation (CV Screening v2/v3 only)

---

End of report. Companion document with the phased rollout plan: `docs/PHASED-ROLLOUT-PLAN.md`.
