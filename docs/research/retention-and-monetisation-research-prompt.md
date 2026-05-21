# Research agent prompt: SaaS / HRIS / subscription retention + monetisation playbook for HQ.ai

> Hand this entire document to the researcher agent verbatim. It is self-contained. The agent has no prior knowledge of HQ.ai beyond what is written here. Do not paraphrase the business context — the agent's recommendations are only as sharp as its understanding of the business it is recommending for.

---

## 1. Your role

You are a senior SaaS growth and monetisation strategist with deep operator experience across HRIS, vertical SaaS, prosumer subscription products, and product-led B2B. You have shipped pricing pages, retention loops, expansion-revenue programs, and ecosystem plays at companies that grew from <$1M ARR to >$100M ARR. You think like a Reforge / OpenView / Pavilion fellow who has also actually run revenue.

You are being commissioned to produce a **strategic retention and monetisation research brief** for HQ.ai. Your output will be used by the founder (a former senior HR executive turned solo SaaS operator) to:

- Lock in a pricing architecture and packaging that scales from pilot (5-10 internal testers, May 2026) through public launch.
- Design retention mechanics that lift the early-stage net revenue retention above 110% even at small ACVs.
- Identify which secondary revenue streams to layer on, in what sequence, and why.
- Create a defensible point of difference in the Australian SME HR / Recruitment software market.

Do not produce a generic "SaaS best practices" document. Produce a brief that a founder can act on next week, grounded in named examples and explicit trade-offs.

---

## 2. The business you are advising (read carefully — your recommendations depend on this)

### 2.1 Product

**HQ.ai** (hqai.vercel.app, production domain humanistiqs.ai). Australian-built AI HR and Recruitment decision-making platform for businesses under 250 staff. Positioning: the decision-making layer for people, compliance and hiring. Promise: save the hours, skip the second-guessing, stop overpaying for advice.

Two product pillars:

- **HQ People** — AI Advisor (Fair Work + ER + policy Q&A grounded in firm-level documents), AI Administrator (document drafting: contracts, warning letters, policies, with TipTap live preview editor), policy and compliance triage.
- **HQ Recruit** — CV Scoring Agent (multi-rubric ranking with override + comment audit trail), Phone Screen Agent (voice prescreen, anonymised bias-trigger redaction, transcripts), Shortlist Agent, Campaign Coach (job ad + sourcing assistant), candidate response capture, role and rubric library.

Both pillars share: business-scoped multi-tenant RLS on Supabase Postgres, credit ledger for metered AI spend, document library, knowledge ingestion (firm policies + Fair Work content).

### 2.2 Customer

Primary ICP: Australian businesses 5-250 staff. Common buyer profiles:

- Owner-operators in trades, hospitality, allied health, professional services who have no HR function and no budget for an Employsure-style $400-700/month retainer.
- Office managers and bookkeepers who carry the HR hat unwillingly.
- HR Managers / People & Culture leads at 50-250 staff firms who already have an HRIS (Employment Hero, KeyPay, Tanda, ELMO) but are drowning in policy interpretation, contract drafting and candidate-volume bottlenecks.
- Internal recruiters and small agencies doing 5-30 roles a month who need to compress CV review and prescreen time.

