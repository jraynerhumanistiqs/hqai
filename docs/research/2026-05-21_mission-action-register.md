# HQ.ai Mission Action Register

**Date**: 2026-05-21
**Source report**: `2026-05-21_mission-validation.md`
**Founder decisions locked**:
1. **Keep "no matter the size" in the mission.** All four bands (micro / small / medium / large) must be evidenced.
2. **Adopt the founder's most-recent stated pricing** as the canonical model:
   - HQ People $59 (to 25 staff) / $179 (to 150)
   - HQ Recruit add-on $40 (1 role) / $120 (unlimited)
   - Bundle "Complete" $89 / $269
   - One-off documents $25-$79
   - HR365 (human advisor) $799/mo, Recruit365 $899/mo, Combined $1,599/mo
   - Retire the Solo $89 / Business $249 (v2) narrative from pricing-config, marketing, and Stripe.

**Purpose**: convert every doubt, gap and validation item in the mission report into a prioritised, owned action. Not a plan document. A register.

**Priority legend**:
- **P0** = ship this fortnight (blocks pilot credibility)
- **P1** = ship this quarter (Q3 2026)
- **P2** = ship inside 180 days (Q4 2026)
- **P3** = ship inside 12-18 months (2027-Q1 2028)

**Doubt-impact legend**: how much the action shifts the ~35% overall confidence toward 90%+.

---

## Section 1 - P0: this fortnight (unblock the pilot)

