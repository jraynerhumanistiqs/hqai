# HQ.ai - Pricing Deep Analysis and Unit-Economics Pressure-Test

**Date**: 2026-06-23
**Author**: Senior SaaS pricing and unit-economics analyst (research agent)
**Audience**: Founder (Jimmy Rayner). Solo operator. Pilot mid-2026, public launch ~Q3 2026.
**Currency**: AUD throughout. All competitor figures are ex-GST unless stated.
**Mandate**: Pressure-test and optimise the numbers inside the already-chosen direction (Model B: Solo/Business + credits + no-card trial + one-off marketplace, presented as one ladder One-off -> Self-serve -> HR365, Business as default). This document does NOT relitigate the strategy. It validates the maths and recommends specific numbers.

**Confidence legend**: `[HIGH]` primary-source or well-documented public data | `[MED]` multi-source secondary or well-grounded estimate | `[LOW]` analyst opinion / modelled estimate with no external validation.

**Source-grounding standard**: every load-bearing external number is dated and linked in Section 10. Competitor numbers that could not be verified to a single point are labelled as estimates and the reason is stated. No competitor number is invented.

---

## 0. TL;DR for the founder (read this, then the file)

1. **The COGS model is sound and conservatively over-priced.** At current Anthropic pricing (Sonnet 4.6 $3/$15 per MTok, Haiku 4.5 $1/$5 per MTok, verified 23 Jun 2026), a chat turn costs roughly **$0.012-0.020** in LLM API, not $0.03. The credit-to-action map is, if anything, charging customers slightly *more* margin than the brief assumed. The single real margin leak is the **phone screen (25 credits)** - the video/transcription/storage stack, not the LLM, is where money escapes. Validate that one number with pilot telemetry before launch.

2. **Recommended primary combination: "C3 - Anchored Ladder".** One-off SKUs nudged to a cleaner $29/$39/$49 three-band structure with two bundles; Solo **$89/mo** and Business **$269/mo** (Business raised $20 from $249); annual at 2 months free; HR365 entry unchanged at $1,495/mo. Inclusion metric is **managed-headcount bands with generous fair-use credits, NOT seats.**

3. **Replace "seats" with "managed headcount" (option c), expressed softly.** Seats is the wrong value metric for owner-operators who think "I have a 12-person pub", not "I have 12 logins". Price the plan to the size of the team the business runs in HQ.ai, give unlimited logins, and let credits do the usage-metering. This is the highest-conviction change in this document. **Headcount handles capacity but not demand** - see Section 11 for the demand-based sliding scale (tuned credit allowances + a soft auto-step) that layers on top, and combination C9.

4. **The four biggest financial risks**, in order: (1) the **phone-screen COGS** under-recovery at heavy recruit usage; (2) **DIY-in-chat cannibalising the one-off SKUs** (a customer can ask the chat to draft a letter for ~1-5 credits instead of buying the $25-$49 SKU); (3) **HR365 advisor-utilisation** - if the loaded advisor cost or utilisation assumption is wrong, HQ People's margin can fall below 40%; (4) **credit-allowance generosity on Business** - 2,500 credits is comfortable now but a single heavy phone-screen recruiter can consume it and still be loss-adjacent if overage is not enforced.

5. **UPDATE (founder corrections, see Section 12).** The human layer is **HR365** (HR advisor) and **Recruit365** (recruitment advisor), and **HR365 starts at $799/mo for 3 hours** (not $1,495) - margin ~32% if all 3 hours are used, ~63% in a typical under-used month. And combination **C10** splits the self-serve products: **HQ People $59 / $179** (HR-only, low-friction entry) + a metered **HQ Recruit add-on $40 / $120** + a **bundle that keeps the $89 / $269 anchors**. C10 is the recommended new primary - it lowers the entry AND isolates the one expensive cost (recruit phone screens), while keeping today's headline prices as the "both" bundle.

Everything below is the working.

---

## 1. COGS and gross-margin model

### 1.1 Verified input costs (the foundation)

| Cost input | Rate | Date verified | Confidence | Source |
|---|---|---|---|---|
| Claude Sonnet 4.6 input | $3.00 / MTok USD | 23 Jun 2026 | `[HIGH]` | platform.claude.com/docs, CloudZero, BenchLM |
| Claude Sonnet 4.6 output | $15.00 / MTok USD | 23 Jun 2026 | `[HIGH]` | same |
| Claude Haiku 4.5 input | $1.00 / MTok USD | 23 Jun 2026 | `[HIGH]` | same |
| Claude Haiku 4.5 output | $5.00 / MTok USD | 23 Jun 2026 | `[HIGH]` | same |
| Prompt caching discount | -90% on cached input | 23 Jun 2026 | `[HIGH]` | Anthropic docs |
| Batch processing discount | -50% | 23 Jun 2026 | `[HIGH]` | Anthropic docs |
| Stripe AU domestic card | 1.75% + $0.30, +10% GST = ~1.925% + $0.33 effective | 23 Jun 2026 | `[HIGH]` | Stripe AU, multiple calculators |
| USD->AUD assumed FX | 1 USD = 1.52 AUD | 23 Jun 2026 | `[MED]` | analyst working rate; re-check at launch |

A note on FX: the codebase prices in AUD; Anthropic bills in USD. Every API cost below is computed in USD then multiplied by 1.52. If the AUD weakens to 1.60, LLM COGS rises ~5%; the margins below have enough headroom to absorb that. `[MED]`

Non-LLM COGS inputs (per the stack in CLAUDE.md - Supabase, Cloudflare Stream, Resend, Voyage/Cohere):

| Service | What it costs | Assumed unit cost | Confidence |
|---|---|---|---|
| Cloudflare Stream | storage + delivery of candidate prescreen video | ~$0.005/min stored/mo + ~$0.001/min delivered; a 3-min prescreen answer set (say 4 answers x 2 min = 8 min) ~ $0.05-0.10 lifecycle | `[MED]` est., validate against actual Stream bill |
| Transcription (for phone/video screen scoring) | speech-to-text on the recorded answers | ~8 min audio. If using a Whisper-class API ~$0.006/min = ~$0.05; if Claude processes audio-derived transcript only, near-zero beyond LLM | `[MED]` est. |
| Supabase | DB + auth + storage | effectively fixed platform cost, not per-action; amortise as ~$0.50-$2.00 per active business/mo at small scale | `[LOW]` est. |
| Resend | transactional email | ~$0.0004/email, negligible per action | `[HIGH]` order-of-magnitude |
| Voyage embeddings (voyage-law-2) | knowledge ingestion | ~$0.12/MTok input embedding; a policy doc of ~5k tokens = ~$0.0006 per doc; negligible | `[MED]` |
| Cohere rerank | per-query rerank on RAG | ~$0.001-0.002 per reranked query | `[MED]` |
| Stripe (per paid transaction) | see above | 1.925% + $0.33 effective | `[HIGH]` |

**Key finding**: for the subscription product, non-LLM per-action COGS is dominated by **one action only - the phone/video screen** (Cloudflare Stream + transcription). Every other action's non-LLM cost rounds to noise. The COGS model can therefore be simplified to: "LLM cost + (Stream/transcription only on phone screens) + a small fixed platform overhead per business."

### 1.2 Per-action COGS estimate (the core table)

Assumptions for token sizing (all `[MED]`, to be replaced by pilot telemetry):

- A RAG chat turn = ~6k input tokens (system prompt + retrieved Award/FWA context + history, most of it *cached*) + ~700 output tokens. With 90% caching on the bulk of the system+context, effective input ~1.5k uncached-equivalent.
- A document generation = ~8k input (template + business profile + retrieved clauses) + ~2.5k output.
- A CV score = ~4k input (CV + rubric) + ~600 output.
- A phone screen processed = transcript ~3k input + ~1.2k output for scoring, PLUS the Stream/transcription stack.
- Knowledge ingestion = embedding only, LLM near-zero.
- Award interpretation deep-dive = ~10k input (deeper retrieval + reranker) + ~1.5k output.

Per-action LLM cost, computed at Sonnet 4.6 with caching on the cacheable portion, converted to AUD at 1.52:

| Action | Credits charged | Est. LLM cost (AUD) | Est. non-LLM (AUD) | Est. total COGS (AUD) | Implied $/credit at this action | Confidence |
|---|---|---|---|---|---|---|
| Chat turn (RAG, Sonnet) | 1 | ~$0.012-0.020 | ~$0.001 | **~$0.015** | $0.015 | `[MED]` |
| Document generation | 5 | ~$0.055-0.075 | ~$0.002 | **~$0.07** | $0.014 | `[MED]` |
| CV scored | 3 | ~$0.022-0.030 | ~$0.001 | **~$0.027** | $0.009 | `[MED]` |
| Phone screen processed | 25 | ~$0.025-0.040 | **~$0.10-0.20 (Stream + STT)** | **~$0.18-0.24** | ~$0.008 | `[MED]` - the soft spot |
| Knowledge ingestion (per doc) | 10 | ~$0.001 (embed) | ~$0.001 | **~$0.002** | $0.0002 | `[MED]` |
| Award interpretation deep-dive | 5 | ~$0.045-0.065 | ~$0.003 | **~$0.06** | $0.012 | `[MED]` |

**Reading this table:**

- The brief assumed a chat turn costs "~$0.03 API". At current verified pricing with caching, it is **roughly half that (~$0.015)**. The credit map is conservative in the customer's favour by ~2x on chat. Good - that is margin headroom, not a leak.
- **Knowledge ingestion at 10 credits is wildly over-charged relative to cost (~$0.002).** The brief and the retention doc both argue ingestion should be FREE (it is the moat). Charging 10 credits for a ~$0.002 action is the single most customer-hostile line in the credit map. **Recommendation: make ingestion 0 credits (free), as the retention brief already argued. It costs almost nothing and taxing it taxes your own retention.**
- **Phone screen is the only action where credits under-recover at scale.** 25 credits is the right *relative weight* (it is the dearest action) but the absolute cost is driven by Stream + transcription, which scale with video minutes, not LLM tokens. If a candidate records 12 minutes instead of 8, the cost can hit $0.30+. This is the action to watch.

### 1.3 The effective "price per credit" (the lever that sets all margins)