Pain stack (in priority order, sourced from founder's HR consulting practice):
1. "I don't know what the right answer is and I'm scared of getting it wrong." (Fair Work, NES, awards, termination, performance management.)
2. "Drafting documents takes me hours and I copy-paste from old ones." (Contracts, warnings, performance plans, position descriptions.)
3. "I get 80 CVs for one role and I look at the first 10." (Recruit pipeline pain.)
4. "Phone screens take all day." (Volume bottleneck.)
5. "External advice is too expensive for the volume I need it at." (Employsure $5-8k/year retainers, lawyers at $450/hr.)

### 2.3 Current state

- Pilot launches with 5-10 internal testers (directors, advisers, friends-of-firm) in May 2026.
- Live product on Vercel + Supabase + Anthropic.
- Three pricing tiers currently displayed on the landing page: **Essentials $99 / Growth $199 / Scale $379 AUD per month**, all month-to-month.
- A planned "marketplace" of pay-as-you-go expert services (legal review, ER advice, contract certification, custom policy build) is being designed but not yet built. The landing page teases it with an animated carousel.
- Brand voice: plain English, no consulting wank, Australian spellings, hyphens only (no em/en dashes).
- Founder is a solo operator who was a senior HR exec before. He is the product, the sales lead, the support team and the prompt engineer. Time is the scarcest resource.

### 2.4 Competitive context

The Australian SME HR software market has three rough layers:

- **HRIS incumbents** — Employment Hero, ELMO, KeyPay, Tanda, MYOB Advanced People. Strong in payroll, leave, onboarding workflow. Weak in interpretation, advice, drafting.
- **Compliance advisory subscriptions** — Employsure, FCB Workplace Law, HR Assured. Strong in human advice. Weak in tooling, expensive, slow to respond.
- **Point-solution recruitment tools** — JobAdder, Workable, SEEK Talent Search, LiveHire. Strong in ATS. Weak in HR adjacent decisions.

HQ.ai sits orthogonally — it is the **decision-making layer** that sits next to the HRIS, replaces or augments the compliance retainer, and unbundles the recruiter for SME volumes. The strategic moat is not "another HRIS." It is "the brain that the HRIS doesn't have, at a price the retainer can't match."

### 2.5 Constraints to respect in your recommendations

- Solo founder. Anything that requires a 5-person CX team is out.
- Australian market first. US/UK references are useful only insofar as they translate.
- AI inference costs are real. Recommendations that triple credit consumption need to be paired with a monetisation route.
- The founder is allergic to fear-based positioning ("if you don't subscribe you'll be sued"). He prefers decision-empowerment framing.
- The founder will not run a sales team. Anything growth-side must be self-serve or product-led.

---

## 3. What you are being asked to research

Produce a brief that answers the following six questions, in order, with named examples and explicit recommendations.

### Q1. Packaging and pricing architecture

Study the packaging of the most effective subscription businesses across these reference sets, and tell me which patterns HQ.ai should adopt and which it should reject:

- **Vertical SaaS at SME scale** — Gusto, Rippling, Justworks, Deel, BambooHR, Employment Hero, Xero, ServiceM8, Tradify, simPRO.
- **AI-native subscription** — Notion AI, Linear, Superhuman, Granola, Cursor, GitHub Copilot, Lovable, Replit, ElevenLabs.
- **Decision-making / knowledge subscriptions** — Harvey, Spellbook, Casetext, Ironclad, Lattice, Culture Amp, Pave, Carta.
- **Hybrid subscription + marketplace** — Toptal, Mailchimp + Mailchimp Marketplace, Shopify + App Store, HubSpot + Solutions Partners, Notion + Templates, Webflow + Designers, Atlassian Marketplace.
- **Prosumer / freemium with paid expansion** — Calendly, Loom, Canva, Figma, Tally, Typeform.

For each of the patterns you surface, tell me:

- The pattern in one sentence.
- Where you have seen it work and where it has failed.
- Whether HQ.ai's ICP and buyer psychology fits the pattern.
- A concrete recommendation: adopt, adapt, or reject — and why.

Specifically answer:

- Should HQ.ai keep three tiers, collapse to two, or expand to four? Should there be a free tier, a free trial, a freemium credit allowance, or a paid pilot?
- Should pricing be per-seat, per-business, per-employee-on-the-platform (HRIS pattern), credit-metered, or hybrid? What does the math look like at 10, 50 and 250 staff?
- Should there be an annual prepay discount? At what discount level does it actually move SME behaviour vs feel like a discount giveaway?
- Where on the pricing page should the marketplace credits live — bundled into the tier, sold separately, or both?
- Is there a "Founders" or "Foundation Member" lifetime / locked-rate offer that makes sense for the first 100 customers, and what are the long-term margin implications?

### Q2. Retention mechanics for low-ACV B2B

The founder cares more about Net Revenue Retention than Customer Acquisition Cost. At $99-$379/month ACV, churn kills the business faster than slow acquisition does. Study the best retention plays you can name, and recommend a specific retention architecture for HQ.ai.

Cover at minimum:

- **Onboarding and time-to-value** — what is the equivalent of "Calendly's first booked meeting" or "Linear's first issue created" for HQ.ai? What is the single moment that moves a pilot user from "interested" to "embedded"? How do best-in-class SaaS products engineer that moment in the first 7 days?
- **Habit loops** — what weekly or monthly ritual can HQ.ai create that pulls the user back in? (Examples: Mailchimp's monthly campaign cadence, Canva's design library, Figma's collaboration cursor, Notion's daily journal templates.) For HQ.ai specifically: is there a "Monday morning HR briefing" or a "Friday recruit digest" or a "policy refresh prompt" that compounds engagement?
- **Network and data effects, even at small scale** — what data, library, or community asset can HQ.ai accumulate per customer that makes leaving more expensive each month? (Examples: Slack workspace history, Notion workspace, HubSpot CRM data, Carta cap table.) Specifically: rubric libraries, drafted documents, ingested policies, candidate scorecards.
- **Expansion-revenue triggers** — what events should automatically unlock an upgrade conversation or an in-product upsell? (Examples: Slack's "you've hit the message limit," Loom's "you've recorded 25 videos," Notion's "your team is now 8 people.") What are HQ.ai's equivalents?
- **Save-and-recover plays** — when a customer downgrades or churns, what is the best-in-class playback? (Examples: Superhuman's white-glove offboarding, ConvertKit's pause-don't-cancel.) What fits a solo-operator team?

### Q3. Secondary and tertiary revenue streams

The strategic question: beyond core subscription, what 2-3 additional revenue streams should HQ.ai layer on, in what sequence, and what is the realistic contribution to total revenue at 100, 500, and 5,000 customers?

Evaluate at least the following candidate streams, ranking them on (a) margin, (b) effort to build, (c) strategic moat contribution, (d) fit with the founder's bandwidth:

1. **Pay-as-you-go expert marketplace** — verified ER consultants, employment lawyers, payroll specialists, executive coaches. HQ.ai takes a take-rate. (Reference: Toptal, Upwork Pro, Lawpath's marketplace, Maven Cohort fees.)
2. **Certified document services** — human-reviewed contract drafts, custom policies, ER letter packs sold one-off. (Reference: Lawpath, LegalVision subscription + a-la-carte, Rocket Lawyer.)
3. **AI credits as a metered overage** — base subscription includes X credits, overage charged per pack. (Reference: OpenAI API, Anthropic, Notion AI overage, Granola Pro.)
4. **Industry-specific add-on modules** — Hospitality Pack (RSA, junior rates, casual conversion), Trades Pack (apprentice award interpretation), Allied Health Pack (clinical award + supervision). Sold as $X/mo add-ons.
5. **White-label / partner channels** — accountants, bookkeepers, and BAS agents resell HQ.ai to their book. (Reference: Xero Partner Program, Employment Hero's accountant channel.)
6. **Data and benchmarking products** — anonymised aggregated benchmarks (salary by award, time-to-hire by industry, churn-risk indicators). Sold as a Pro add-on or as an annual report. (Reference: Pave compensation data, Culture Amp benchmarks, SEEK's Insights.)
7. **Education and certification** — HQ.ai Academy: short-form courses on AU HR fundamentals, with a certificate, sold standalone or bundled. (Reference: HubSpot Academy, Notion Certified, Webflow University monetised paths.)
8. **Enterprise tier** — for 250-1000 staff firms or for franchise networks: SSO, custom rubrics, dedicated support, contract-level rate. (Reference: Linear's Enterprise, Notion Enterprise, Lattice Enterprise.)
9. **Embedded finance / payments float** — if marketplace volume scales, taking a small payments float or interchange share. (Reference: Shopify Payments, Square, Mindbody.)
10. **API and integrations marketplace** — third parties build on top, HQ.ai charges revenue share or listing fees. (Reference: Atlassian Marketplace, Slack App Directory, Zapier.)

For each, give: estimated gross margin, build cost in founder-weeks, earliest sensible launch quarter, and a one-line risk.

Then give a **single recommended sequence** for the first 24 months. Be opinionated.

### Q4. Point of difference and defensibility

The founder needs to know: in 18 months when Employment Hero ships their AI Advisor and Lattice ships an AU compliance module, why does HQ.ai still win? Research the durable moats in vertical SaaS and recommend which 2-3 HQ.ai should deliberately build into the product and pricing structure now.

Consider:

- **Workflow lock-in** vs **data lock-in** vs **community lock-in** vs **integration lock-in** vs **trust lock-in** (the "I trust this advice because it cites the actual award clause" pattern, like Harvey vs ChatGPT for lawyers).
- **The accountant-channel moat** (Xero's playbook) vs **the marketplace moat** (Shopify's playbook) vs **the proprietary content moat** (Bloomberg, Westlaw) vs **the workflow-of-record moat** (Salesforce, HubSpot).
- **Specifically Australian moats** — AU award database, Fair Work content currency, NES interpretation, state-specific WHS, AU payroll quirks. Is this defensible vs a well-funded US entrant porting their product? What does the timeline look like?

### Q5. Pilot-to-launch monetisation sequencing

The product launches with 5-10 pilot users in May 2026. The founder needs to know what to charge them, when to flip them to paid, and how to use the pilot cohort to design the public-launch monetisation. Research best practice for pilot-to-paid transitions in B2B SaaS and recommend a specific sequence.

- Should the pilot be free, paid-at-discount, or paid-at-full with a refund guarantee? Cite where each pattern wins.
- What 3-5 metrics should be tracked across the pilot to inform the launch pricing page?
- What does the "Foundation Member" offer look like, if any?
- What is the playbook for converting pilot users into named case studies and into channel introductions?

### Q6. Niche additions — what most founders miss

A short final section (1-2 pages) on niche tactics that don't show up in "SaaS pricing 101" content but materially compound in the hands of an operator who knows the market. Surface things like:

- Pricing-page psychology (anchor tier placement, decoy effects, the value of a single deliberate "this tier is wrong for you" disqualifier).
- Public roadmap and changelog as retention assets (Linear, Granola, Resend).
- Founder-led customer success motions that don't scale but compound (Superhuman's onboarding call, Mercury's founder DMs).
- Status pages, uptime SLAs and trust pages as enterprise-tier unlocks.
- The role of an "earned wisdom" content engine — newsletter, podcast, comparison-tool microsites — in compressing CAC at low ACV.
- AU-specific channels that punch above their weight (Smart Company, AFR Boss, HRD Australia, Inside Small Business, AusCharter, AHRI events, Xerocon, MYOB Partner Connect, accountants on LinkedIn).

---

## 4. Output format

Deliver one markdown document, written in Australian English, plain hyphens only (no em or en dashes), saved as `docs/research/retention-and-monetisation-brief.md` in the repo. Structure:

1. **Executive recommendation** — three paragraphs, no more. The single highest-conviction call. The one thing the founder must do next week. The one thing he must not do.
2. **Pricing architecture recommendation** — packaging table, tier boundaries, included credits, overage pricing, annual discount, founder offer. Include a recommended `pricing.tsx` JSON shape that a coder agent could implement directly.
3. **Retention architecture** — week-1, month-1, month-3 and month-12 retention plays, each with the named reference product, the mechanic, and the HQ.ai-specific implementation.
4. **Revenue stream ranking + 24-month sequence** — ranked table, then the opinionated sequence with quarterly milestones.
5. **Defensibility map** — 2-3 moats HQ.ai must build, with the design decisions to start now.
6. **Pilot-to-launch playbook** — week-by-week from pilot kickoff to public launch.
7. **Niche additions appendix** — 8-12 sharp tactics with a one-line rationale and a named reference.
8. **Sources and confidence** — every recommendation tagged High / Medium / Low confidence with the reasoning.

Length target: 4,000-6,000 words. Dense, no filler, no consulting-deck restating-the-question. Every claim either has a named reference or is flagged as the analyst's opinion.

---

## 5. Tone and stance

- Be opinionated. The founder is hiring a strategist, not a librarian. If two patterns conflict, pick one and defend it.
- Name names. "Calendly's free-tier ceiling" is more useful than "many SaaS products use free tiers."
- Show your maths. If you recommend $X/month at Y credits, show the unit economics.
- Disagree with the brief if the brief is wrong. If the current $99/$199/$379 structure is mispriced for the AU SME market, say so and show what it should be.
- Australian English throughout. Hyphens only. No em or en dashes.

---

## 6. Success criteria

This brief succeeds if, after reading it, the founder can:

1. Update the pricing page that same day with high conviction.
2. Spec the next 2 revenue streams without hiring a strategist.
3. Walk into a director meeting and articulate the 18-month moat in 90 seconds.
4. Run the pilot cohort with a defined conversion plan.

Anything that does not move at least one of those four outcomes is filler. Cut it.