| # | Action | Owner | Effort | Success criteria | Doubt-impact |
|---|---|---|---|---|---|
| A1 | **Consolidate pricing to the C10 + Enterprise-stack model.** Rewrite `lib/pricing-config.ts` to the founder's stated numbers ($59/$179 People, $40/$120 Recruit, $89/$269 Complete, $25-$79 one-offs, $799/$899/$1,599 HR365 stack). Delete Solo/Business v2 references from code + docs. | Dev | 1 day | One pricing model in one file; `grep -r "Solo.*89\|Business.*249"` returns 0 hits outside archival research files. | Kills Doubt #3 |
| A2 | **Retire the old Stripe Price IDs.** Create new Stripe Prices for every SKU above (monthly + annual). Update `.env` template and CLAUDE.md env list. Deactivate the Solo/Business Stripe products. | Dev | 0.5 day | Stripe dashboard shows only the C10 + Enterprise + one-off SKUs as active. | Kills Doubt #3 |
| A3 | **Rewrite the pricing page** end-to-end to the new model. Ship both tiers of HQ People + Recruit add-on + Complete bundle + HR365/Recruit365/Combined + one-off marketplace tease in one page. | Dev + Copy | 2 days | `/pricing` renders 5 pricing surfaces cleanly on desktop + mobile; no dead SKU references anywhere. | Kills Doubt #3 |
| A4 | **Enable Supabase RLS.** Run `supabase/rls_prescreen.sql` + write policies for `businesses`, `documents`, `knowledge_chunks`, and the credit ledger. Verify with a cross-tenant read test. | Dev | 2 days | RLS on for every table; automated test proves user A cannot read user B's docs. | Kills half of Doubt #4 |
| A5 | **Fix the Stripe checkout flow.** Wire subscription checkout end-to-end for HQ People (both tiers), Recruit add-on, Complete bundle, and each HR365 stack SKU. Webhook activates the plan on `checkout.session.completed`. | Dev | 3 days | End-to-end test purchases work; webhook activates plan; failed webhooks retry. | Kills half of Doubt #4 |
| A6 | **Ship the marketplace $25 Letter of Offer** as a no-signup Stripe one-off SKU at `/marketplace/letter-of-offer`. Editor mounts on `/offer/success`. | Dev | 2 days | Cold prospect can pay $25, edit, download DOCX in under 5 minutes without an account. | Load-bearing for micro band (Doubt #1) |
| A7 | **Publish the "AU AI Accuracy Standard" page** at `humanistiqs.ai/ai-standard`. Covers: citation-grounded architecture, deny-list scope, escalation triggers, human-review layer, no-legal-advice disclaimer, quarterly accuracy audit commitment. | Founder + Copy | 1 day | Page live; linked in footer + AI Advisor UI. | Kills part of Doubt #2 |
| A8 | **Rewrite the mission statement to make "no matter the size" defensible.** Public wording stays; internal wording adds the four-band accountability: "solo through 250+, self-serve for the first 150, human layer for 20-199, partnership motion for 200+". Publish on the About page + founder LinkedIn. | Founder | 0.5 day | About page updated; internal doc committed to repo. | Reframes Doubt #1 |
| A9 | **Delete legacy Recruit components** (PrescreenDashboard, QuestionsPanel, ResponsesPanel, RoleSetupPanel, SessionSwitcher, RecruitTabs). Fix all TypeScript errors so `next.config.js ignoreBuildErrors` can be flipped to `false`. | Dev | 1 day | `next build` passes without `ignoreBuildErrors`. | Kills quarter of Doubt #4 |

**P0 subtotal**: ~13 dev-days + 2 founder-days. Achievable inside a fortnight.

---

## Section 2 - P1: this quarter (Q3 2026 - lift confidence to ~55%)

### 2.1 Content sprint - close the 2024-26 currency gaps

| # | Action | Owner | Effort | Success criteria | Doubt-impact |
|---|---|---|---|---|---|
| B1 | **Add Right to Disconnect** (both 2024 large-employer and 2025 small-business tranches) to `lib/prompts.ts` grounding + create RTD policy template + add to the 33-template library (now 34). | Founder + Dev | 3 days | AI Advisor cites s.333M FWA in relevant answers; RTD policy template generates cleanly. | Kills part of Doubt #2 |
| B2 | **Add psychosocial safety WHS duties.** Not employment law directly but adjacent - Model WHS Regs 2022 + Code of Practice content in the knowledge base. Add a "psychosocial risk assessment" template. | Founder + Dev | 3 days | Advisor can answer "what are my psychosocial WHS duties?" with a cited answer. | Kills part of Doubt #2 |
| B3 | **Add criminalised wage theft (Jan 2025)** to grounding + AI Advisor triage. Every wage / underpayment question surfaces the criminal-liability chip and pushes escalation. | Founder + Dev | 2 days | Underpayment questions surface a Fair Work criminal threshold warning + escalation card. | Kills part of Doubt #2 |
| B4 | **Add Employee Choice Pathway (21-day mechanics)** to casual-conversion flow + templates. | Founder + Dev | 2 days | Casual-conversion question triggers the Employee Choice Pathway workflow, not the old auto-conversion logic. | Kills part of Doubt #2 |
| B5 | **Add same-job-same-pay for labour hire** + payday super (July 2026) to knowledge base + grounding. | Founder + Dev | 2 days | Advisor covers both correctly with citations. | Kills part of Doubt #2 |
| B6 | **Ship freshness metadata on every answer.** "Answered using Fair Work Act content as of DD MMM YYYY" + a public "What changed this week" page. | Dev | 3 days | Every chat response renders a freshness date; `humanistiqs.ai/changed` publishes weekly. | Reinforces Moat 3 in mission report §D |
| B7 | **Complete the placeholder features**: Awards Interpreter, Compliance Assessment, Campaign Coach. Each moves from route stub to shipping v1. | Dev | 15 days | All three ship v1 with dogfood evidence + at least 2 pilot users active in each. | Kills the rest of Doubt #4 |

**Subtotal**: 30 dev-days.

### 2.2 Legal + audit credibility (kill Doubt #2)

| # | Action | Owner | Effort | Success criteria | Doubt-impact |
|---|---|---|---|---|---|
| B8 | **Commission an independent Australian employment-law review** of the 34 templates + AI Advisor sample outputs. Target: a mid-size AU employment firm (e.g. Kingston Reid, Corrs Chambers Westgarth, Herbert Smith Freehills). Publish the review letter (redacted) on the AI Standard page. | Founder | 4 weeks lead time, ~$8-15k spend | Review letter published; any red flags fixed and re-reviewed before publication. | Kills majority of Doubt #2 |
| B9 | **Ship the accuracy audit dashboard.** Weekly internal audit of 20 random Advisor answers scored by the founder (or a contract HR reviewer) against Fair Work / NES / Award citations. Publish quarterly summary stats on the AI Standard page. | Founder | 1 day setup, 2 hrs/week ongoing | First quarterly report published Q4 2026 with 3 months of data. | Compounds Doubt #2 mitigation |
| B10 | **Disclaimer + escalation UI hardening.** Every chat answer that touches unfair dismissal, termination, workplace investigation, WHS incident, or EBA/enterprise agreement territory triggers the escalation card automatically - not opt-in. | Dev | 2 days | Automated regression tests over the 5 high-risk topic classes trigger escalation 100% of the time. | Kills reputational tail-risk in Doubt #2 |
| B11 | **AI-in-hiring fairness page** for the CV Scoring Agent. Publish: rubric-first not resume-first, bias-signal auto-anonymisation, manual override always available, no automated hire/reject decisions. Reference the Feb 2025 House Committee inquiry. | Founder + Copy | 1 day | Page live at `humanistiqs.ai/hiring-fairness`; linked from every CV Scoring Agent surface. | Pre-empts Doubt #2 regulatory tail |

**Subtotal**: 7 dev-days + ~$8-15k legal spend.

### 2.3 Small-band retention proof (defend the wedge)

| # | Action | Owner | Effort | Success criteria | Doubt-impact |
|---|---|---|---|---|---|
| B12 | **Foundation 100 launch (per retention brief) with the C10 pricing.** First 100 customers lock $269 Complete at $189/mo forever (14.9% discount, tighter than the retention brief's $179 vs $249 because C10 is cheaper). 12-month commit. | Founder | 2 days copy + landing | Foundation 100 slots page live; enrolment tracked. | Load-bearing for Doubt #5 (accountant + retention plays) |
| B13 | **Ship the Monday Brief** habit loop for HQ People customers (per retention brief §3.3). | Dev | 5 days | First Brief lands Monday 22 June 2026 6am AEST; open rate tracked. | Retention lever |
| B14 | **Ship the 5-metric pilot telemetry dashboard.** Time-to-first-cited-answer, day-7 active rate, credits-per-active-user, willingness-to-pay-conversion, spontaneous-referral count. | Dev | 3 days | Founder can see all five metrics for all pilots on one page. | Load-bearing for §F validation plan |

**Subtotal**: 10 dev-days.

### 2.4 Distribution moat (start the Q1 2027 channel)

| # | Action | Owner | Effort | Success criteria | Doubt-impact |
|---|---|---|---|---|---|
| B15 | **Begin accountant/bookkeeper partner conversations.** Founder-led, 5 named partners by end of Q3, no partner portal yet. Bookkeeper / BAS-agent focus per the retention brief. | Founder | 2 hrs/week | 5 named partners in a spreadsheet with recorded intro calls. | Kills part of Doubt #5 |
| B16 | **Draft the "Why not Employsure" comparison page** (`humanistiqs.ai/vs/employsure`). Fact-based, cites the ACCC $3M penalty, 5-year contract structure, published exit fees. No hyperbole. | Founder + Copy | 2 days | Page live; ranks in top-10 Google AU for "employsure alternative" within 90 days. | Kills part of Doubt #5 |

**Subtotal**: 4 dev-days + founder time.

---

**P1 total**: ~51 dev-days + 4 founder-weeks + ~$8-15k legal spend. Fits inside Q3 2026 with the pilot cohort running in parallel.

---

## Section 3 - P2: 180-day horizon (Q4 2026 - lift confidence to ~70-75%)

### 3.1 Micro-band coverage (the marketplace SKU expansion)

| # | Action | Owner | Effort | Success criteria | Doubt-impact |
|---|---|---|---|---|---|
| C1 | **Ship 5 more marketplace SKUs**: Termination Letter $45, Employment Contract $49, First & Final Warning $35, Position Description $29, Reference Check $25. All zero-signup Stripe one-offs. | Dev | 5 days | 6 total SKUs live; combined marketplace revenue tracked separately. | Micro band 25% -> 55% |
| C2 | **Ship the silent-account opt-in** on `/offer/success` per the doc-editor architecture. Non-member is offered "keep this document + all future docs on file" as a one-click retention lever. | Dev | 3 days | Opt-in rate tracked; conversion to Bundle Complete measured. | Micro band retention lift |
| C3 | **Ship the "$25 offer letter, no signup" PR push** through Smart Company + Inside Small Business. Founder byline article. | Founder | 3 days content + 2 weeks pitch | Article published in at least one of Smart Company / Inside Small Business. | CAC test |

### 3.2 Medium-band completeness (HR365/Recruit365 is a real product, not aspirational)

| # | Action | Owner | Effort | Success criteria | Doubt-impact |
|---|---|---|---|---|---|
| C4 | **Formalise the HR365/Recruit365 delivery model.** SLA, response-time commitment, advisor-hour tracking, session recording, handover-to-founder escalation for legal-adjacent matters. | Founder + Dev | 1 week | Playbook doc published; first HR365 customer onboarded on the SLA. | Medium band 35% -> 55% |
| C5 | **Build the "advisor hours consumed" meter** inside the customer dashboard. Same-human continuity is the promise - prove it. | Dev | 3 days | Dashboard shows hours-used / hours-remaining + named advisor + last-3-sessions history. | Delivers on anti-Employsure positioning |
| C6 | **Ship the Compliance Assessment tool.** Business owner answers 15 questions, gets a compliance risk score + prioritised remediation list drawn from the 34-template library. | Dev | 8 days | Tool ships; 20 pilots complete it in the first month. | Medium band completeness proof |
| C7 | **Payroll integration MVP.** Read-only Xero / MYOB / KeyPay connector to pull employee list into HQ.ai. Not a payroll engine - just data sync so ingested policies reference real employees. | Dev | 10 days | One of Xero / MYOB shipping; used by ≥3 medium-band pilots. | Closes the "we don't do payroll" objection at the Complete tier |

### 3.3 Enterprise plumbing (Doubt #1 - the "no matter the size" clause)

| # | Action | Owner | Effort | Success criteria | Doubt-impact |
|---|---|---|---|---|---|
| C8 | **SSO + audit logs.** SAML SSO via Auth0 or WorkOS. Structured audit log surfacing every AI answer + document generation + user action. Ship as an add-on to HR365 stack at $199/mo. | Dev | 10 days | SSO working with 1 pilot enterprise; audit logs immutable and exportable. | Enterprise band <10% -> 25% |
| C9 | **ISO 27001 or SOC 2 Type I gap analysis.** Not the audit yet, the readiness assessment. Prep for a Q2 2027 audit. | Founder + auditor | 3 weeks lead time, ~$5-10k | Gap analysis report received; remediation backlog created. | Enterprise prerequisite |
| C10 | **Data residency + hosting commitment.** Publish that all customer data lives in Supabase ap-southeast-2 (Sydney). Move any workloads outside AU back onshore. | Dev | 2 days | Public data-residency page live; verified via Supabase infrastructure page. | Enterprise + government-adjacent buyer prerequisite |
| C11 | **Enterprise inbound page** at `humanistiqs.ai/enterprise`. Not a sales team - a Calendly link to the founder for firms of 200+. Cap at 10 conversations in year one (per mission report). | Founder + Copy | 1 day | Page live; conversion to inbound calls tracked. | Enterprise band signal |

### 3.4 Competitive intelligence + moat hardening

| # | Action | Owner | Effort | Success criteria | Doubt-impact |
|---|---|---|---|---|---|
| C12 | **Watch HeroForce feature launches** and ship a same-week response every time. Public roadmap becomes the receipt. | Founder | 1 hr/week | Public `humanistiqs.ai/roadmap` updated weekly; every HeroForce feature has a matched entry with a ship date. | Kills part of Doubt #5 |
| C13 | **Content moat push.** Publish weekly `humanistiqs.ai/library/<topic>` guides on the 20 highest-search-volume AU HR questions (Modern Award classification per industry, casual conversion, RTD, etc). | Founder | 4 hrs/week | 12 published by end of Q4; ranks in top-5 for ≥3 target queries. | Reinforces Moat 3 |
| C14 | **Publish the "Foundation 100" wall** as a permanent marketing asset with logos + quotes + dollar-savings numbers. Requires opt-in. | Founder + Copy | 2 days | Wall page live with ≥20 named customers by end of Q4. | Trust signal |

---

**P2 total**: ~50 dev-days + 5 founder-weeks + ~$5-10k spend. Ships in Q4 2026 alongside the Q1 2027 partner-channel prep.

---

## Section 4 - P3: 12-18 months (2027 through Q1 2028 - lift to ~85-90%)

### 4.1 The proof-of-scale evidence (moves the ceiling from ~75% to ~90%)

| # | Action | Owner | Effort | Success criteria | Doubt-impact |
|---|---|---|---|---|---|
| D1 | **Get to 500 paying customers.** This is the analyst-reported minimum threshold for genuine "almost zero doubt" per the mission report. | Founder + growth motion | 12-18 months | 500 paying at end of Q1 2028. | Kills the shipped-scale doubt in the mission ceiling |
| D2 | **Publish the first annual "State of AU HR AI accuracy" report** using 12 months of audit data + customer-reported outcomes. | Founder | 4 weeks | Report published with third-party co-author (ideally an AU employment law academic). | Kills tail-risk in Doubt #2 |
| D3 | **Ship the accountant partner portal** (Q1 2027 per retention brief). 20% revenue share for 12 months; badge system; co-branded onboarding. | Dev | 15 days | Portal live; 10 active partners by end of Q1 2027; ≥30 partner-sourced customers. | Kills majority of Doubt #5 |
| D4 | **Ship Hospitality Pack + Trades Pack + Allied Health Pack** at $39/mo add-ons (per retention brief §4.2 Q2-Q4 2027). | Dev | 15 days each | Each pack ships with award-specific templates + interpretation depth; ≥50 subscribers per pack in Q4 2027. | Vertical moat |
| D5 | **Enterprise SOC 2 Type I audit** and publish trust page at `humanistiqs.ai/trust`. | Founder + auditor | 6-8 weeks + $15-30k | SOC 2 Type I letter published; used to unlock inbound enterprise conversations. | Enterprise band 25% -> 45% |
| D6 | **Independent "AI in AU HR" evaluation** commissioned from a university or think-tank (Melbourne Law School, UNSW Human Rights, ACOSS-adjacent). Publish results transparently. | Founder | 3-4 months + $10-25k | Evaluation published; used as trust artefact for enterprise + government inbound. | Kills the "no external audit" objection permanently |

### 4.2 Expert marketplace (deferred to Q1-Q2 2028 per retention brief)

| # | Action | Owner | Effort | Success criteria | Doubt-impact |
|---|---|---|---|---|---|
| D7 | **Vetted expert marketplace** (lawyers, ER consultants, payroll specialists). Only launch once ≥500 paying + 1 part-time ops hire. | Founder + ops hire | 8-12 weeks | Pilot with 5 vetted experts; 20% take rate; margin > 15% net after ops cost. | Completes the wedge for medium band |

---

**P3 total**: ~60 dev-days + 6-8 founder-weeks + ~$25-55k audit/evaluation spend + one ops hire.

---

## Section 5 - Confidence trajectory (the point of the register)

| Milestone | Overall confidence | Micro | Small | Medium | Large |
|---|---|---|---|---|---|
| Today (2026-05-21) | 35% | 25% | 65% | 35% | <10% |
| P0 shipped (early June 2026) | 42% | 45% | 65% | 35% | 10% |
| P1 shipped (end Q3 2026) | 55% | 55% | 75% | 45% | 15% |
| P2 shipped (end Q4 2026) | 72% | 65% | 82% | 60% | 30% |
| P3 shipped (Q1 2028) | 88% | 80% | 90% | 78% | 55% |
| "Almost zero doubt" bar | 90%+ | 85%+ | 90%+ | 85%+ | 65%+ |

**Verdict on "no matter the size"**: with the register above shipped, the "no matter the size" clause becomes defensible at ~88% by Q1 2028 - close to the "almost zero doubt" bar for the SMB spectrum, and honestly acknowledged as "credible entry, not category leadership" at the large-enterprise end. Amending the mission is not required if the P2 + P3 enterprise plumbing ships on schedule. If any of C8-C11 slips, the "no matter the size" clause has to be softened.

---

## Section 6 - Owner load summary

| Owner | P0 (fortnight) | P1 (quarter) | P2 (180 days) | P3 (12-18 mo) |
|---|---|---|---|---|
| **Founder** | 2 days | 4 weeks + review load | 5 weeks + partner conversations | 6-8 weeks + inbound handling |
| **Dev** (Claude Code + you) | 13 days | 45 days | 50 days | 60 days |
| **Copy / marketing** | 3 days | 4 days | 6 days | 8 days |
| **External spend** | $0 | $8-15k (legal review) | $5-10k (SOC gap analysis) | $25-55k (SOC audit + evaluation) |

**Founder critical-path risk**: P1 legal review (B8) has a 4-week lead time. Start the vendor selection this week.

---

## Section 7 - What is deliberately NOT on this register

Called out so it doesn't get sneaked in later:

1. **Expert marketplace before Q1 2028.** Per retention brief §4.1 - graveyard for solo founders.
2. **International expansion.** UK is the natural next market but 2028+.
3. **A sales team.** Solo founder + partner channel only. Enterprise is inbound-only.
4. **Free-forever tier.** Retention brief §2.3 - marketplace $25 SKU is the zero-commitment surface.
5. **A payroll engine.** C7 is a data-sync connector, not payroll processing. Never.
6. **A "save 30% with 3-year contract" experiment.** Damages anti-Employsure positioning.
7. **Fear-based marketing.** Decision-empowerment framing only.

---

## Section 8 - Weekly review cadence

Register lives at this path. Founder + dev reviews weekly. Items marked **done** move to a `## Done` section at the bottom with the ship date. Items that slip get a **why** note attached. Never delete an item - the trail matters when the mission is next stress-tested.

Next review: **28 May 2026**.

End of register.