- **Overage**: $20 buys 500 credits = **$0.04/credit** retail.
- **Solo**: $89/mo includes 500 credits. If the entire $89 were "for credits" (it is not - most is for the platform/advisor value), that is $0.178/credit. The *included* allowance is therefore priced far above marginal cost, which is correct - the subscription is an access fee, not a metered bill.
- **Business**: $249/mo includes 2,500 credits = $0.0996/credit if fully attributed to credits.

Blended marginal COGS per credit across the action mix is **~$0.012-0.015**. So:

- Overage margin: ($0.04 - $0.013) / $0.04 = **~67% gross margin on overage**, before Stripe. The brief's claim of "85%+ on overage" is **too optimistic** - it assumed a lower per-credit cost basis and ignored that overage packs skew toward whatever the heavy user is doing (often phone screens, the dearest action). **Corrected: overage gross margin ~60-70%** `[MED]`. Still healthy, but state it honestly internally.

### 1.4 Per-tier blended monthly COGS at low / median / heavy usage

Usage scenarios (credits consumed/month), with a representative action mix per persona:

**Solo persona** (5-person trades business, light hiring):
- Low: 80 credits (mostly chat + 2 docs). COGS ~$1.30.
- Median: 250 credits (chat habit + a few docs + 1 CV batch). COGS ~$3.70.
- Heavy (at cap): 500 credits, mix includes a phone-screen burst. COGS ~$8-11 (the phone screens drive it).

**Business persona** (30-person allied-health practice, active hiring):
- Low: 600 credits. COGS ~$9.
- Median: 1,500 credits (chat + 20 docs + a recruit round = several phone screens). COGS ~$22-28.
- Heavy (at cap): 2,500 credits, recruit-heavy (say 40 phone screens = 1,000 credits of the 2,500). COGS ~$45-65.

Now the gross-margin table (subscription revenue minus blended COGS minus Stripe ~1.925%+$0.33):

| Tier | Usage | Revenue/mo | Est. COGS/mo | Stripe fee | Gross margin $ | Gross margin % | Confidence |
|---|---|---|---|---|---|---|---|
| Solo $89 | Low | $89 | ~$1.30 | ~$2.04 | ~$85.66 | **96%** | `[MED]` |
| Solo $89 | Median | $89 | ~$3.70 | ~$2.04 | ~$83.26 | **94%** | `[MED]` |
| Solo $89 | Heavy (cap) | $89 | ~$9.50 | ~$2.04 | ~$77.46 | **87%** | `[MED]` |
| Business $269* | Low | $269 | ~$9 | ~$5.51 | ~$254.49 | **95%** | `[MED]` |
| Business $269* | Median | $269 | ~$25 | ~$5.51 | ~$238.49 | **89%** | `[MED]` |
| Business $269* | Heavy (cap) | $269 | ~$55 | ~$5.51 | ~$208.49 | **78%** | `[MED]` |
| Business $269* | **Pathological** (cap of credits ALL in phone screens, no overage charged) | $269 | ~$80-100 | ~$5.51 | ~$163-183 | **61-68%** | `[LOW]` |

*Business modelled at the recommended $269; at the current $249 subtract $20 of margin per row (margins fall ~2-3 percentage points).

**The "Tome failure mode" guard - the usage level where each tier loses money:**

- **Solo loses money only if** a customer consumes roughly **6,000+ credits-worth of phone screens** in a month without buying overage - i.e. ~$89 of COGS. At 500 included credits that is **impossible without the credit cap being bypassed.** The credit cap IS the guard. As long as credits are hard-enforced at the cap and overage is required to continue, **Solo cannot lose money.** `[MED]`
- **Business loses money only if** a customer is allowed to consume far beyond 2,500 credits without overage being charged, AND that consumption is phone-screen-heavy. At the 2,500 cap, even pathological all-phone-screen usage costs ~$80-100, leaving ~60% margin. **Business cannot lose money at the cap either** - the cap is the guard. `[MED]`

**Conclusion on the Tome guard: the model is structurally safe PROVIDED two rules hold: (1) credits are hard-capped and overage is genuinely required to continue past the cap (no silent overruns); (2) the phone-screen credit cost (25) is monitored against real Stream bills in the pilot and raised to 30-35 if video minutes run long.** The danger is never the chat power-user (chat is cheap); it is uncapped phone screens. `[MED]`

### 1.5 The one number to fix before launch

Re-derive the phone-screen credit cost from pilot data. If median prescreen video length x candidates pushes Stream+STT above ~$0.25/screen, raise it from 25 to 35 credits, OR cap video answer length to 90 seconds/question in the product. This is the only action whose absolute COGS can drift with customer behaviour rather than with token sizing. `[MED]`

---

## 2. One-off documents (the marketplace wedge)

### 2.1 Cost-to-serve per SKU

A one-off document is a single document-generation action (~$0.07 LLM+render COGS, Section 1.2) plus a Stripe fee on a one-off charge.

| Sale price | Stripe fee (1.925% + $0.33) | LLM/render COGS | Net contribution | Gross margin % |
|---|---|---|---|---|
| $25 | ~$0.81 | ~$0.07 | ~$24.12 | **96.5%** |
| $29 | ~$0.89 | ~$0.07 | ~$28.04 | **96.7%** |
| $35 | ~$1.00 | ~$0.07 | ~$33.93 | **97.0%** |
| $39 | ~$1.08 | ~$0.07 | ~$37.85 | **97.1%** |
| $45 | ~$1.20 | ~$0.07 | ~$43.73 | **97.2%** |
| $49 | ~$1.27 | ~$0.07 | ~$47.66 | **97.3%** |

Every SKU is **>96% gross margin.** The constraint on one-off pricing is therefore **not cost - it is willingness-to-pay, anchoring, and cannibalisation.** Price these on value and competitor anchors, never on cost.

### 2.2 Competitor anchors (verified where possible)

- **Lawpath** `[HIGH on subscription, LOW on single-doc point price]`: Lawpath is **subscription-led**, not a clean a-la-carte shop. Verified plans (23 Jun 2026): Essentials ~$99/mo monthly or ~$29/mo on annual; a documents+lawyer bundle ~$39/mo on a 12-month annual contract; 500+ templates included; bundle discounts up to 40%. Lawpath offers many templates *free to start* and monetises via the subscription and lawyer add-ons. **I could not verify a single fixed one-off per-document price for Lawpath** - their public model does not headline one. The retention brief's claim "no incumbent sells a single AU-compliant HR document for under $48 - Lawpath does" should be **treated as directional, not as a verified $48 point price.** The honest competitive statement is: "Lawpath makes you subscribe (from ~$29-39/mo on annual) or upsells a lawyer; HQ.ai sells you exactly one compliant document for a one-off fee, no signup." `[HIGH for that framing]`
- **Legal123** `[MED]`: sells individual lawyer-drafted templates as one-time purchases (named as a Lawpath alternative in search). Точный price not verified; positioned as fixed-fee one-off templates, typically tens-to-low-hundreds of dollars for AU legal templates. Use as evidence that "one-off legal/HR templates at a fixed price" is a real, accepted AU pattern - not as a specific anchor number.
- **Generic AU "free template" sites** (LawDepot, legal templates aggregators): free or low-cost but **not Fair-Work-current and not drafted-from-your-inputs.** These set the *floor* and are exactly what HQ.ai's "compliant, drafted from your answers, citation-backed" framing must beat. The substitution risk from free templates is real but addressable by trust/compliance framing. `[MED]`

**Net competitive read**: HQ.ai's one-off is differentiated less on price than on (a) no-signup friction, (b) Fair-Work-current + cited, (c) drafted from the buyer's actual inputs in 3 minutes. The price band $25-$49 sits credibly *below* a Lawpath annual commitment's monthly cost for low-frequency buyers and *above* free templates, which is the correct wedge. `[MED]`

### 2.3 The real elasticity threat: DIY-in-chat cannibalisation

This is the most important point in this section and a top-4 financial risk.

A subscriber (or even a determined visitor, once subscribed) can ask the chat: "draft me a letter of offer for a casual bartender on the Hospitality Award" and receive substantially the same artefact for **1-5 credits (~$0.07 COGS, ~$0.20-0.50 of their credit allowance)** rather than paying $25-$49 for the one-off SKU.

Implications:
- For **non-subscribers** the one-off SKU is safe: there is no chat to DIY in without signing up, and signup-then-trial is itself the funnel you want. The $25 no-signup Letter of Offer remains the cheapest CAC machine. `[HIGH]`
- For **subscribers**, the one-off SKUs are *already included value* via the document generator. You should NOT try to sell a Business subscriber a $25 one-off - that is double-charging and erodes trust. The one-off marketplace is an **acquisition surface for the unsubscribed**, not a revenue line you defend against your own paying base. `[MED]`
- **Therefore**: position one-offs as the front door (no-signup, pay once), and let the document generator be an unlimited included feature inside subscriptions. The cannibalisation "risk" is actually the intended ladder: one-off buyer feels the friction of paying per document, sees "unlimited documents from $89/mo", climbs. Do not fight it; instrument it. Track one-off-buyer -> trial conversion as a headline funnel metric. `[MED]`

The residual risk: a sophisticated buyer subscribes to Solo ($89) purely to generate 30 documents they would otherwise have bought one-off ($750+), then churns. This is **fine** - they still paid $89, the COGS is ~$4, and most will not churn cleanly because the library/lock-in accrues. Do not engineer against it. `[LOW]`

### 2.4 Recommended price per SKU (tested range + single point)

Current prices are already well-chosen. I recommend a **light rationalisation into three clean psychological bands** ($29 / $39 / $49) so the page reads as a tidy menu rather than ten scattered numbers, while keeping the $25 hero entry point. Rationale: clustering at 3 price points reduces choice friction and makes bundles legible; the margin is ~97% at every point so the move is pure positioning.

| SKU | Current | Tested range | **Recommended point** | Reasoning |
|---|---|---|---|---|
| Letter of Offer | $25 | $25-$35 | **$25 (keep)** | The hero loss-leader / no-signup wedge. Do not raise. It is CAC, not revenue. |
| Resignation Acceptance | $25 | $25-$29 | **$29** | Low-stakes but still drafted-from-inputs; align to the $29 floor band. |
| Reference Check Request | $25 | $25-$29 | **$29** | Same. |
| Position Description | $29 | $29-$35 | **$29 (keep)** | Correct. |
| Casual Conversion Letter | $29 | $29-$39 | **$39** | Higher legal sensitivity (casual conversion is a compliance minefield); buyers pay for safety. |
| First-and-Final Warning | $35 | $35-$45 | **$39** | Disciplinary doc, real consequence-cost if wrong; supports a premium. |
| Probation Outcome | $35 | $35-$39 | **$39** | Align to mid band. |
| PIP | $39 | $39-$49 | **$49** | A PIP is a multi-section, high-value artefact; closest to "I'd pay a consultant for this." |
| Termination Letter | $45 | $45-$59 | **$49** | Highest-stakes single doc; the buyer's alternative is an unfair-dismissal claim. Defensibly the top of the band. |
| Employment Contract | $49 | $49-$69 | **$59** | A full contract is the single highest-value artefact and a Lawpath subscriber's main reason to subscribe; $59 still undercuts a 12-month Lawpath commitment for a one-time need. **Strongest case for an increase.** |

Net effect: a slightly steeper, cleaner ladder from $25 to $59. Blended ASP rises modestly; margin unchanged at ~97%. `[MED]/[LOW]` - these are anchored estimates; A/B the Employment Contract and Termination points first since they carry the most revenue per sale.

### 2.5 Bundle plays (2-3)

Bundles raise average order value and pre-stage the subscription ladder. All near-100% margin.

1. **"Hiring Pack" - $79** (vs $25+$29+$59 = $113 a la carte, ~30% saving). Letter of Offer + Position Description + Employment Contract. The complete "I'm hiring someone" job-to-be-done. This is the highest-intent bundle and the most natural trial trigger ("hiring more than once? unlimited from $89/mo").
2. **"Exit Pack" - $79** (vs $39+$49+$25 = $113). First-and-Final Warning + Termination Letter + Resignation Acceptance. The "I have a problem employee" job. High emotional willingness-to-pay.
3. **"Document 3-pack - $69, any three"** flexible bundle. Lowers commitment, raises AOV vs single, and is the simplest to merchandise. Use as the default upsell on any single-SKU checkout ("add 2 more for $44").

Each bundle checkout page should carry a single line: "Buying more than a few? Business includes unlimited documents for $269/mo." That line is the one-off -> self-serve rung. `[MED]`

---

## 3. Self-serve tiers (Solo / Business)

### 3.1 Recommended prices

| | Solo | Business (default) |
|---|---|---|
| **Monthly** | **$89** (keep) | **$269** (raise from $249) |
| **Annual (2 months free)** | **$890/yr** = $74.17/mo equiv (keep) | **$2,690/yr** = $224.17/mo equiv |
| **Foundation 100 locked** | n/a | **$189/mo** (raise from $179 to preserve the same ~30% discount off the new $269) |

**Why raise Business to $269 and not Solo:**
- Margins (Section 1.4) show Business has the most headroom and is the tier you *want* customers to land on. A $20 lift is ~8% and is invisible against the "$850/mo Employsure retainer" anchor.
- It widens the Solo->Business gap to $180, which makes Solo feel like genuine value and Business feel like the serious choice - the decoy spread the brief wants.
- $89 Solo is a psychologically clean sub-$100 entry; do not touch it. It is the friction-reduction rung.
- Keep the Foundation discount proportional: $189 off $269 is the same "lock the serious plan cheap" promise; raising the locked rate $10 protects ~$12k of lifetime ARR across 100 members for no perceived cost (the anchor moved up too).

If the founder prefers zero change to live numbers, **$249 is acceptable** - it is still 89% margin at median. The $269 recommendation is an optimisation, not a fix.

### 3.2 What is included at each tier (with the seats question answered - see Section 4)

| | **Solo** | **Business** (default) |
|---|---|---|
| Headline | $89/mo or $890/yr | $269/mo or $2,690/yr |
| **Inclusion metric** | Up to **25 employees managed** in HQ.ai | Up to **150 employees managed** in HQ.ai |
| Logins (people who can use it) | **Unlimited** | **Unlimited** |
| AI HR Advisor (cited) | Yes | Yes |
| Document generation | Unlimited (fair use) | Unlimited |
| Document library | Unlimited | Unlimited |
| Knowledge ingestion (your policies) | **Free / unlimited** | **Free / unlimited** |
| Award interpreter | Yes | Yes |
| HQ Recruit | 1 active role | Unlimited active roles |
| Included AI credits/mo | 500 | 2,500 |
| Overage credits | $20 = 500 | $20 = 500 |
| Advisor escalation | Pay-as-you-go $80/session | 2 included/mo, then $60 |
| Founder onboarding call | No | Yes (30 min) |
| Support | Email | Priority Slack |
| Anchor message | "Replace your DIY policy file" | "One platform instead of a $1,500/mo retainer" |

Two changes from the live config beyond price:
1. **"Seats: 3/15" becomes "employees managed: 25/150" with unlimited logins** (full rationale Section 4).
2. **Document library and knowledge ingestion are unlimited and free on BOTH tiers** (the live config already gives Business unlimited docs but caps Solo at 100; and ingestion is currently a 10-credit charge). Making both free/unlimited removes a customer-hostile cap and a self-defeating tax on the retention moat. The fair-use safety valve is the credit allowance, not document counts. `[MED]`

### 3.3 The friction-reduction lens and the climb

- **Entry friction**: $25 no-signup one-off -> 14-day no-card trial (Business features, 200 credits) -> $89 Solo. Three descending-friction rungs before any real commitment. Keep all three. `[HIGH]`
- **The climb to Business**: triggered by (a) hitting the 1-active-role recruit cap, (b) crossing the 25-managed-employee band, (c) credit overage signalling heavy use. Each is an in-product upgrade prompt, not a sales call. `[MED]`
- **The climb to HR365**: triggered when a Business customer repeatedly buys advisor escalations OR crosses ~150 managed employees OR asks for done-for-you recruiting. See Section 5.4.

---

## 4. The seats question (the critical decision)

The founder is not sold on seats. Correctly. Here is the full evaluation.

### 4.1 Why "seats" is the wrong value metric for THIS ICP

1. **Mental model mismatch.** An owner-operator thinks "I run a 12-person pub", not "I bought 12 SaaS seats". Seats force the buyer to translate their world into your billing unit. Friction at the exact moment of purchase. `[MED]`
2. **It punishes the wrong thing.** HR software is most valuable when *more* people in the business touch it (the manager, the 2IC, the bookkeeper). Charging per seat discourages the very adoption that drives retention and stickiness. `[MED]`
3. **It is gameable and feels mean.** A 15-person business shares one login to dodge a seat cap. Now your usage data is wrong and the customer feels nickel-and-dimed. `[MED]`
4. **It does not track cost.** Cost tracks *actions* (credits) and, loosely, *business size*. It does not track logins. A pricing metric should correlate with either value delivered or cost incurred; seats correlate with neither for this product. `[HIGH - first-principles]`
5. **It collides with the anti-Employment-Hero wedge.** Employment Hero charges per employee. HQ.ai's sharpest sword is flat, predictable pricing. Per-seat is per-employee's confusing cousin and blunts the same sword. `[MED]`

### 4.2 The six alternatives, scored for this ICP

Scoring 1-5 on five criteria: ICP-fit (matches owner-operator mental model), value-alignment (tracks value delivered), margin-safety (caps the Tome failure mode), simplicity (legible on a pricing page), expansion (creates natural upgrade triggers). Max 25.

| Model | ICP-fit | Value-align | Margin-safety | Simplicity | Expansion | Total | Verdict |
|---|---|---|---|---|---|---|---|
| **(a) Per-business flat / unlimited seats** | 5 | 3 | 2 | 5 | 1 | **16** | Simple, ICP-friendly, but no expansion lever and no margin guard - a 200-person firm pays the same as a 6-person one. |
| **(b) Credits-only (pure usage, no caps)** | 2 | 5 | 4 | 2 | 4 | **17** | Best value-alignment and margin-safety, but owner-operators hate variable bills (the brief's own "reject Replit/Cursor metered" finding). Anxiety kills conversion. |
| **(c) Managed-headcount bands** | 5 | 4 | 4 | 4 | 5 | **22** | **Winner.** Matches "I have a 12-person pub", scales price with business size (a fair value proxy), gives clean upgrade triggers at band edges, stays a flat predictable monthly. |
| **(d) Per-active-recruit-role** | 3 | 4 | 3 | 3 | 4 | **17** | Good as a *secondary* lever (it already gates Solo at 1 role) but too narrow to be the primary metric - it ignores the HR-advisory half of the product. |
| **(e) Feature/module gating** | 4 | 2 | 2 | 3 | 3 | **14** | Useful garnish (founder call, priority support) but as the primary metric it invites "I only need feature X" haggling and caps nothing on cost. |
| **(f) Hybrid: flat base + credits + soft fair-use** | 4 | 5 | 5 | 3 | 4 | **21** | Strong runner-up and in practice the *mechanism* underneath (c). The base tracks size, credits track usage, fair-use catches abuse. |

### 4.3 Recommendation: managed-headcount bands (c), implemented as hybrid (f)

**The structure**: price the plan by the number of employees the business manages in HQ.ai, give unlimited logins, and let credits meter actual usage with overage as the margin guard. This is option (c) on the surface and option (f) under the hood - they are the same design described at two altitudes.

> **Pointer**: managed-headcount fixes *capacity* but not *demand* - two same-size businesses can extract very different value and incur very different COGS. See **Section 11 (Demand-based sliding scale for self-serve)** for how the credit allowance, which already sits underneath this metric, is tuned to do the demand-pricing work, plus combination **C9**.

Why this beats the runners-up:
- vs (a) flat: keeps a fair, legible expansion lever (bigger team -> higher band) without per-employee punishment, because the bands are wide and few.
- vs (b) credits-only: preserves the predictable flat monthly that owner-operators demand; credits sit in the background as the fair-use valve, not the headline bill.
- vs (f) raw hybrid: "managed headcount" is the *expressible* version of hybrid. Customers can read "up to 25 employees" instantly; they cannot read "flat base plus credits plus soft fair-use" without a paragraph.

**The bands** (deliberately few and wide so the page stays simple and the metric never feels punitive):

| Band | Solo / Business | Managed employees | Monthly |
|---|---|---|---|
| Solo | Solo | up to 25 | $89 |
| Business | Business | up to 150 | $269 |
| (above 150) | -> HR365 conversation | 150+ | sales-assisted |

Two bands, one overflow into HR365. That is the entire schedule. No per-employee maths, no seat counting, unlimited logins.

### 4.4 How to express it on the pricing page

- Replace the "3 seats / 15 seats" line with **"For teams up to 25" (Solo) and "For teams up to 150" (Business)**.
- Add one reassurance line under each: **"Unlimited logins. Invite your whole team - managers, your bookkeeper, whoever. You're never charged per person."** This line is itself a competitive jab at Employment Hero's per-employee model and should be A/B tested as a conversion driver. `[MED]`
- Keep credits visible but secondary: "Includes 500 AI actions/month" (translate "credits" into "AI actions" in customer-facing copy - "credits" is jargon; "actions" is plain). A small "what's an action?" tooltip explains chat/doc/CV/screen. `[LOW]`
- The "managed employees" count is soft fair-use, not a hard meter you bill against - if a Solo customer hits 28 employees, you prompt an upgrade, you do not lock them out mid-month. Hard locks are reserved for the credit cap (the real cost driver). `[MED]`

**One implementation caution**: "managed employees" must map to a real, countable object in the product (e.g. employee records / the people the business has set up). If that object does not exist yet, the simplest launch-day version is to ship it as **"For teams up to N"** *guidance copy* with unlimited logins and credits as the only hard meter, then add a soft headcount counter later. Do not block launch on building a headcount-metering system. `[MED]`

---

## 5. HR365 (the done-for-you human + AI layer)

### 5.1 Assumed advisor unit economics

These are the load-bearing assumptions; all flagged and adjustable.

- **Loaded cost of a Humanistiqs advisor**: an experienced AU HR advisor / ER consultant has a market salary of ~$110k-$140k. Loaded (super, on-costs, tooling, overhead) at ~1.4x = **~$165k-$195k/yr**. Take **$180k/yr loaded** as the working figure. `[MED]`
- **Productive/billable hours**: a full-time advisor has ~1,800 working hours/yr; realistic *client-facing* utilisation for an advisory role (not pure billing) is **~60%** = ~1,080 client hours/yr. `[MED]`
- **Loaded cost per client-facing hour** = $180,000 / 1,080 = **~$167/hr.** This is why the published overage rate of **$250/hr** (in pricing-config) is sound - it carries a ~33% margin even on marginal advisor time. `[MED]` Good - that number checks out.

### 5.2 Gross margin per HR365 plan

Estimate the advisor *time* each plan consumes per month, cost it at ~$167/hr loaded, add AI/platform COGS (small - the AI admin layer is the cheap part), subtract Stripe.

**HQ People - $1,495/mo (annual):** included scope ~ 2x 45-min advisory calls + same-business-day Slack/email + a quarterly 90-min health check (amortise ~0.5 hr/mo) + quarterly roadmap call (~0.25 hr/mo). Realistic monthly advisor load ~ 1.5 calls-worth + responsive comms ~ **3-5 advisor hours/mo**.

| Advisor hours/mo | Advisor cost | AI/platform COGS | Stripe (~1.925%) | Gross margin $ | Gross margin % |
|---|---|---|---|---|---|
| 3 hrs | ~$500 | ~$30 | ~$29 | ~$936 | **63%** |
| 4 hrs | ~$668 | ~$30 | ~$29 | ~$768 | **51%** |
| 5 hrs | ~$835 | ~$30 | ~$29 | ~$601 | **40%** |
| 6 hrs (over-served) | ~$1,002 | ~$30 | ~$29 | ~$434 | **29%** |

**Reading**: HQ People is healthy at 3-4 advisor hours/mo (~50-63% margin) but **falls below 40% at 5+ hours.** The 40% line is at ~5 advisor hours/month. **This is the third-biggest financial risk in the business**: if advisors over-serve (and good advisors over-serve), HQ People margin erodes fast. Mitigations: (a) the 2x scheduled-call structure is the cap - hold the line and push extra time to the $250/hr overage; (b) use the AI layer aggressively for the admin 80% so advisor hours stay on the high-value 20%; (c) monitor advisor-hours-per-account weekly. `[MED]`

**HQ Recruit - $2,995/mo (annual):** a Talent Partner running up to 4 active roles + weekly status calls + calibration + shortlist delivery is **far more advisor-time-intensive** - realistically **~12-20 partner hours/mo** across 4 roles in flight.

| Partner hours/mo | Partner cost | AI/platform COGS | Stripe | Gross margin $ | Gross margin % |
|---|---|---|---|---|---|
| 12 hrs | ~$2,004 | ~$50 | ~$58 | ~$883 | **29%** |
| 15 hrs | ~$2,505 | ~$50 | ~$58 | ~$382 | **13%** |
| 18 hrs | ~$3,006 | ~$50 | ~$58 | ~-$119 | **-4%** |

**Reading**: HQ Recruit at $2,995 is **margin-thin and can go negative if partner hours exceed ~17/mo.** A recruiter running 4 concurrent roles seriously will exceed that. **This plan is priced like a software plan but delivered like a recruiting service**, and recruiting services are labour-bound. Either (a) it should be priced higher (~$3,495-$3,995 to hold a 40% margin at 15 partner hours), (b) the "4 active roles" inclusion should be tightened to 2-3, or (c) the value story should lean on the per-placement and per-role overage ($750/role, $8,500 exec search) doing the real margin work while the base just covers the relationship. **Recommendation: keep the $2,995 headline for positioning but treat the role-overage and placement fees as the actual profit engine, and cap base inclusion at 3 concurrent roles, not 4.** The annual contract structure (and the 12-month lock) is what makes the labour planning viable. `[MED]`

**Full - $3,995/mo (annual):** People + Recruit combined under one partner team. Advisor+partner load ~15-22 hours/mo combined.

| Combined hours/mo | Labour cost | COGS+Stripe | Gross margin $ | Gross margin % |
|---|---|---|---|---|
| 15 hrs | ~$2,505 | ~$135 | ~$1,355 | **34%** |
| 18 hrs | ~$3,006 | ~$135 | ~$854 | **21%** |
| 22 hrs | ~$3,674 | ~$135 | ~$186 | **5%** |

**Reading**: Full is the **thinnest-margin plan** because it bundles the two most labour-intensive services at a discount to buying both ($3,995 vs $1,495+$2,995 = $4,490). The bundle discount is ~11% but the labour does not discount. **At 18+ combined hours it dips below 21%.** Mitigation: the bundle should be sold to businesses whose *combined* need is below the sum of two full engagements (i.e. they are not simultaneously running 4 hot roles AND consuming 5 advisory hours). Qualify for it; do not sell it to the highest-need accounts. `[MED]`

### 5.3 Multiplier schedule sanity-check

The published schedule (headcount +$400/$300/$650, volume +$750/$1,500, entity +15%/+25% on base) is **directionally correct** because the uplifts roughly track the extra advisor labour that more headcount / more roles / more entities generate. Two observations:

1. **The entity uplift (% of base only) is generous to the customer.** A 3-entity, 220-staff, 65-roles/yr Full customer lands at ~$5,994/mo (per the worked example in config). Given Full's thin base margin, the uplifts are what restore profitability - so the schedule is *necessary*, not optional, to keep large HR365 accounts above 40%. Keep it. `[MED]`
2. **Volume uplift on Recruit/Full (+$750 for 5-6 concurrent, +$1,500 for 7-8) is the single most important margin protector** because concurrent roles are the dominant labour driver. Sanity-check: +$750 for ~1-2 extra concurrent roles ~ covers ~4-5 partner hours/mo at $167 loaded - roughly right. `[MED]`

The schedule is sound. The risk is not the schedule; it is base-plan over-service (Section 5.2).

### 5.4 Converting a Business customer up to HR365

The bridge from $269 Business to $1,495+ HR365 is a 5.5x price jump and needs an in-between behavioural ramp, not a cold sell:

1. **Escalation frequency is the primary signal.** A Business customer who buys advisor escalations 2-3 months running ("then $60/session") is telling you they want a human on retainer. Trigger: "You've used 6 advisor sessions in 3 months ($360). HQ People gives you a named advisor on call for $1,495 - and the AI keeps doing the admin." `[MED]`
2. **Managed-headcount band crossing.** Crossing 150 managed employees auto-routes to an HR365 discovery conversation (this is the natural top of the self-serve ladder). `[MED]`
3. **Recruit intensity.** A Business customer running many concurrent roles and consuming heavy phone-screen credits is a HQ Recruit candidate - the message is "stop running this yourself; have a Talent Partner do it." `[MED]`
4. **The inaugural concession** ($200/mo off for first 5, for a case study) is the right tool to get the first reference accounts - keep it. `[HIGH on mechanism]`

---

## 6. Pricing combinations (named, end-to-end)

Each combination is a full ladder. All share the no-card 14-day trial and the credit primitive; they differ on one-off pricing, self-serve prices, the inclusion metric, and HR365 entry. Trade-offs are attraction/retention vs profitability.

### C1 - "Live Baseline" (do nothing)
- One-off: current 10 SKUs $25-$49.
- Self-serve: Solo $89 / Business $249, gated by **seats 3/15**, credits 500/2,500.
- HR365 entry: HQ People $1,495.
- **Trade-off**: zero implementation risk; but keeps the seats metric the founder distrusts, leaves the ingestion-credit tax in place, and leaves $20/mo of Business margin on the table. Attraction OK, profitability OK, but suboptimal on the metric that matters most (seats). **Baseline, not recommended.**

### C2 - "Seats-Killer Minimal"
- One-off: unchanged $25-$49.
- Self-serve: Solo $89 / Business $249 (unchanged prices), but **seats -> managed-headcount 25/150, unlimited logins**, ingestion free.
- HR365 entry: $1,495.
- **Trade-off**: smallest change that fixes the founder's actual objection. No price risk at all. Highest attraction (unlimited logins is a great page line), neutral profitability. **Safe pick if the founder wants one change only.**

### C3 - "Anchored Ladder" (PRIMARY RECOMMENDATION)
- One-off: rationalised to $25/$29/$39/$49/$59 bands (Section 2.4) + Hiring Pack $79, Exit Pack $79, 3-pack $69.
- Self-serve: Solo **$89** / Business **$269**, **managed-headcount 25/150, unlimited logins**, credits 500/2,500, ingestion free, both tiers unlimited documents.
- Foundation 100: $189 locked.
- HR365 entry: $1,495 (People), with Recruit base inclusion tightened to 3 concurrent roles.
- **Trade-off**: best balance. Fixes the metric, fixes the ingestion tax, captures the Business margin headroom, cleans up the one-off menu, and tightens the one genuinely thin HR365 inclusion. Attraction high (unlimited logins, clean one-off menu, bundles), profitability improved on every line. Modest implementation: price changes + metric swap + bundle SKUs. **Recommended.**

### C4 - "Aggressive Acquisition"
- One-off: drop hero to keep $25 Letter of Offer, add a **$0 / free** "Casual vs Permanent checker" or "Award finder" no-signup tool as pure CAC; one-offs otherwise as C3.
- Self-serve: Solo **$79** (cut to maximise top-of-funnel) / Business $249, managed-headcount, unlimited logins.
- HR365 entry: $1,495.
- **Trade-off**: maximises gross adds and trial volume; sacrifices ~$10/mo Solo margin and trains a cheaper anchor. Good if the binding constraint is *getting the first 200 logos*; bad for blended ARPU and for the "serious tool" positioning. Attraction highest, profitability lowest of the serious options. **Use only if pilot conversion is starving.**

### C5 - "Margin-First"
- One-off: C3 bands but Employment Contract $69, Termination $59, PIP $49 (top of every range).
- Self-serve: Solo **$99** / Business **$299**, managed-headcount, credits *reduced* to 400/2,000 (tighter allowance -> more overage revenue).
- Foundation: $199 locked.
- HR365 entry: HQ People $1,695, Recruit $3,495, Full $4,495 (re-priced to hold 40%+ at realistic labour).
- **Trade-off**: best unit economics and the only combination where HR365 Recruit/Full are comfortably above 40% margin at realistic advisor hours. But Solo crosses the psychological $100 line, tighter credits risk overage-anxiety, and higher HR365 prices slow enterprise conversion. Profitability highest, attraction lowest. **The right answer if HR365 over-service proves real in the pilot.**

### C6 - "Credits-Forward"
- One-off: C3.
- Self-serve: Solo $89 / Business $269, **no headcount metric at all - pure "unlimited everything, fair-use credits"** (500/2,500), overage the only meter.
- HR365 entry: $1,495.
- **Trade-off**: simplest possible page ("one price, unlimited team, fair-use AI"). Cleanest story, but loses the band-crossing upgrade trigger and the size-based fairness (a 200-person firm pays the same $269 as a 10-person one until they self-select into HR365). Attraction very high, expansion lever weaker. **Strong alternative to C3 if the founder wants maximum page simplicity and is willing to lose the headcount upgrade trigger.**

### C7 - "Recruit-Weighted"
- One-off: C3.
- Self-serve: Solo $89 (1 active role) / Business $269 (3 active roles, not unlimited) / **new "Business+ $399" (unlimited roles + 5,000 credits)**, managed-headcount.
- HR365 entry: HQ Recruit $2,995.
- **Trade-off**: re-introduces a third self-serve tier specifically to capture recruit-heavy SMEs before they jump to the $2,995 HR365 Recruit. Captures a real gap (the brief itself notes phone screens are the dearest action and recruit-heavy users are the margin risk). But adds page complexity the brief explicitly argued against ("two tiers, not three"). Profitability good on recruit users, attraction neutral, simplicity worse. **Defer; revisit if recruit-heavy churn-to-HR365 shows a missing rung.**

### C8 - "Foundation-Led Launch"
- One-off: C3.
- Self-serve: C3 prices, but the **public launch leads with Foundation 100 ($189 locked Business)** as the hero, standard pricing secondary.
- HR365 entry: $1,495 with the $200 inaugural concession prominent.
- **Trade-off**: maximises early-cohort commitment and case-study generation (the marketing weapon). Front-loads discount (100 x ~$80/mo haircut) but buys references and word-of-mouth. This is a *go-to-market* overlay on C3 rather than a different price architecture. Attraction high among serious buyers, profitability deferred. **Run C3 as the architecture and C8 as the launch motion - they are compatible.**

### 6.1 Combination comparison

| Combo | One-off | Solo | Business | Inclusion metric | HR365 entry | Attraction | Retention | Profitability | Implementation |
|---|---|---|---|---|---|---|---|---|---|
| C1 Baseline | $25-49 | $89 | $249 | seats 3/15 | $1,495 | Med | Med | Med | None |
| C2 Seats-Killer | $25-49 | $89 | $249 | headcount 25/150 | $1,495 | High | High | Med | Low |
| **C3 Anchored (PRIMARY)** | $25-59 + bundles | $89 | $269 | headcount 25/150 | $1,495 | High | High | High | Med |
| C4 Aggressive | $25-59 + free tool | $79 | $249 | headcount | $1,495 | Highest | Med | Low-Med | Med |
| C5 Margin-First | $25-69 | $99 | $299 | headcount, tighter credits | $1,695 | Med | Med | Highest | Med |
| C6 Credits-Forward | $25-59 | $89 | $269 | none (fair-use) | $1,495 | Very High | High | Med-High | Low |
| C7 Recruit-Weighted | $25-59 | $89 | $269 (+$399 tier) | headcount | $2,995 | Med | High | High (recruit) | High |
| C8 Foundation-Led | $25-59 | $89 | $269 ($189 Fdn hero) | headcount | $1,495 | High | Highest | Med (deferred) | Med (GTM only) |
| **C10 Split + Bundle (see Sec 12)** | $25-59 + bundles | People $59 / Bundle $89 | People $179 / Bundle $269 | headcount + product split | HR365 $799 | Highest | High | High | Med-High |

### 6.2 Primary recommendation and reasoning

**Adopt C3 (Anchored Ladder) as the architecture, run C8 (Foundation-Led) as the launch motion.**

Reasoning:
1. **It fixes the founder's real objection** (seats) with the highest-scoring alternative (managed-headcount, 22/25) expressed in plain owner-operator language with unlimited logins as a competitive jab.
2. **It captures every safe margin gain** identified in the COGS work: +$20 Business (invisible against the retainer anchor, ~89% margin at median), free ingestion (removes a self-defeating tax for ~$0.002 cost), and a cleaner, slightly steeper one-off menu (~97% margin, pure positioning).
3. **It keeps the ladder legible**: $25 one-off -> $79 bundle -> trial -> $89 Solo -> $269 Business -> $1,495 HR365. Six rungs, each with a real upgrade trigger.
4. **It is implementable without new infrastructure**: managed-headcount can launch as "for teams up to N" guidance copy with credits as the only hard meter, deferring a true headcount-metering build.
5. **It defers the two riskier moves** (cutting Solo to $79; re-pricing HR365 up) until pilot data says they are needed - C4 and C5 remain on the shelf as data-driven contingencies.

The one place C3 should be watched and possibly upgraded toward C5: **HR365 Recruit/Full margins.** If pilot/early-HR365 data shows partner hours routinely above 15/mo, move those two SKUs to the C5 prices ($3,495 / $4,495) - they can be raised without touching the self-serve story.

---

## 7. Recommended pricing-config.ts delta (appendix for an engineer)

This describes the delta only. It does NOT modify code. If C3 is adopted, an engineer would change `lib/pricing-config.ts` as follows.

**Tiers - Solo:**
- `seats: 3` -> remove the seats concept. Add `managedEmployeesIncluded: 25` (new field) and `unlimitedLogins: true` (new field).
- Features array: replace `'Document library (100 docs)'` with `'Unlimited document library'`; add `'Unlimited logins - never charged per person'`; keep `'500 AI credits/month'` but consider customer-facing relabel to "500 AI actions/month".
- Price unchanged ($89 / $890).

**Tiers - Business:**
- `priceMonthly: 249` -> `269`. `priceAnnualMonthly: 207` -> `~224`. `priceAnnualTotal: 2490` -> `2690`.
- `seats: 15` -> remove; add `managedEmployeesIncluded: 150`, `unlimitedLogins: true`.
- Features: replace `'15 seats'` with `'For teams up to 150 - unlimited logins'`. Optionally tighten any HR365-adjacent recruit copy.
- Anchor/tagline: consider softening `'Replace your $850/mo Employsure retainer'` to a non-named retainer line per the landing-copy scrub already done (the brief named Employsure; the landing copy no longer does).

**Foundation:**
- `lockedMonthly: 179` -> `189` (preserves the ~30% discount off the new $269 anchor). Perk copy: `'Lifetime-locked $179/mo (saving $840/yr)'` -> `'Lifetime-locked $189/mo (saving $960/yr)'`.

**Credits config:**
- `knowledgeIngestionPerDoc: 10` -> `0` (make ingestion free - it is the retention moat and costs ~$0.002).
- Consider `phoneScreenProcessed: 25` -> hold at 25 for launch but flag for re-derivation from pilot Stream data; raise to 30-35 if video minutes run long.
- All other credit values unchanged (they are conservative in the customer's favour at current Anthropic pricing).

**One-offs (optional rationalisation):**
- `resignation-acceptance` $25 -> $29; `reference-check-request` $25 -> $29; `casual-conversion-letter` $29 -> $39; `first-and-final-warning` $35 -> $39; `probation-outcome` $35 -> $39; `performance-plan` (PIP) $39 -> $49; `termination-letter` $45 -> $49; `employment-contract` $49 -> $59. Keep `letter-of-offer` $25, `position-description` $29.
- Add three bundle SKUs (new objects in `oneOffs` or a new `bundles` array): Hiring Pack $79 (LoO + PD + Contract), Exit Pack $79 (FFW + Termination + Resignation), Flexible 3-pack $69. Each needs a new Stripe Price ID env key.

**Enterprise (HR365) - optional, data-gated:**
- No change at launch. If pilot HR365 labour data shows partner hours > 15/mo on Recruit/Full, change `enterprise-recruit.priceMonthlyDisplay` 2995 -> 3495 (and `priceAnnualTotal` accordingly) and `enterprise-full.priceMonthlyDisplay` 3995 -> 4495. Consider reducing Recruit `includedSummary` "Up to 4 active roles" to 3.

**New customer-facing vocabulary (copy layer, not config):** translate "credits" -> "AI actions" and "seats" -> "team size / logins" everywhere in the pricing UI. Keep "credits" internally in the ledger.

---

## 8. The four biggest financial risks (consolidated)

1. **Phone-screen COGS under-recovery `[MED]`.** The only action whose absolute cost is driven by video minutes (Cloudflare Stream + transcription), not tokens. At long video answers it can hit $0.30+/screen against a 25-credit (~$0.20 allowance) charge. *Guard*: re-derive from pilot Stream bills; cap answer length to 90s/question; raise to 30-35 credits if needed. This is the real "Tome failure mode" surface, not chat.
2. **DIY-in-chat cannibalising one-off SKUs `[MED]`.** Subscribers get documents near-free via the generator. *Guard*: do not fight it - position one-offs as the no-signup acquisition front door for the *unsubscribed*; instrument one-off -> trial conversion. The risk is overstated but must be understood so you do not accidentally double-charge paying customers.
3. **HR365 advisor over-service `[MED]`.** HQ People dips below 40% margin at ~5 advisor hours/mo; HQ Recruit goes *negative* above ~17 partner hours/mo; Full thins below 21% at 18+ combined hours. Good advisors over-serve. *Guard*: hold the scheduled-call caps, push extra time to $250/hr overage, lean on the AI for the admin 80%, monitor advisor-hours-per-account weekly, and be ready to move Recruit/Full to C5 prices.
4. **Business credit-allowance generosity + uncapped overage `[MED]`.** 2,500 credits is safe *only if* overage is genuinely enforced at the cap. A recruit-heavy Business customer can consume the entire allowance in phone screens (~$80-100 COGS) and, if allowed to silently overrun, push margin below 60%. *Guard*: hard-cap credits; require overage purchase to continue; never allow silent overruns.

(Honourable mention `[LOW]`: FX. Anthropic bills USD, you price AUD. A sharp AUD fall raises LLM COGS ~5% per 8 cents of FX move - absorbable at these margins but worth a quarterly check.)

---

## 9. Assumptions register (everything to validate in the pilot)

| # | Assumption | Confidence | How to validate |
|---|---|---|---|
| A1 | Chat turn ~6k input (cached) + 700 output | `[MED]` | Log real token counts per chat turn in pilot |
| A2 | Doc gen ~8k in + 2.5k out | `[MED]` | Log per-document generation |
| A3 | Phone screen non-LLM COGS $0.10-0.20 | `[MED]` | Reconcile against actual Cloudflare Stream + STT bills |
| A4 | Advisor loaded cost ~$180k/yr, 60% utilisation -> ~$167/client-hr | `[MED]` | Confirm with Humanistiqs actual comp + timesheet utilisation |
| A5 | HQ People consumes 3-5 advisor hrs/mo | `[MED]` | Track advisor-hours-per-account from first HR365 customer |
| A6 | HQ Recruit consumes 12-20 partner hrs/mo at 4 roles | `[MED]` | Same |
| A7 | FX 1 USD = 1.52 AUD | `[MED]` | Re-check at launch and quarterly |
| A8 | Lawpath has no clean single-doc one-off price; subscription-led | `[MED]` | Re-check lawpath.com.au/pricing before publishing any comparison |
| A9 | Median Solo customer consumes <500 credits/mo | `[LOW]` | Pilot credit-consumption telemetry (this is THE number per the brief's Section 6.2) |
| A10 | Overage gross margin ~60-70% (not 85%) | `[MED]` | Recompute once real action-mix in overage packs is observed |

---

## 10. Sources

- Anthropic / Claude API pricing (Sonnet 4.6 $3/$15, Haiku 4.5 $1/$5 per MTok; caching -90%; batch -50%), verified 23 Jun 2026: [platform.claude.com/docs pricing](https://platform.claude.com/docs/en/about-claude/pricing); [CloudZero Claude API pricing 2026](https://www.cloudzero.com/blog/claude-api-pricing/); [BenchLM Claude API pricing (Apr 2026)](https://benchlm.ai/blog/posts/claude-api-pricing). `[HIGH]`
- Stripe Australia domestic card fee (1.75% + A$0.30, +10% GST), verified 23 Jun 2026: [Stripe pricing](https://stripe.com/pricing); [Wise - Stripe fees in Australia](https://wise.com/au/blog/stripe-fees); [Global Fee Calculator AU](https://globalfeecalculator.com/stripe-fee-calculator-australia/). `[HIGH]`
- Lawpath pricing (subscription-led; Essentials ~$99/mo monthly or ~$29/mo annual; docs+lawyer bundle ~$39/mo annual; 500+ templates; bundle discounts up to 40%), verified 23 Jun 2026: [Lawpath Plans & Pricing](https://lawpath.com.au/pricing); [Lawpath Essentials](https://lawpath.com.au/essentials-plan). Single one-off per-document price NOT verified - public model does not headline one. `[HIGH for subscription, LOW for single-doc point price]`
- Legal123 sells individual lawyer-drafted templates as one-off purchases (evidence the one-off pattern exists in AU), 23 Jun 2026: [Legal123 vs Lawpath](https://legal123.com.au/compare/legal123-vs-lawpath/). Specific prices not verified. `[MED]`
- Employment Hero per-employee pricing (PEPM model; reported tiers range $8+/emp standard up to $20/$40/$60 per employee with $200/$400/$600 minimums depending on source; per-employee model penalises headcount growth), verified 23 Jun 2026: [Employment Hero pricing](https://employmenthero.com/pricing/); [PeopleManagingPeople EH pricing 2026](https://peoplemanagingpeople.com/tools/employment-hero-pricing/). Sources disagree on exact per-employee rate; the load-bearing fact (it is per-employee and scales with headcount) is `[HIGH]`, the specific rate is `[MED]`.
- Internal grounding: `hqai/docs/research/retention-and-monetisation-brief.md` (strategy rationale) and `hqai/lib/pricing-config.ts` (live numbers). `[HIGH]`

---

## 11. Demand-based sliding scale for self-serve

*(Appended 2026-06-23 in response to the founder's demand-vs-capacity question. This section layers ON TOP of the chosen C3 Anchored Ladder + managed-headcount direction. It does not contradict it - it tunes the credit allowance that already sits underneath the headcount metric to do the demand-pricing work.)*

### 11.1 The problem: headcount is a capacity proxy, not a demand signal

Managed-headcount bands answer "how big is the team this business runs in HQ.ai?" That is a *capacity* question. It does not answer "how hard does this business work the product?" - the *demand* question. The two diverge sharply within a single band:

| Same band (say "up to 25") | Quiet professional-services office (20 staff) | Hospitality venue (20 staff) |
|---|---|---|
| HR questions | a few per quarter | constant - rosters, casual queries, warnings |
| Hiring | ~1 role/year | monthly casual churn, multiple roles always live |
| Documents/mo | ~1-2 | ~15-30 (offers, warnings, casual conversions) |
| Phone screens/mo | ~0 | ~20-40 |
| Est. credits/mo | ~60-120 | ~1,200-2,500+ |
| Est. COGS/mo | ~$1-2 | ~$25-55 (phone-screen-driven) |

Both pay the same Solo or Business price under a pure headcount model. The consequence is a classic value-capture failure on **both** ends:

- **The heavy user is under-charged.** The hospitality venue extracts 10-20x the value and incurs 20-50x the COGS of the quiet office, yet pays the same. Money left on the table, and a margin risk (the Tome failure mode from Section 1.4 - phone-screen-heavy usage at the credit cap). `[MED]`
- **The light user is over-charged (and deterred).** The quiet office looks at $269 Business (or even $89 Solo) for "a few questions a quarter" and bounces - the price implies a usage level they will never reach. Lost acquisition at the bottom of the funnel. `[MED]`

A single price per headcount band therefore both leaks revenue upward and suppresses conversion downward. The fix is a **demand slider**: a mechanism that lets price move with activity while keeping the page legible and the bill predictable enough for owner-operators (who, per the brief's own "reject pure-metered" finding, are price-stability buyers). `[HIGH - first principles]`

The good news: the C3 architecture **already contains the slider** - the included-credit allowance plus elastic overage. Credits ARE the demand metric. Section 11 is mostly about *tuning* that existing lever rather than bolting on a new one.

### 11.2 The five sliding-scale mechanisms, compared

Margin check basis (from Section 1): blended marginal COGS ~$0.013/credit; overage retail $0.04/credit (~60-70% margin); phone screen is the cost driver to watch.

#### (a) Credits as the demand slider - flat base + included credits + elastic overage / auto-replenish (Gamma-style)

The lightest-touch sliding scale: one published price per headcount band, a generous included allowance, and overage that the heavy user buys (ideally auto-replenishing so they never hit a wall).

- **How it slides**: light user pays base and never touches overage; heavy user pays base + N overage packs. Price scales smoothly with demand via the overage line.
- **Margin check**: base margin 89-96% (Section 1.4); overage margin ~60-70%. A hospitality venue buying 4 overage packs/mo adds $80 revenue at ~$50 contribution. Heavy use becomes *more* profitable in dollar terms, not less - exactly the right incentive. `[MED]`
- **Pros for this ICP**: zero added page complexity (it is already the model); predictable base; the heavy user self-funds their own COGS; no new billing object in Stripe (metered/top-up already needed).
- **Cons**: relies on overage actually being charged (the Section 8 risk #4 guard); "credits/overage" is jargon that needs plain-English framing ("AI actions"); a very heavy user on the *Solo* base can feel nickel-and-dimed if they cross into many packs - that is the signal to move them up a band, which auto-step (c) automates.

#### (b) Two-axis matrix: headcount band (capacity) x demand level (Light / Standard / Heavy)

Customer picks their band AND self-selects a demand level; price and included credits both vary on the demand axis.

Worked matrix (recommended numbers, monthly, AUD):

| | Light | Standard (default) | Heavy |
|---|---|---|---|
| **Solo** (up to 25 staff) | $69 / 250 credits | **$89 / 500 credits** | $129 / 1,200 credits |
| **Business** (up to 150 staff) | $199 / 1,200 credits | **$269 / 2,500 credits** | $379 / 5,000 credits |

- **How it slides**: the demand axis is the slider; same headcount, three price points.
- **Margin check**: every cell stays >85% at its included allowance (credits priced well above the ~$0.013 marginal cost). Solo Heavy at $129/1,200 credits is ~$0.107/credit included - safe. Business Heavy $379/5,000 = ~$0.076/credit - still ~80%+ even if heavily phone-screen-weighted, provided the cap holds. `[MED]`
- **Pros**: captures the light user (Solo Light $69 rescues the quiet office) AND the heavy user (Business Heavy $379) explicitly; transparent; customer feels in control.
- **Cons**: six cells is more page furniture than the brief's "two clean tiers" ideal; risk of choice paralysis; customers mis-self-select (pick Light, hit the wall, get annoyed). Mitigated by defaulting everyone to Standard and only surfacing Light/Heavy as "+/-" toggles.

#### (c) Auto-step / usage true-up (utility model)

Start at base; when sustained usage crosses a threshold for N consecutive periods, auto-move up one step, with a cap and 30-day notice. Like an electricity plan that re-bands you when your consumption changes.

- **How it slides**: the system moves the customer up (or down) the demand levels in (b) automatically based on trailing usage, so they never have to self-select correctly.
- **Margin check**: identical to (b) at each landed step; the benefit is that heavy users do not sit under-priced for long, tightening the Section 1.4 margin guard. `[MED]`
- **Pros**: removes mis-self-selection; always lands the customer on the right-priced step; feels fair ("you only moved up because you used more, and we told you first"); the strongest Tome-failure-mode guard because it auto-corrects the under-charged heavy user.
- **Cons**: most engineering (trailing-usage tracking, notice emails, Stripe plan swaps); "my price went up automatically" can sting if comms are poor; needs a clear down-step too (fairness symmetry) or it feels like a ratchet. **Notice and a down-step are non-negotiable.** `[MED]`

#### (d) Activity / value-metric pricing - price on workforce events (hires, terminations, reviews) or active recruit roles + AI usage

Price the things that *are* the value: a hire, a termination, a performance review, an active recruit role.

- **How it slides**: more workforce events = more cost. Tracks value and (loosely) COGS better than headcount.
- **Margin check**: only works if the event price exceeds its COGS. A hire (offer + contract + onboarding docs + maybe phone screens) might be ~$0.50-1.50 COGS; priced at, say, $15/hire it is high-margin. But it re-introduces exactly the variable-bill anxiety the brief told us to avoid. `[MED]`
- **Pros**: cleanest value-alignment; intuitive ("you pay when you hire or exit someone"); naturally separates the quiet office from the busy venue.
- **Cons**: **owner-operators hate per-event bills** (brief's "reject pure-metered" finding, `[HIGH]`); defining/counting "events" is fuzzy and gameable; punishes the exact moments (firing, hiring) that are already stressful. Best used as a *secondary garnish* (active-recruit-role gating already exists) not the primary slider.

#### (e) Demand self-select sub-tiers within Business (Business Standard vs Business Active)

A narrower version of (b): keep Solo single, split only Business into two demand sub-tiers.

- Recommended: **Business Standard $269 / 2,500 credits** and **Business Active $379 / 5,000 credits** (3 active-recruit-role floor lifted, priority on phone-screen throughput).
- **Margin check**: as (b) Business row. Active at $379/5,000 ~80%+ margin. `[MED]`
- **Pros**: surgical - splits demand only where it matters most (Business is where heavy hospitality/retail venues live); keeps Solo dead-simple; only one extra cell on the page.
- **Cons**: still a third box; the gap between Solo and Business Active ($89 -> $379) is large and may need the Standard rung as a stepping stone (which it has).

### 11.3 Recommended design: tuned credits (a) + soft auto-step (c), with an optional Business Active sub-tier (e)

The best layer onto C3 is **not** the six-cell matrix (too busy for the brief's two-tier ideal) and **not** event pricing (anxiety). It is:

1. **Keep credits as the published demand slider (mechanism a).** One headline price per band, a generous Standard allowance, elastic overage that auto-replenishes so heavy users never hit a wall. This is already the model - just frame it in plain English and make overage frictionless.
2. **Add a soft auto-step (mechanism c) as the fairness engine** so heavy users land on the right price without self-selecting, and light users are gently down-stepped or offered Light.
3. **Expose exactly ONE optional sub-tier (mechanism e): "Business Active"** for the genuinely heavy venue, so the page shows at most three self-serve boxes (Solo, Business, Business Active) - within the spirit of "two clean tiers" plus one demand upgrade.

**Exact numbers:**

| Plan | Headcount (capacity) | Included credits/mo (Standard demand) | Monthly | Annual (2 mo free) | Auto-step trigger (up) |
|---|---|---|---|---|---|
| **Solo** | up to 25 | 500 | **$89** | $890 | 2 consecutive months > 800 credits OR > 1 active recruit role -> prompt Business |
| **Business** | up to 150 | 2,500 | **$269** | $2,690 | 2 consecutive months > 4,000 credits -> prompt Business Active |
| **Business Active** (opt) | up to 150 | 5,000 | **$379** | $3,790 | sustained > 7,000 credits -> HR365 Recruit conversation |

- **Overage (all plans)**: **$20 = 500 credits**, auto-replenish ON by default (customer sets a monthly cap, e.g. "top up to 3 packs/mo max"). ~60-70% margin per pack (Section 1.3). This is the smooth part of the slider between the discrete plan steps.
- **Light entry (optional, mechanism b's bottom cell only)**: a **"Solo Light" at $69 / 250 credits** for the quiet office. One extra entry-level cell, surfaced as a "just a few questions a quarter?" toggle under Solo rather than a full column. Down-step target for under-using Solo customers. `[LOW]` - test demand before committing; it may be simpler to let the $25 one-off + trial serve the truly light buyer and skip Solo Light entirely.

**Auto-step rules (the fairness engine):**
- **Up-step**: only after **2 consecutive billing periods** above the threshold (not a one-off spike), with **30 days notice** before the new price applies. Never mid-cycle.
- **Down-step**: symmetric - if a customer sits below the lower band's allowance for 2 consecutive periods, proactively offer the cheaper plan. This is what makes auto-step feel fair rather than a ratchet, and it is a retention gift (the brief values "we lowered your bill" goodwill). `[MED]`
- **Hard caps remain on credits** (Section 8 guard) - auto-step changes the *plan*, overage handles *within-period* spikes; neither allows silent uncapped consumption.

**Why this is the right layer:**
- It does the demand-pricing work through a lever that already exists (credits), so it cannot contradict the managed-headcount direction - headcount sets capacity, credits set demand, exactly the two-axis logic the founder identified, but expressed as one slider + one optional box instead of a six-cell grid. `[MED]`
- It is Stripe-billable today: discrete plan prices (Solo / Business / Business Active / optional Solo Light) + a metered/top-up credit SKU with auto-replenish. Auto-step is a scheduled plan swap with a notice email - no exotic billing. `[MED]`
- It keeps the page legible: default view shows Solo and Business (two boxes, as the brief wants); Business Active and Solo Light are progressive-disclosure toggles, not headline columns.

### 11.4 New combination: C9 - Anchored Ladder + Demand Slider

A full ladder, identical to C3 except the self-serve rung gains the demand slider:

- **One-off**: as C3 - $25/$29/$39/$49/$59 bands + Hiring Pack $79, Exit Pack $79, 3-pack $69.
- **Self-serve**:
  - (optional) **Solo Light $69 / 250 credits** (up to 25 staff) - progressive-disclosure entry for the quiet office.
  - **Solo $89 / 500 credits** (up to 25 staff) - default light/standard.
  - **Business $269 / 2,500 credits** (up to 150 staff) - default, "Most popular".
  - **Business Active $379 / 5,000 credits** (up to 150 staff) - demand upgrade for heavy venues.
  - Managed-headcount sets capacity; included credits set demand; **$20 = 500 overage with auto-replenish** is the smooth slider; **soft auto-step (2 periods + 30 days notice, symmetric)** moves customers to the right step.
- **Foundation 100**: $189 locked Business (unchanged).
- **HR365 entry**: $1,495 People (unchanged); Business Active sustained > 7,000 credits routes to HR365 Recruit.

**Attraction/retention vs profitability trade-off:**
- **Attraction**: improves on C3 at *both* ends - Solo Light rescues the deterred quiet office (lower entry), Business Active gives the heavy venue a home before it churns from feeling "capped". Net positive. `[MED]`
- **Retention**: auto-step's symmetric down-step is a goodwill/retention mechanic ("we lowered your bill"); auto-replenish removes the hard-wall churn moment. Net positive. `[MED]`
- **Profitability**: heavy users land on the right-priced step (or buy overage) instead of sitting under-charged - directly tightens the Section 1.4 margin guard. The only giveaway is Solo Light's lower entry margin, which is still >90% at 250 credits. Net positive. `[MED]`
- **Cost**: more engineering than C3 (auto-step usage tracking + notice + plan swaps; auto-replenish overage; an extra plan or two). This is the price of the demand slider.

**Should C9 become the new primary?**

**No - C3 remains the primary recommendation for launch; C9 is the planned evolution.** Reasoning:
- C3 is shippable now with copy-only managed-headcount and credits as the hard meter (Section 4.4). C9's auto-step and auto-replenish are real builds that should not block launch.
- The *demand problem C9 solves is real but not yet quantified* - the founder's quiet-office-vs-venue divergence is a sound hypothesis, but the credit-consumption distribution across the pilot (assumption A9, the brief's load-bearing pilot metric) is exactly what tells you whether you need Solo Light, Business Active, or both, and where the auto-step thresholds truly sit. Ship C3, instrument credit consumption, then layer C9's pieces in the order the data justifies.
- **Sequence**: launch C3 -> from pilot credit telemetry, add (1) auto-replenish overage (cheapest, removes the hard wall), then (2) Business Active if the heavy-venue segment is real, then (3) auto-step once there are enough customers to band, and (4) Solo Light only if the light segment is being demonstrably lost. C9 is the destination; C3 is the on-ramp. `[MED]`

### 11.5 Config-delta additions for C9 (description only - no code)

These ADD to the Section 7 delta if/when C9 pieces are adopted. No app code or `pricing-config.ts` is modified here.

- **Per-tier demand level**: add a `demandLevel: 'light' | 'standard' | 'active'` concept, OR (simpler) model each demand level as its own tier object (`solo-light`, `solo`, `business`, `business-active`) in the `tiers` array, each with its own price, `includedCredits`, and Stripe Price ID env keys (e.g. `STRIPE_PRICE_ID_SOLO_LIGHT_MONTHLY`, `STRIPE_PRICE_ID_BUSINESS_ACTIVE_MONTHLY`, plus annual variants). Modelling as separate tier objects is the least invasive - it reuses the existing `PricingTier` shape.
- **`includedCredits` per level**: 250 (Solo Light), 500 (Solo), 2,500 (Business), 5,000 (Business Active). These already fit the existing `includedCredits` field.
- **Auto-replenish overage**: add to the overage concept a `autoReplenish: boolean` default and a customer-set `autoReplenishMonthlyCapPacks: number` (e.g. default 3). This is a billing-behaviour flag, not a price.
- **Auto-step config**: a new `autoStep` object, e.g. `{ enabled, upThresholdCredits, downThresholdCredits, consecutivePeriodsRequired: 2, noticeDays: 30, targetTierIdUp, targetTierIdDown }` per tier. This drives the scheduled plan-swap logic that lives in app code (out of scope here) - the config only declares the thresholds and targets.
- **Headcount-to-capacity mapping unchanged**: still `managedEmployeesIncluded` (25 / 150) with `unlimitedLogins: true` from the Section 7 delta - C9 does not change the capacity axis, only the demand axis.

---

## 12. Update (founder corrections): HR365 + Recruit365, and combination C10 (split HQ People / HQ Recruit)

This section is the current source of truth where it overlaps Section 5. Two founder corrections are applied (naming and the HR365 entry price), and the founder-requested split of the self-serve products is modelled as combination **C10**.

### 12.1 Naming correction - HR365 and Recruit365

The done-for-you HUMAN layer is two named add-ons, not an "Enterprise" bundle:

- **HR365** - the HR human-advisor add-on (preset on-call advice from a named Humanistiqs advisor).
- **Recruit365** - the recruitment equivalent (on-call hiring/recruitment advice from a named talent advisor).
- **HR365 + Recruit365** - the combined option for businesses that want both.

Keep the distinction crisp: **HQ People** and **HQ Recruit** are the self-serve SOFTWARE products; **HR365** and **Recruit365** are the HUMAN add-ons that sit on top. This replaces the "HQ People Enterprise / HQ Recruit Enterprise / Full Enterprise" language in Section 5 and in `lib/pricing-config.ts` (`enterprise-people` / `enterprise-recruit` / `enterprise-full`).

### 12.2 HR365 corrected economics - $799 entry, 3 hours/month

HR365 starts at **$799/mo including 3 advisor hours/month** (not $1,495). Loaded advisor cost ~$167/hr (Section 5.1). The key driver is how much of the 3-hour allowance is actually used - on-call retainers behave like gym memberships and are routinely under-consumed.

- **Heavy month (all 3 hours used)**: advisor 3 x $167 = $501; platform ~$30; Stripe 1.925% x $799 + $0.33 = ~$15.7. COGS ~$547. Gross margin = ~$252 = **~32%**. `[MED]`
- **Typical month (~1.5 hours used, ~50% of allowance)**: advisor ~$251 + $30 + $15.7 = ~$297. Gross margin = ~$502 = **~63%**. `[MED]`

Blended HR365 margin therefore likely **~50-55%**, swinging on utilisation. The load-bearing assumption is allowance utilisation - track advisor-hours-per-account from the first HR365 customer (this supersedes the old 5-hour-People assumption in Section 5.2).

**Recommended HR365 hours ladder** (per-included-hour held roughly flat ~$265 so margin does not erode at higher bands):

| HR365 plan | Advisor hours/mo | Monthly | Margin (all hours used) | Margin (~50% used) |
|---|---|---|---|---|
| Starter | 3 | **$799** | ~32% | ~63% |
| Standard | 6 | ~$1,590 | ~33% | ~63% |
| Pro | 10 | ~$2,650 | ~34% | ~64% |

Extra hours beyond the band: **$250/hr** (carries ~33% on marginal advisor time - keep). Reconciliation: the prior "$1,495 HQ People Enterprise" maps to roughly the 6-hour Standard band; either lift it to ~$1,590 or hold $1,495 (= ~$249/hr, ~29% at full use). Founder's call. `[MED]`

### 12.3 Recruit365 (proposed - confirm the advisory-vs-role-running split)

Recruit365 mirrors HR365 as on-call recruitment ADVICE measured in hours. Recruitment expertise costs at least as much, so price the included hour at a small premium (~$290/hr), and keep **done-for-you role-running** (volume sourcing/screening) as **per-role / per-placement overage on top**, not in the hours base.

| Recruit365 plan | Advisor hours/mo | Monthly | Margin (all hours used) |
|---|---|---|---|
| Starter | 3 | ~$899 | ~38% |
| Standard | 6 | ~$1,790 | ~39% |
| Pro | 10 | ~$2,990 | ~40% |

Role-running overage: **$750/active role/mo**; executive search **$8,500/placement** (from existing config). The old "$2,995 Talent Partner runs 4 roles" becomes **Recruit365 Pro (~$2,990, ~10 advisory hours) PLUS per-role running fees** - which is what actually protects margin, since Section 5.2 showed the flat "$2,995 runs 4 roles" model goes negative above ~17 partner hours/mo. **All Recruit365 numbers `[LOW]` - proposed mirror; confirm the advisory-vs-role-running boundary with the founder before hardening.**

### 12.4 Combination C10 - split HQ People and HQ Recruit, with a bundle

**Rationale.** HQ Recruit usage is the cost/usage outlier - phone screens at 25 credits are the dominant variable cost and the Tome-failure risk (Sections 1.4-1.5) - and most SMEs do HR continuously but hire only episodically. A single blended sub overcharges the rare-hirer and hides the expensive recruit usage. C10 separates the two self-serve products and keeps a bundle as the headline. It maps onto **"team size + usage"** (People base) and **"flat base + usage + fair use"** (Recruit metered on top).

The shape (do **not** split into two equal team-size subs - that doubles the decision and serves a buyer type that barely exists in this ICP):

**HQ People** - the always-on base software (team size + usage). The new low-friction entry:

| | up to 25 | up to 150 |
|---|---|---|
| Monthly | **$59** | **$179** |
| Annual (2 mo free) | $590 | $1,790 |
| Included AI actions/mo | 400 | 1,500 |
| Gross margin (median use) | ~94% | ~93% |

**HQ Recruit** - a metered add-on (on top of People, or inside the bundle). Isolates the expensive hiring usage so it is paid in proportion to use:

| Recruit add-on | Active roles | Included recruit actions/mo | Monthly | Margin at included use |
|---|---|---|---|---|
| Light | 1 | 500 (~20 phone screens) | **$40** | ~85% |
| Pro | unlimited | 2,000 (~80 screens) | **$120** | ~80% |

Overage **$20 = 500 recruit actions**, auto-replenish. The truly occasional hirer can open a **single role pay-as-you-go (~$39 for 30 days)** instead of a monthly add-on.

**Bundle ("Complete") - both products at a discount; the headline and land-and-expand target:**

| Bundle | Team size | Includes | Monthly | vs separately |
|---|---|---|---|---|
| Solo Complete | up to 25 | HQ People + Recruit Light | **$89** | $99 -> save $10 |
| Business Complete | up to 150 | HQ People + Recruit Pro, unlimited roles | **$269** | $299 -> save $30 |

The elegance: the bundles **reproduce today's familiar $89 / $269 headline prices**, while C10 ADDS a cheaper HR-only door ($59 / $179) and isolates recruit cost. Blended bundle margin ~88-92%.

Buyer choice collapses to one question - **"HR help, hiring help, or both?"** - with the bundle pre-selected as "Most popular".

**Margins at light / median / heavy:**
- HQ People only: ~95% / ~94% / ~90% (chat and docs are cheap; even heavy People use is doc-heavy, not screen-heavy).
- HQ Recruit add-on: ~85% at included usage; overage ~60-70%; never underwater because screens are metered.
- Bundle: ~90% median; worst case (recruit-heavy at cap, no overage) still ~70%+ - the metered recruit allowance is the guard. `[MED]`

**Cannibalisation.** A both-needer could buy People-only and try to DIY hiring - but without the Recruit add-on they have no CV scoring or video/phone screens, so the capability gap is real; and the bundle is cheaper than People + add-on, so rational both-needers pick the bundle. Mitigation holds. `[MED]`

**Verdict - should C10 replace C3 as the primary?** **Yes, with one condition.** C10 dominates C3 on both levers the founder cares about: it lowers the entry (a $59 HR-only door for the rare-hirer = more attraction) AND isolates the one dangerous cost (recruit screens metered = better, safer margin), while preserving the $89/$269 anchors as bundles and the cross-sell story. The only cost is one extra concept on the page; mitigated by framing it as a single "what do you need?" choice with the bundle defaulted. **Recommendation: adopt C10 as the primary self-serve architecture, run C8 (Foundation-led) as the launch motion, and layer C9's demand auto-step onto the bundle/Business tier later.** Validate the People and Recruit allowance splits against pilot credit telemetry before hard-coding. `[MED]`

### 12.5 Config-delta additions for C10 + HR365/Recruit365 (description only - no code)

- Self-serve: replace the two-`tier` array with a product model - either `products: ['hq-people','hq-recruit','bundle']` or keep `tiers` and add a `product: 'people' | 'recruit' | 'bundle'` discriminator plus `addOn: boolean` on recruit.
  - HQ People: solo $59 / business $179; `includedCredits` 400 / 1,500.
  - HQ Recruit add-on: light $40 (500 recruit credits, 1 role) / pro $120 (2,000 recruit credits, unlimited roles); single-role PAYG ~$39/30 days.
  - Bundle: solo-complete $89 / business-complete $269 with combined allowances; mark business-complete `highlight: true`.
  - New Stripe Price ID env keys per SKU (people/recruit/bundle x solo/business x monthly/annual).
- Human layer: rename `enterprise-people` -> **hr365**, `enterprise-recruit` -> **recruit365**, `enterprise-full` -> **hr365-plus-recruit365**; add an `includedAdvisorHours` field; HR365 `priceMonthlyDisplay` 1495 -> **799** with `includedAdvisorHours: 3`, and add the 6h / 10h bands; Recruit365 bands per Section 12.3 (flagged `[LOW]`, confirm first).
- `lib/pricing-config.ts` is now **known-stale** on the human layer until these land.

End of analysis.
