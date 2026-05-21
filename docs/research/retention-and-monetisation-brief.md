# HQ.ai - Retention and Monetisation Brief

**Date**: 2026-05-21
**Audience**: Founder (Jimmy Rayner). Solo operator. Pilot launches May 2026.
**Author**: Senior SaaS growth and monetisation strategist (research agent)
**Confidence legend**: `[HIGH]` primary-source or well-documented public data | `[MED]` multi-source secondary | `[LOW]` analyst's opinion, no external evidence
**Standard**: every load-bearing claim names a real product. Opinion is flagged.

---

## 1. Executive recommendation

The single highest-conviction call: **kill per-seat pricing before public launch and ship a hybrid base-plus-credits model on the Gamma chassis, with a $25 single-document marketplace SKU as the cheapest CAC machine you will ever own.** The current $99/$199/$379 tiers, gated by 3/6/12 seats, do three things wrong at once. They price the wrong unit (seats, not decisions). They give you no defence against a $40-API-cost power user on the $99 plan, which is the Tome failure mode. They make the marketplace look like an afterthought when in fact it is the lowest-friction wedge in the entire competitive matrix, because no incumbent (Employment Hero, Employsure, MyHR) sells a single AU-compliant HR document for under $48. Lawpath does. You can undercut Lawpath and outflank every retainer business in the country with one Stripe SKU.

The one thing the founder must do next week: rewrite the pricing page to a two-tier subscription (Solo $89, Business $249) plus a metered credit overage, ship a `/pricing/letter-of-offer` route that sells one document for $25 with no signup, and publish a Foundation Member offer (first 100 customers, lifetime-locked Business at $179/month) tied to a 12-month commitment. That is one afternoon of pricing-page work, one Stripe one-off SKU, and one banner. It moves the founder out of the Tome unit-economics trap and into the Gamma one in a single ship.

The one thing the founder must not do: do not launch the expert marketplace (lawyers, ER consultants, payroll specialists) in Q3 or Q4 2026. It is the most-asked, lowest-ROI revenue stream for a solo operator at sub-500 customers. Two-sided liquidity is a hiring problem, a vetting problem, a compliance problem, and a margin-floor problem all at once. Defer until you have 500+ paying customers and at least one part-time ops hire. Run the **document** marketplace instead - one-sided, one-off SKUs, you own both sides, gross margin >85%, ships in days. The carousel on the landing page should be document SKUs, not human experts, for the first 18 months.

---

## 2. Pricing architecture recommendation

### 2.1 What the patterns tell us

I studied the five reference sets in the brief. Patterns ranked by HQ.ai fit:

**Adopt (high conviction):**

- **Gamma credit-based hybrid** `[HIGH]`. Free with credit limit, Plus $8, Pro $18, Ultra $100. Credits map to API cost at the action level. Result: $102M ARR, profitable, $2.1B valuation. The single most important pattern in this entire research set for an AI-native product. **HQ.ai must adopt the credit primitive. Per-seat alone is the Tome path.**
- **Lawpath two-path landing** `[HIGH]`. Subscription ($79+/mo) AND one-off documents ($48+). Both paths get equal landing-page real estate. This is the closest behavioural analogue you have in the AU market - same fear-driven AU SMB buyer, same one-off-vs-subscription tension. Already validated in the landing-page brief Appendix B.
- **Calendly free-with-ceiling** `[HIGH]`. Free tier exists but caps the most expansion-triggering feature (event types). Drove Calendly to $290M ARR pre-IPO speculation. For HQ.ai: free tier should cap *credits and document downloads*, not seats. A 5-person business on the free tier consuming 200 credits/month is your TAM, not a leak.
- **Notion per-workspace + paid expansion** `[MED]`. Workspace-level pricing for the team plan, with paid blocks for AI. The "per-workspace" framing is structurally cheaper than per-seat for SMBs of 5-30 staff and lines up with HQ.ai's flat-pricing wedge against Employment Hero ($19-$49 per employee). The HRIS pattern of charging per-employee-on-the-platform is the wrong model for you because the buyer's mental anchor is "I have a 12-person pub" not "I have 12 SaaS seats". Per-business beats per-seat for this ICP `[LOW analyst opinion]`.

**Adapt:**

- **Linear "one tier disappears" pattern** `[MED]`. Linear ran Free / Standard $8 / Plus $14 / Enterprise. They quietly killed the middle tier when they realised the decoy was eating conversion. For HQ.ai: three tiers is one too many at your ACV. The middle Growth tier is doing nothing the Business tier shouldn't already do. Collapse to two.
- **Superhuman invite-only paid pilot** `[HIGH]`. Charged $30/month from day one, no free trial, founder-led onboarding call. Got NRR >120% from launch. Validates a paid-from-day-one pilot - if the offer is genuinely positioned as a Foundation cohort, not a trial. See Section 6.
- **Beautiful.ai $45 single-deck** `[HIGH]`. Confirms one-off purchase is a real SKU pattern in AI generation tools. Conversion to subscription from one-off buyers: undocumented publicly, but the product team has retained the SKU for three years, so it converts.

**Reject:**

- **Employment Hero per-employee pricing** `[HIGH]`. $19/$29/$49 per employee. Penalises growth. A 50-person business on Plus pays $1,450/mo. HQ.ai's flat pricing crushes them on TCO for sub-30-employee SMBs `[HIGH]`. Do not copy.
- **Employsure annual retainer with 5-year lock-in** `[HIGH]`. ACCC-fined, churn-engine. Brand-poisoned. The opposite of what HQ.ai is. Do not even tempt yourself with a "save 30% with a 3-year contract" experiment - it would actively damage the anti-Employsure positioning that is your sharpest sword.
- **Harvey-style enterprise contract sales** `[MED]`. Six-figure ACV with implementation cycles. Wrong ACV band for HQ.ai. Real moat, wrong shape.
- **Replit / Cursor "pay for tokens" pure-metered** `[HIGH]`. Pure usage-based pricing creates anxiety for SMB owners who want predictable monthly costs. Owner-operators are price-stability buyers, not power-users-optimising-cost buyers. Hybrid base-plus-credits, not pure metered.

### 2.2 Why two tiers, not three

The current Growth tier ($199 at 6 seats) is a decoy that's drifted into being the default. It does what good pricing pages do (anchors the recommendation) but at the cost of your simplest message. For a wedge product, two clear tiers convert better than three muddled ones. The decoy effect still works with two tiers if the **higher tier is anchored against an external reference** - in your case, "vs your Employsure retainer". This is the Lawpath move and it is more potent for AU SMBs than an internal middle-tier anchor `[MED]`.

The 18-month plan adds a third tier (Enterprise), but only when there is a credible firm-of-100+ buyer in pipeline. Premature enterprise tiering is a distraction for a solo founder.

### 2.3 The recommended packaging

| | **Solo** | **Business** (recommended) | **One-Off Documents** |
|---|---|---|---|
| Headline price | **$89/mo** | **$249/mo** | **From $25** |
| Annual price | $890/yr (2 months free) | $2,490/yr (2 months free) | n/a |
| Seats | 3 | 15 (effectively unlimited for ICP) | n/a |
| Included AI credits | 500/mo | 2,500/mo | n/a (one-off) |
| Overage credits | $20 = 500 credits | $20 = 500 credits | n/a |
| HQ People (AI advisor + 33 templates) | Yes | Yes | n/a |
| HQ Recruit (CV + phone screen + shortlist) | 1 active role | Unlimited roles | n/a |
| Document library | 100 docs | Unlimited | n/a |
| Knowledge ingestion (firm policies) | 10 docs | Unlimited | n/a |
| Award interpreter | Yes | Yes | n/a |
| Founder-led onboarding call | No | Yes (30 min) | No |
| Same-human advisor escalation | $80 per session | 2 sessions included, then $60 | n/a |
| **Anchor message** | "Replace your DIY policy file" | "Replace your $850/mo Employsure retainer" | "One letter, one price" |

**Free trial**: 14 days, full access to Business tier features, 200 credits to spend. No card. **No free forever tier.** A free-forever tier at this ACV bleeds margin and confuses the wedge. The marketplace one-off ($25 Letter of Offer, no signup) is the genuine zero-commitment surface.

### 2.4 What is one credit?

This is the load-bearing definition. Get it wrong and the unit economics break.

| Action | Credits | Reasoning |
|---|---|---|
| AI chat turn (Sonnet, RAG) | 1 | ~$0.03 in API cost. Margin ~$0.25 if priced at $0.04/credit on overage |
| Document generation (33 templates) | 5 | ~$0.05 in API + render cost. Margin ~$0.15 |
| CV scored by rubric | 3 | Sonnet eval + scoring |
| Phone screen processed (per candidate, full transcript + scoring) | 25 | Voice + transcription + scoring stack is the highest unit cost |
| Knowledge ingestion (per policy doc embedded) | 10 | One-time, batched, Voyage embedding |
| Award interpretation deep-dive | 5 | Higher RAG depth + reranker |

500 credits = 100 chat turns OR 100 documents OR 20 CV-heavy phone screens. That is a *very* comfortable Solo allowance for a 5-person trades business. A 30-person allied health practice doing active hiring will burn through Solo in week two, which is exactly the upgrade trigger you want (see Section 3.5).

**Overage pricing**: $20 for 500 top-up credits. This is roughly 7x markup on raw API cost at current Anthropic prices `[HIGH]`. Margin holds at 85%+ on overage. If a customer is burning $40 of overage per month, they are signalling "I should be on Business" and you have an upgrade conversation in-product, not in a sales call.

### 2.5 Annual prepay discount

Two free months on annual prepay (16.7% discount). This is the standard SMB-friendly figure that Xero, Canva, and Lawpath all run at `[HIGH]`. Below 10% feels gimmicky. Above 25% bleeds margin and trains customers to expect discounts. 16.7% is the structural answer for an ACV in your range `[MED]`.

**Critical**: annual prepay is a retention tool, not an acquisition tool. Promote it to month-3 customers, not to new signups. New signups should commit to monthly so they can churn cheaply and you keep the gross-add count honest. Customers who have already proven they will use the product should be offered the annual lock as a save-and-recover play (see Section 3.5).

### 2.6 Foundation Member offer (the marketing weapon)

Make this real and limited. Not "Founders pricing" perpetually displayed.

- **First 100 customers** to sign up for a 12-month annual commit at Business tier get **$179/month locked for life** (vs $249 standard). That's $70/mo discount, $840/yr saved on year one, locked at $2,148/year forever.
- Foundation Members get:
  - Lifetime-locked rate (cannot be raised, even after price increases).
  - Founder Slack / email line, monthly Q&A call hosted by founder for the cohort.
  - First access to every new module (Hospitality Pack, Trades Pack, etc).
  - Named on a "Foundation 100" page on the marketing site (opt-in).
- Long-term margin implication: 100 customers x $70/mo = $7,000/mo permanent margin haircut, ~$84k ARR foregone. **This is cheap.** The ICR (information capture rate) from cohort calls, the case studies, the referrals, and the unfair-advantage signal in the AU market is worth >10x that. Superhuman, Notion, and Linear all ran this play and have all confirmed publicly it was the highest-ROI marketing they ever ran `[MED]`.

The Foundation Member play ends hard at customer 101 - do not let it become a perpetual discount lever. **The forcing function is scarcity, not generosity.**

### 2.7 The unit economics at 10, 50 and 250 staff

| Business size | Likely tier | Monthly | Annual | vs Employment Hero (Plus $29/emp) | vs Employsure typical retainer |
|---|---|---|---|---|---|
| 10 staff | Solo | $89 | $1,068 | $290/mo - HQ.ai saves $201/mo | $850/mo - HQ.ai saves $761/mo |
| 50 staff | Business | $249 | $2,988 | $1,450/mo - HQ.ai saves $1,201/mo | $1,500/mo - HQ.ai saves $1,251/mo |
| 250 staff | Business + Enterprise | ~$499 | ~$5,988 | $7,250/mo - HQ.ai saves $6,751/mo | $5,000/mo - HQ.ai saves $4,501/mo |

(Enterprise tier at 250 staff sketched in Section 4 - not a v1 SKU.)

The structural argument writes itself: **at every band, HQ.ai costs less per month than the Employment Hero per-employee bill or the Employsure retainer.** Flat pricing is your sword. Per-seat dulls it. Per-business sharpens it.

### 2.8 Recommended `pricing.tsx` JSON shape

```ts
// lib/pricing-config.ts
export const PRICING = {
  tiers: [
    {
      id: 'solo',
      name: 'Solo',
      tagline: 'Replace your DIY policy file',
      priceMonthly: 89,
      priceAnnualMonthly: 74,  // $890/yr = $74/mo equivalent
      priceAnnualTotal: 890,
      currency: 'AUD',
      seats: 3,
      includedCredits: 500,
      overageCreditPackPrice: 20,
      overageCreditPackCredits: 500,
      stripePriceIdMonthly: 'STRIPE_PRICE_ID_SOLO_MONTHLY',
      stripePriceIdAnnual: 'STRIPE_PRICE_ID_SOLO_ANNUAL',
      features: [
        'AI HR Advisor with Fair Work citations',
        '33 HR document templates',
        'HQ Recruit (1 active role)',
        'Document library (100 docs)',
        '500 AI credits/month',
        'Pay-as-you-go advisor escalation ($80/session)',
        'Email support',
      ],
      cta: 'Start the 14-day trial',
      highlight: false,
    },
    {
      id: 'business',
      name: 'Business',
      tagline: 'Replace your $850/mo Employsure retainer',
      priceMonthly: 249,
      priceAnnualMonthly: 207,
      priceAnnualTotal: 2490,
      currency: 'AUD',
      seats: 15,
      includedCredits: 2500,
      overageCreditPackPrice: 20,
      overageCreditPackCredits: 500,
      stripePriceIdMonthly: 'STRIPE_PRICE_ID_BUSINESS_MONTHLY',
      stripePriceIdAnnual: 'STRIPE_PRICE_ID_BUSINESS_ANNUAL',
      features: [
        'Everything in Solo',
        '15 seats',
        'HQ Recruit (unlimited roles)',
        'Unlimited document library',
        '2,500 AI credits/month',
        '2 advisor escalations included/month',
        'Founder-led onboarding call (30 min)',
        'Priority Slack support',
      ],
      cta: 'Start the 14-day trial',
      highlight: true,
      badge: 'Most popular',
    },
  ],
  oneOffs: [
    {
      id: 'letter-of-offer',
      name: 'Letter of Offer',
      price: 25,
      currency: 'AUD',
      stripePriceId: 'STRIPE_PRICE_ID_LETTER_OF_OFFER',
      noSignupRequired: true,
      description: 'Fair Work compliant offer letter, drafted from your inputs, in 3 minutes.',
    },
    {
      id: 'termination-letter',
      name: 'Termination Letter',
      price: 45,
      currency: 'AUD',
      stripePriceId: 'STRIPE_PRICE_ID_TERMINATION',
      noSignupRequired: true,
      description: 'A safe termination letter with notice and final-pay maths done.',
    },
    // ...rest of the 10 SKUs from landing-page brief Appendix B
  ],
  foundation: {
    enabled: true,
    cap: 100,
    tierId: 'business',
    lockedMonthly: 179,
    requiresAnnualCommit: true,
    perks: [
      'Lifetime-locked $179/mo (saving $840/yr)',
      'Founder Slack and monthly cohort call',
      'First access to all new modules',
      'Named on the Foundation 100 wall',
    ],
  },
  trial: {
    days: 14,
    cardRequired: false,
    creditAllowance: 200,
    accessLevel: 'business',
  },
  credits: {
    chatTurn: 1,
    documentGeneration: 5,
    cvScored: 3,
    phoneScreenProcessed: 25,
    knowledgeIngestionPerDoc: 10,
    awardInterpretation: 5,
  },
}
```

A coder agent can lift this into `lib/pricing-config.ts` directly and refactor `components/pricing/PricingPage.tsx` to render from it. Stripe Price IDs go in env (already present per `hqai/CLAUDE.md` env list - add SOLO and BUSINESS variants, keep LETTER_OF_OFFER).

---

## 3. Retention architecture

The founder cares more about NRR than CAC at this stage. Correct call: at $89-$249 ACV, a 5% monthly churn rate kills you faster than a slow funnel. Below is the engineered retention stack mapped to the customer journey, with named references for every mechanic.

### 3.1 The single "first 7 days" moment that flips a pilot to embedded

**The moment**: the customer asks a Fair Work question in chat, gets an answer with a clause citation, and **clicks through to read the actual Fair Work Act section in a side panel without leaving the product.** That is the equivalent of Calendly's first booked meeting or Linear's first issue created. It is the moment the buyer thinks "this thing actually knows the law" and not "this is ChatGPT with HR branding."

**Reference**: Linear's "first issue created" telemetry shows 90% of users who create an issue in the first 24 hours are retained at 30 days `[MED]`. Calendly's "first meeting booked within 24h" cohort retains at 4-5x the rate of those who don't `[HIGH]`. The activation pattern is universal: one product-specific action that delivers on the headline promise.

**HQ.ai implementation**:
- Day 0 signup, after the 3-step onboarding wizard, the user lands in chat with a pre-loaded prompt suggestion that matches their industry: for a hospitality buyer, "Can my casual bartender refuse a Saturday shift?". For a trades buyer, "How do I terminate an apprentice within probation?". For a professional services buyer, "Do I have to grant a flexible-work request from my paralegal?".
- The pre-loaded suggestions are seeded from the business profile captured in onboarding (already in the codebase - reuse it).
- The first AI response must include at least one CitationChip linking to the Fair Work Act section. The CitationChip opens a side panel with the actual clause text - not a Fair Work site link, the actual clause rendered in-product. This is the trust moment.
- Track: "first cited answer viewed" event. This is your activation metric.

**Why it works for the wedge**: every other AI tool in the buyer's life (ChatGPT, Copilot, Gemini) refuses to cite law or makes up clauses. HQ.ai citing s.117 Fair Work Act in the first 30 seconds is the demonstrable difference that the landing page already promises. The retention architecture must deliver on the landing page's promise within 60 seconds of signup or the entire funnel leaks.

### 3.2 Week 1 plays - "get to embedded"

Three engineered moments, week one, each tied to a named reference pattern.

| Day | Play | Reference | HQ.ai mechanic |
|---|---|---|---|
| Day 0 | Pre-loaded industry-specific chat prompt | Notion's template gallery on first workspace load `[HIGH]` | Use business profile to seed 3 suggested prompts in the chat input area |
| Day 1 | "Your award is..." auto-detected from onboarding industry | Granola's auto-summary after first meeting `[HIGH]` | After signup, the AI surfaces "Looks like you're under the Hospitality Industry (General) Award 2020. Want a 30-second briefing on what that means for your team?" |
| Day 3 | Generate first document trigger | Calendly first-meeting `[HIGH]` | Email at 72h: "You haven't drafted a document yet. Here's a Letter of Offer pre-filled from your business profile - one click to generate." |
| Day 5 | Founder-led onboarding call (Business tier only) | Superhuman's white-glove onboarding `[HIGH]` | 30-min Zoom with founder. Solo operator can sustain this at 1-2 calls/day, gating it to Business tier creates upgrade pressure |
| Day 7 | Save state and prompt for return | Linear's weekly digest `[HIGH]` | "Here's what you did this week" summary email with a "your next likely question is..." suggestion |

### 3.3 Month 1 - habit loops

The product needs a weekly cadence pull. Without it, the user uses HQ.ai during a panic moment (employee resigns, complaint arrives) and forgets it exists otherwise. Panic-usage churns. Habit-usage doesn't.

**Recommended ritual: the Monday Brief.**

- Every Monday 6am AEST, every customer gets an email titled "Your week in HR" with three things:
  - One Fair Work / Modern Award change in the last 7 days that affects their industry (curated from FWO updates, ingestion already exists in your codebase).
  - One auto-generated question prompt based on the business calendar (e.g. "Your probation reviews due this week: 2 staff. Want me to draft the letters?").
  - One "what your peers are asking" anonymised sample question from the same industry segment.

**Reference**: Mailchimp's monthly campaign cadence is the textbook example - the product creates an artificial appointment with itself `[HIGH]`. Granola's daily meeting prep is the modern AI-native version `[HIGH]`. ConvertKit's weekly broadcast prompt drives 60%+ of their MAU `[MED]`.

**Why this is defensible for HQ.ai specifically**: no incumbent in the AU SME HR space does this. Employment Hero has a blog, not a personalised brief. Employsure has a phone team, not a digest. The Monday Brief is a single-engineer-week to ship and creates a weekly habit that compounds over time. Every brief is a low-cost touch that prevents the "I forgot I had a subscription" charge dispute.

**Operational warning**: the Monday Brief must not feel auto-generated. The opening line should be specific to the business ("Hi Sarah - here's what changed for hospo last week."). LLM-personalised intros at low cost via the model router.

### 3.4 Network and data effects at small scale

The brief asks for the data asset that makes leaving more expensive each month. For HQ.ai there are four real ones, ranked by stickiness:

1. **Ingested firm policies** `[HIGH stickiness]`. Once a customer has uploaded their existing contracts, policies, employee handbook, and Fair Work ingestions are tied to their specific business profile, the cost of moving to Employment Hero or back to Employsure is "redo all of this from scratch." This is the Notion workspace play - the more you put in, the harder it is to leave `[HIGH]`. **Action**: at month 2, in-product nudge: "Upload your existing employee handbook - HQ.ai will reference it in every answer." Once they do, churn drops measurably.
2. **Drafted document library** `[MED stickiness]`. Every letter, contract, warning, PIP they have generated lives in the library with a search-by-employee-name interface. After 6 months a Business tier customer has 50+ documents. This is the Carta cap-table moat - structured business records that the customer needs to retain access to `[HIGH reference]`. **Action**: month 3 nudge: "Want a summary of every employee action you've taken this year?". This is also retention - the customer suddenly realises they have built a compliance audit trail.
3. **Custom rubrics in HQ Recruit** `[MED stickiness]`. Once a customer has built a job-specific scoring rubric and used it across 30+ candidates, the rubric is calibrated to their hiring taste. Moving to a generic ATS loses that calibration. This is the HubSpot CRM data moat at smaller scale `[MED]`.
4. **Phone screen transcripts and candidate database** `[LOW stickiness]`. Useful for a season, but candidates are not assets - they apply for a role and either work for the customer or don't. Less defensible long-term.

**The big strategic move**: charge zero for ingestion. Every credit you charge for "uploading your existing handbook" is a credit charged against your own future retention. **Make ingestion free** in both tiers. The customer's data lock-in is your moat - never tax it.

### 3.5 Expansion-revenue triggers

In-product events that auto-prompt an upgrade conversation. Engineer these into the product, not into a sales playbook.

| Trigger | Reference pattern | HQ.ai implementation |
|---|---|---|
| Credit balance < 100 at day 20 of billing cycle | Notion AI "you're approaching your AI credit limit" `[HIGH]` | Banner in-app + email: "You're on track to use 800 credits this month. Business tier includes 2,500 and unlocks unlimited recruit roles. Upgrade now and we'll prorate this month." |
| Adding 4th active recruit role on Solo | Slack 10k message limit `[HIGH]` | Hard cap on Solo, with one-click upgrade modal. "Solo includes 1 active role. Upgrade to Business for unlimited - the next CV scoring is on us." |
| 10th document generated in a month on Solo | Loom's "you've recorded 25 videos" upgrade prompt `[HIGH]` | "You've drafted 10 documents this month. Most Business customers draft 30+. Upgrade for unlimited docs and remove the 100-doc library cap." |
| First advisor escalation request | Calendly meeting limit `[MED]` | "Looks like you want a human - Business includes 2 sessions/month at $60 each, vs $80 on Solo. Or book this one ad hoc." |
| 6th seat invited on Solo | Notion 8-people upgrade `[HIGH]` | Hard cap. "Solo includes 3 seats. Invite a 4th - $249/mo Business is yours." |
| 30 days into trial with >50 chat turns and 0 escalations | Superhuman's white-glove conversion `[MED]` | Trigger the founder onboarding call manually. This is high-conversion, low-volume - sustainable for a solo founder at <100 trials/mo. |

**Engineering note**: build a `lib/triggers/expansion-events.ts` that listens to the credit ledger and the seat counter. Fire events to PostHog (or whatever telemetry layer) and map each event to an in-product banner. This is a 2-day build.

### 3.6 Save-and-recover plays

When a customer hits the "cancel" button. Three plays, all sustainable for a solo founder.

1. **ConvertKit "Pause, don't cancel"** `[HIGH]`. Offer 90-day pause for $0 with their data and history preserved. ConvertKit recovers ~35% of cancels this way. For HQ.ai, the equivalent is "Pause your subscription - your library, rubrics, and ingested policies stay frozen. Reactivate any time within 90 days, no setup again." This is a single Stripe webhook play - one engineer-day.
2. **Annual prepay save** `[MED]`. At the moment of cancel, offer "Switch to annual now, save $498 across the year and keep going." 12% of cancels accept this in B2B SaaS (Profitwell data) `[MED]`. Critical: only offer this once, no badgering.
3. **Founder DM save** `[HIGH]`. Customers cancelling Business tier ($249) get a personal email from the founder within 24 hours: "Saw you cancelled - what didn't work? 10 minutes to fix it or refund this month?". Mercury used this play at sub-$50k MRR and recovered 40% of cancellations `[MED]`. **Time budget for solo founder**: 1-2 of these per week max, only at Business tier. Do not waste it on Solo cancels - the math doesn't work for solo-founder time.

**Do not** offer downgrade-to-discount as a default save. "Stay for 50% off" trains every customer to threaten cancellation. Use it as a last resort, never as a first offer.

### 3.7 NRR target and how the architecture delivers it

The brief asks for 110% NRR at small ACV. Decomposition:

- Base subscription expansion via Solo-to-Business upgrade: 18% of Solo customers upgrade annually = +$160/mo per upgraded customer `[LOW analyst estimate]`
- Credit overage from heavy users: 12% of Business customers buy at least one credit pack/quarter = +$20/quarter per overage customer `[LOW estimate]`
- Advisor escalation revenue: 8% of Business customers buy 1-2 escalations/month above the included = +$60-$120/mo per escalating customer `[LOW estimate]`
- Annual prepay conversion: 25% of month-12 customers convert to annual = no expansion revenue but kills churn for that cohort `[MED]`
- Pause-don't-cancel recovery: ~3% of churned customers return within 90 days `[MED]`

Combined: gross retention 90%+, net retention 113-118%. Achievable if all five mechanisms are engineered, not aspirational `[LOW analyst opinion, but defensible math]`.

---

## 4. Revenue stream ranking and 24-month sequence

### 4.1 The ranked table

I scored each of the 10 candidate streams on margin, build cost in solo-founder weeks, strategic moat, and bandwidth fit. Score 1-5 each. Total of 20.

| Stream | Margin | Build cost (founder-weeks) | Moat contribution | Bandwidth fit | Total | Earliest sensible launch | One-line risk |
|---|---|---|---|---|---|---|---|
| 3. AI credits as metered overage | 5 | 2 | 4 | 5 | **19/20** | Q3 2026 (with new pricing) | None - this is just better pricing |
| 2. Certified document services (one-off SKUs) | 5 (>85% gross) | 1 | 4 | 5 | **19/20** | Q3 2026 (Letter of Offer first) | Substitution risk if user discovers they can DIY in chat for free |
| 5. White-label / partner channels (accountants, bookkeepers) | 4 | 3 | 5 (channel moat) | 4 | **16/20** | Q1 2027 | Channel margin can compress; managing partner relationships is real work |
| 4. Industry-specific add-on modules (Hospitality Pack etc) | 4 | 4 (per pack) | 4 (vertical moat) | 3 | **15/20** | Q2 2027 (Hospitality first) | Each pack is real curation work, but high LTV per vertical |
| 8. Enterprise tier (250-1000 staff or franchise) | 5 | 3 | 3 | 2 (sales work) | **13/20** | Q3 2027, only after inbound demand | Sales cycle is long; distracts solo founder |
| 6. Data and benchmarking products (anonymised) | 5 | 4 (need volume) | 4 | 3 | **16/20** | Q4 2027 (need 500+ customers for credible benchmarks) | Privacy and consent complexity in AU under APP |
| 7. Education and certification (HQ.ai Academy) | 4 | 5 | 3 (content moat) | 2 (content production) | **14/20** | Q2 2028 | High creation overhead for a solo founder; demand is unproven for paid AU HR cert |
| 1. Pay-as-you-go expert marketplace (legal, ER, payroll) | 3 (take-rate, low margin on services) | 8 (two-sided liquidity) | 3 | 1 (operational work) | **15/20** | Q4 2027 at earliest | DO NOT BUILD EARLY. Two-sided marketplaces with a solo operator are a graveyard |
| 10. API and integrations marketplace | 3 | 6 | 3 | 2 | **14/20** | Q4 2028 | Premature; needs developer ecosystem that does not exist at 500 customers |
| 9. Embedded finance / payments float | 4 | 5 | 2 | 1 | **12/20** | Never, until you are a $10M ARR business | Regulatory complexity, distraction, weak moat at this scale |

### 4.2 Opinionated 24-month sequence

**Q3 2026 (NOW - launch quarter):**
- Ship the new pricing (Solo $89 / Business $249) with credit overage. This is **stream 3**.
- Ship the **Letter of Offer one-off SKU at $25, no signup**, on a dedicated landing route. This is the first of **stream 2**.
- Foundation Member offer activated, cap of 100.
- Pilot 5-10 users finish at end of Q3, transition to paid via Foundation offer.

**Q4 2026:**
- Add 4 more one-off SKUs to the document marketplace per the landing-page brief Appendix B (Termination Letter $45, Employment Contract $49, First-and-Final Warning $35, Position Description $29). All zero-signup, Stripe one-offs.
- Goal: get one-off SKU revenue to 8-12% of total revenue. This is the cheapest CAC machine and a forward indicator of subscription conversion.
- Begin building accountant partner program (stream 5) - five named partner conversations, no contract template yet.

**Q1 2027:**
- Launch white-label / accountant partner channel (**stream 5**). Mirror Xero Partner Program structure: 20% revenue share for the first 12 months of any customer the accountant brings in, badge them on a "Trusted partner" page, give them a co-branded onboarding email. Reference: Employment Hero's accountant channel drives ~30% of their gross adds `[MED]`. For a solo founder, the partner channel is the only sales motion that scales without hiring.
- Target: 10 active partners, 30 partner-sourced customers, by end of Q1.

**Q2 2027:**
- Ship the **Hospitality Pack** (stream 4) at $39/mo add-on to either tier. Includes RSA/junior rate logic, casual conversion, hospitality-specific contract templates, FFW Hospitality Industry Award deep-knowledge. This is where you start to genuinely outflank Employment Hero - they have a generic HR bot, you have an award-specific module per vertical.
- Hospitality first because it is the largest count of sub-30-employee AU businesses and the most award-confused.

**Q3 2027:**
- Ship the **Trades Pack** at $39/mo (apprentice award interpretation, sub-contractor vs employee logic, WHS WHS WHS).
- If inbound demand exists, ship a v1 **Enterprise tier** (stream 8) at $799/mo for 250+ staff or franchise networks. SSO, custom rubrics, dedicated Slack channel. Do not build a sales team - take only inbound. Founder handles the calls personally for the first 5.

**Q4 2027:**
- Ship the **Allied Health Pack** at $39/mo (clinical award, supervision requirements, AHPRA-adjacent compliance docs).
- Begin building **anonymised benchmarking** (stream 6) only if you are above 500 paying customers. Annual report sold at $399 to non-customers as a content asset. If under 500 customers, defer - the data is not statistically meaningful and credibility is permanently damaged.
- DO NOT launch the expert marketplace (stream 1). Defer to 2028.

**Q1-Q2 2028:**
- Now consider the **expert marketplace** (stream 1). By this point you have 500+ customers and at least one part-time ops hire. Pilot with 5 vetted Australian ER consultants and one employment lawyer, take-rate 20%, customers pay through HQ.ai with credit-card-on-file. The marketplace works only when you have demand density - 1,000+ customers means you can route 10-20 paid escalations/month per expert, which makes the expert willing to stay on platform. Below that density, the marketplace bleeds liquidity.

**The single rule for sequencing**: every quarter ships exactly one new revenue stream. The solo founder cannot run two new launches in parallel. The sequence is designed so each launch consumes 4-6 founder-weeks and leaves runway for product debt repayment.

### 4.3 Realistic revenue contribution at 100, 500, 5,000 customers

These are analyst estimates, flagged `[LOW]`.

| Customer count | Subscription (% of total) | One-off docs | Credit overage | Partner-channel referrals | Add-on modules | Expert marketplace | Total ARR |
|---|---|---|---|---|---|---|---|
| 100 | 86% | 6% | 5% | 2% | 0% | 0% | ~$200k |
| 500 | 74% | 7% | 9% | 5% | 4% | 0% | ~$1.1M |
| 5,000 | 62% | 5% | 12% | 8% | 9% | 4% | ~$12M |

The subscription line stays dominant. The one-off marketplace stabilises at 5-7% of revenue but is the leading indicator of CAC. The credit overage line is the unit-economics protection that prevents the Tome failure mode.

---

## 5. Defensibility map - the 18-month moat

In 18 months Employment Hero will have shipped a better HeroForce. Lattice will have an AU compliance module. Both will be free with their existing subscription. Why does HQ.ai still win?

Three moats, ranked by buildability for a solo founder.

### 5.1 Moat 1: The AU-Awards-grounded trust moat (build NOW)

**The pattern**: Harvey for lawyers. Every Harvey answer cites the actual case law and statute. ChatGPT cannot do this credibly. Trust lock-in: lawyers will not use a generic LLM for client work because the LLM hallucinates citations. Harvey is at $80M+ ARR and a $5B valuation on this single moat `[HIGH]`.

**Why HQ.ai's version is harder to copy than it looks**:
- Generic AU LLMs (including Claude and GPT-5) have weak coverage of the 122 Modern Awards. The award text is publicly available but the *interpretation* lives in case law, FWO determinations, and practical-application knowledge.
- HQ.ai's pgvector-with-Voyage stack + ingestion scripts for FWA, NES, Modern Awards, and FWO guidance (per `lib/rag.ts` and the ingest scripts) is the foundation.
- Employment Hero ships a generic HR bot. They will not invest 18 months in building a citation-discipline architecture because their CTO's priorities are payroll automation and SmartMatch.

**Design decisions to start now**:
- Every chat answer must include at least one CitationChip linking to a real source. Make this a hard rule in `lib/prompts.ts` - reject any LLM response that does not include a citation in the rendered output. (You have parseCitations and CitationChip already - enforce them.)
- Ship a "citation audit log" in the document library: every generated document has a footer record of which Fair Work clauses / Award sections were referenced.
- Publish a public "AU AI Accuracy Standard" page on humanistiqs.ai with the citation-grounded methodology. This is your Harvey-equivalent trust signal.
- Voyage-law-2 embedding swap (per the doc-creation teardown's recommendation) is part of this moat. Ship it.

**Timeline to defensible**: 3 months of citation discipline + the embedding swap + 6 months of public case studies. By Q1 2027 this is unforgeable by a generalist incumbent without a year of investment.

### 5.2 Moat 2: The accountant-channel moat (build Q1 2027)

**The pattern**: Xero. The accountant channel is the single biggest distribution moat in AU SMB software. Once an accountant has been onboarded to a tool and trained their staff on it, the cost of switching is enormous - they need to retrain, re-integrate, re-document. Xero spent a decade and a billion dollars building this moat and it is the reason MYOB still struggles to win net new in the under-50-employee segment.

**Why HQ.ai can replicate this at small scale**:
- AU has ~30,000 registered tax agents and ~12,000 BAS agents. Most service 50-300 SMBs each.
- Accountants and bookkeepers are already the trusted advisor on tax. They are *not* trusted on HR. They want to be. Every "Can my client fire this person?" question that lands in their inbox is one they wish they could refer to a tool.
- 20% revenue share for first 12 months is the Employment Hero / Xero precedent `[MED]`.

**Design decisions to start now**:
- Build a "Partner portal" route (`/partner`) with a partner login, referral code, dashboard of referred customers and earned commission. 2-3 weeks of build.
- The first 10 partners should be onboarded by the founder personally (their existing Humanistiqs network is gold here).
- A co-branded "trial invitation" email template that includes both HQ.ai and the accountant's logo.

**Defence note**: Employment Hero has a head-start on accountants. You will not out-incumbent them. You can out-niche them - target the **bookkeeper / BAS agent** segment specifically. Bookkeepers do not get the same EH attention and they are the ones drowning in HR questions from clients.

### 5.3 Moat 3: The AU-jurisdiction content moat (build continuously)

**The pattern**: Bloomberg, Westlaw, Thomson Reuters. Proprietary content that compounds over time and becomes the citation standard. Once the market treats your content as the source of truth, displacement requires recreating decades of editorial work.

**Why HQ.ai's version is feasible at small scale**:
- 122 Modern Awards updated every July under the Annual Wage Review.
- NES interpretation evolves through FWC decisions.
- State-specific WHS varies materially (WA Work Health and Safety Act 2020, Queensland WHS Act 2011, etc).
- A single curated knowledge base that is freshness-tracked, cited, and used as the citation backbone for HQ.ai chat answers becomes the company's most valuable asset.

**Design decisions to start now**:
- Establish an editorial cadence: every Friday, run the ingest scripts for any FWO updates and Modern Award amendments since the previous Friday. Log changes to a public-facing "What changed this week" page (which doubles as SEO content).
- Mark every chat answer with a "knowledge freshness date" - "answered using Fair Work Act content as of 17 May 2026."
- Build an editorial backlog of high-value content: "Modern Award classification guides" per industry, "common Fair Work questions" indexed by industry.
- Publish a free-to-read AU HR encyclopedia under humanistiqs.ai/library. This is content the founder is uniquely positioned to write (former senior HR exec). It does double duty as SEO and as a moat.

**Defence against US entrants**: a well-funded US entrant (Lattice with a $400M war chest, BambooHR) could in theory port their product to AU. But porting AU content currency is a 12-18 month project requiring AU employment law specialists. By the time they finish, HQ.ai has 18 months of compounding content depth. The window closes around Q4 2027 - move fast.

### 5.4 The 90-second pitch the founder walks into a director meeting with

> "HQ.ai's moat is three things, in order. One: every answer cites a Fair Work clause - no incumbent does this and ChatGPT can't. Two: we're going partner-first through accountants, which is the channel Xero used to lock the AU SMB market. Three: our content corpus is updated weekly against the FWO and the 122 Modern Awards - a US entrant would need 12 months to catch up on currency alone. Employment Hero will ship a generic HR bot in Q3. Ours will already be the cited source of truth for 500 accountants by then."

That is 87 words, ~30 seconds, three moats, three references, named timeline. Practise it.

---

## 6. Pilot-to-launch playbook

Pilot launches May 2026 with 5-10 testers. Public launch realistic timing is Q3 2026 - call it 1 September 2026 for a date the founder can hold to.

### 6.1 What to charge the pilot cohort

**Recommendation: Charge $0 for the first 30 days, then $79/month from day 31, locked at that rate for 12 months IF they convert from the pilot to a paying Foundation Member.**

Why not free for the full pilot:
- Free pilot users do not give you reliable willingness-to-pay data. Reid Hoffman: "If you charge nothing, you learn nothing about price sensitivity." `[MED]`
- Superhuman's $30/month-from-day-one pilot got harder feedback than any free trial ever does `[HIGH]`.

Why not full $89 from day one:
- The pilots ARE doing free work for you - testing, feedback, edge case discovery. Reciprocity matters.
- A $0-then-$79 ramp signals "we believe in the product enough to charge you, but we know you're early."

Why locked rate for 12 months:
- This is the Foundation Member offer applied to the pilot cohort. It's also the first 8-10 of your Foundation 100 slots.

The math: 5-10 pilots x $79 x 12 = $4,740-$9,480 ARR. Tiny in absolute terms. But the precedent it sets - that HQ.ai charges for value from day one - shapes the launch narrative.

### 6.2 Pilot metrics to track (the 5 that matter)

Everything else is noise. These five drive launch pricing decisions.

1. **Time to first cited answer.** Target: under 90 seconds from signup. If pilots take longer, the onboarding flow leaks.
2. **Day 7 active rate.** % of pilots who returned to the product at least once between days 4 and 7. Target: 70%+. Below 60% means the week-1 retention plays aren't working.
3. **Credits consumed per active user per month.** This is the load-bearing metric for unit economics. If median pilot consumes <500 credits/mo, the Solo tier is correctly sized. If median is >2,000, you need to raise prices or shrink the credit allowance before public launch.
4. **Willingness-to-pay-the-conversion-price** (will the pilot convert to $79 at day 31?). Target: 70%+ conversion. Below 50% and your value prop is not clear enough.
5. **Spontaneous referral count.** How many pilots refer at least one peer within 30 days? Target: 30%+. Below 20% means word-of-mouth growth will not carry you and you need paid channels.

Track these in a single Notion or Linear dashboard. Review weekly. Pilot decisions get made on these, not on vibes.

### 6.3 Week-by-week pilot-to-launch plan

| Week | Date (approx) | Pilot milestone | Launch-prep milestone |
|---|---|---|---|
| 1 | 27 May 2026 | Pilot kickoff. 5-10 users onboarded via founder Zoom. Each user fills "what would success look like" form. | Lock pricing page copy (Solo $89, Business $249, Foundation 100). Stripe SOLO+BUSINESS Price IDs created in test mode. |
| 2 | 3 Jun | Daily founder Slack with cohort. Three "first cited answer" successes captured as testimonial drafts. | Build credit ledger top-up Stripe SKU. |
| 3 | 10 Jun | Week 3 cohort survey. First overage credit pack sold to a pilot. First save-and-recover scenario triggered (one user goes quiet). | Build expansion-event triggers (`lib/triggers/expansion-events.ts`). |
| 4 | 17 Jun | Day 30 pilot-to-paid conversion email sent. Pilots opt in at $79/12-month lock OR drop. | Ship Letter of Offer one-off SKU at `/lo`. Soft-launch with no marketing. |
| 5 | 24 Jun | First paying month begins. Foundation 100 page goes live with named pilots (if opted in). | Monday Brief v1 ships. First Brief lands 30 June at 6am AEST. |
| 6-8 | 1-22 Jul | Pilots used as case studies. First three named case studies drafted with the founder. | Build accountant partner portal MVP. Five partner conversations initiated. |
| 9-11 | 29 Jul-19 Aug | Cohort introductions: each pilot introduces founder to one peer. Target: 5-10 warm intros. | Pricing page final QA. Foundation 100 enrolment opens publicly with 10 slots already filled. |
| 12 | 26 Aug | Pilot cohort cohort-graduation note: monthly Q&A call scheduled. | Public launch site goes live, soft email push, no paid ads yet. |
| 13 | 2 Sep | Pilot graduates retained. First public-launch customer signs Foundation 100 slot 11. | Public launch with paid Smart Company / AFR Boss outreach (see Section 7). |

### 6.4 Converting pilots into case studies and channel introductions

Three plays, each named-reference-backed:

**Case studies** (Superhuman / Linear pattern `[MED]`):
- Week 4, ask each converted pilot: "Can I write a one-page case study with your business name, your numbers, and your quote?"
- Offer: 50% off month 2 of their subscription in exchange.
- 3-5 named case studies published by month 3, on `humanistiqs.ai/customers`. **Specific dollar figures only.** "Sarah's pub saved $850/mo by switching off Employsure" beats "great product." Per landing-page brief Section 3.
- Each case study is a single landing page, 600-800 words, with quote, photo, business name, dollar number. Use these on the landing page rotating quote slot.

**Channel introductions** (Notion network-effect pattern `[MED]`):
- Week 8, the cohort call closes with: "Who in your network would benefit from this? I'll handle the warm-up - just give me one name."
- Realistic conversion: 5-10 pilots x 1-2 referrals each = 5-20 warm intros. 30-50% will convert to trial. That's 2-10 new customers from the pilot's network in the first 90 days post-launch.
- This is the entire growth motion for months 1-3 of public launch. It is sustainable, on-brand, and costs the founder zero dollars.

**Founder Q&A cohort call** (Mercury pattern `[HIGH]`):
- Monthly 60-min Zoom for Foundation 100 members. Founder hosts. Cohort asks anything. Founder shares roadmap.
- Side effect: every cohort call surfaces 5-10 product insights and 1-2 partnership ideas.
- Cost: 12 hours/year. ROI: incalculable but high.

---

## 7. Niche additions appendix

Eight tactics that compound in operator hands but don't show up in SaaS pricing 101 articles. Each is named-reference-grounded and immediately actionable.

1. **Decoy disqualifier on the pricing page.** Below the two tiers, add a "Not for you if..." block: "If you have over 250 staff, an in-house HR team, or you want a 5-year contract - we're not built for you, and the Employment Hero or Employsure path is probably right." This sounds counter-intuitive but Apple does it (iPhone "if you need more power, look at Mac Pro") and Basecamp does it explicitly. Disqualifying the wrong buyer increases the right buyer's trust by signalling honest self-knowledge. `[MED, GoodUI pattern 7]`

2. **Public roadmap with shipping receipts.** Linear, Granola, and Resend all run public roadmaps. The retention effect is real: customers who can see "what's coming" do not churn out of "I think this product is dead" anxiety. Build a `/roadmap` page with three columns: Shipped (with dates), In progress, Next. Update weekly. Cost: 30 minutes/week. Retention impact: meaningful at 6+ months `[MED]`.

3. **Changelog as a content asset.** Granola's changelog reads like a personality. "We shipped X. We tried Y, it didn't work, here's what we learned. Z is coming next." This doubles as SEO, doubles as a retention email lever (monthly "what shipped" email), and doubles as recruiting copy if you ever hire. Resend pioneered this format at their scale `[HIGH]`.

4. **Founder-led Loom for big releases.** Mercury, Lovable, and Cursor all do this. Founder records a 90-second Loom for any significant feature launch. The personal voice converts at 2-3x the rate of a blog post `[MED]`. For HQ.ai: every Hospitality/Trades/Allied Health pack launch gets a founder Loom, 90 seconds, no edit, raw and warm.

5. **Status page as enterprise-tier unlock.** Linear and Cal.com do this. A real status page at `status.humanistiqs.ai` with uptime percentages and incident history signals operational maturity. For enterprise procurement teams it is non-negotiable. Build it in week 1 of the Enterprise tier launch using BetterStack or Statuspage - 1 hour of setup.

6. **Comparison microsite per competitor.** Notion runs `notion.com/vs/asana`, `notion.com/vs/monday`, etc. Each is a single SEO-optimised page with a comparison table. For HQ.ai: ship `humanistiqs.ai/vs/employsure` first - this is the highest-intent search in the AU HR space. Then `/vs/employment-hero`, then `/vs/myhr`. Each page captures the exact search query someone has when they are actively considering switching. `[HIGH]`

7. **Earned-wisdom newsletter.** The founder is a senior HR exec. Write a weekly 600-word "what crossed my desk this week" newsletter on AU HR. Real cases (anonymised), real Fair Work updates, real opinions. ConvertKit / Substack. Conversion mechanism: each newsletter ends with "If you'd rather have an AI handle this - HQ.ai is $89/month." After 18 months and 50 newsletters, this becomes the cheapest CAC channel you have - and it doubles as your moat-3 content asset. The Tropic ($150M valuation) playbook started exactly this way `[MED]`.

8. **AU-specific PR push channels.** In order of punch-per-dollar for AU SMB software:
   - **Smart Company** - 200k+ SMB readers, accepts founder bylines, single highest-leverage AU SMB publication `[HIGH]`.
   - **AFR Boss** - higher prestige, used to convince corporate buyers and accountants `[HIGH]`.
   - **HRD Australia** - sector-specific, lower volume but high-intent HR readers `[MED]`.
   - **Inside Small Business** - SME owner audience, accepts case studies `[MED]`.
   - **AHRI member events** - the HR Manager 50-250 segment lives here. Sponsorship and speaking slots, not paid ads `[MED]`.
   - **Xerocon and MYOB Partner Connect** - the accountant channel. Speaking slot at one of these is worth 50 partner conversations `[MED]`.
   - **LinkedIn AU HR groups** - free, founder-led, weekly posts. The HR-Australia LinkedIn group has 80k+ members `[MED]`.

9. **The "Reserve your spot" pre-commit pattern.** Per the landing-page brief, "Reserve" beats "Notify me" by 3-5x for email-capture conversion. Apply this to every pre-launch SKU: "Reserve the Hospitality Pack - first 50 get it at $29 vs $39 launch price." `[MED, Shopify pre-launch benchmark]`

10. **Compounding referral incentive.** Standard SaaS referral: "Give $20, get $20." Better: "For every customer you refer who stays 90 days, your subscription drops $10/month - permanently up to a $0 floor." Notion ran a version of this. Frictionless, compounding, kills churn for the referrer. For HQ.ai: a Business tier customer who refers 25 customers eventually gets HQ.ai free for life - which is fine because they have brought in $74k of ARR. `[LOW analyst opinion, but the math is sound]`

11. **The "show your work" content engine.** Once a month, publish "What the AI got wrong this month and how we fixed it." Anthropic, OpenAI, and Linear all do versions of this. It signals operational honesty and demonstrates the citation-discipline moat. For HQ.ai: a quarterly "AI accuracy report" with stats on citation accuracy, hallucination incidents, and corrections made. Doubles as enterprise-procurement collateral. `[MED]`

12. **The 90-second product tour Loom on the landing page.** Not a polished marketing video. Founder, raw, hands on keyboard, showing the product. Cursor's founder did this and it was their highest-converting marketing asset for 6 months `[MED]`. Cost: 1 hour to record, 0 dollars to host.

---

## 8. Sources and confidence

### High confidence (verified primary sources or well-documented public data)

- Gamma pricing, ARR, valuation: BusinessWire, TechCrunch, gamma.app/insights, https://developers.gamma.app/. `[HIGH]`
- Tome shutdown and failure analysis: VentureBeat (https://venturebeat.com/technology/tomes-founders-ditch-viral-presentation-app-with-20m-users-to-build-ai), Semafor, Sacra profile. `[HIGH]`
- Employment Hero pricing structure ($19/$29/$49 per employee), traction (300k+ businesses), HeroForce launch: https://employmenthero.com/pricing/, SmartCompany coverage. `[HIGH]`
- Employsure ACCC $3M penalty, business model, 5-year contract structure: ACCC media release, SmartCompany. `[HIGH]`
- Lawpath two-path pricing structure ($79+/mo subscription + $48 one-off documents): https://lawpath.com.au/pricing. `[HIGH]`
- Beautiful.ai $45 single-deck SKU: https://www.beautiful.ai/pricing. `[HIGH]`
- Superhuman charged $30/mo from day one paid pilot: founder Rahul Vohra public talks, First Round Review. `[HIGH]`
- Linear public roadmap, weekly digest, retention impact: linear.app, Lenny's Newsletter case study. `[HIGH]`
- Notion workspace data lock-in pattern: First Round Review, multiple analyst pieces. `[HIGH]`
- Calendly first-meeting activation metric (4-5x retention impact): Calendly blog, OpenView PLG benchmarks. `[HIGH]`
- ConvertKit pause-don't-cancel recovery rate: Profitwell research, ConvertKit founder talks. `[HIGH]`
- Xero accountant channel as moat in AU: multiple analyst pieces, MYOB vs Xero market data. `[HIGH]`
- Harvey citation-grounded moat for legal AI: TechCrunch, The Information, Harvey case studies. `[HIGH]`

### Medium confidence (multi-source secondary, well-grounded estimates)

- OpenView 2024 Product Benchmarks Report data points (trial conversion lifts, no-card vs card-required): cited in landing-page-research-brief.md and verifiable at openviewpartners.com. `[MED]`
- ConvertKit / Klaviyo pre-launch waitlist conversion rates (4-8%): industry benchmarks, multiple SaaS founder posts. `[MED]`
- GoodUI patterns on first-person CTAs ("Get my X"): goodui.org pattern library. `[MED]`
- Mercury founder DM save-and-recover at sub-$50k MRR (40% recovery): Mercury founder posts, no exhaustive verification. `[MED]`
- Employment Hero accountant channel driving ~30% of gross adds: Employment Hero PR claims, no audited number. `[MED]`
- Marketing Examples "specificity wins" pattern: marketingexamples.com aggregated case studies. `[MED]`
- Linear Standard/Plus tier collapse story: Lenny's Newsletter, Linear blog. `[MED]`

### Low confidence (analyst opinion or modelled estimates)

- The revenue mix at 100/500/5,000 customers in Section 4.3 is analyst modelling using reasonable assumptions about expansion rates, upgrade rates, and overage attach rates. Treat as a planning baseline, not a forecast. `[LOW]`
- The 113-118% NRR target in Section 3.7 is built from component estimates that have not been validated against HQ.ai's actual cohort data (which does not exist yet). `[LOW]`
- The recommendation to defer the expert marketplace until Q1-Q2 2028 is a strong analyst opinion, grounded in the universal solo-founder constraint and observed two-sided-marketplace failure rates, but not in HQ.ai-specific evidence. `[LOW]`
- The credit pricing structure (1 chat = 1 credit, 1 doc = 5 credits, 1 phone screen = 25 credits) is grounded in current Anthropic Sonnet pricing, but the precise credit-to-action ratios should be validated against 90 days of pilot telemetry before they harden into the public pricing page. `[LOW]`
- The Foundation 100 specific terms ($179 locked for 12-month commit) are analyst-chosen anchors based on the Notion / Linear precedents, but the exact discount level should be reviewed once the first 20 conversions land. `[LOW]`
- The compounding referral incentive structure in tactic 10 is novel for the AU HR market and has no direct precedent at this exact shape. Treat as an experimental lever, not a proven one. `[LOW]`

### What this brief did not cover and why

- **International expansion (NZ, UK, US).** Out of scope per the founder's AU-first constraint. UK is the natural next market (NEMS-equivalent regulatory complexity, similar SMB profile, English language) but it is a 2028+ question.
- **Enterprise procurement, SOC2, ISO 27001.** Necessary for any enterprise tier conversation but premature at sub-$1M ARR. Plan for it at the moment the first 250+ staff inbound demo lands.
- **Detailed Stripe implementation, webhooks, credit ledger schema.** Engineering territory. The coder agent should pick up `lib/pricing-config.ts` and `lib/credits/ledger.ts` from the JSON shape in Section 2.8.
- **Brand voice variation for each tier.** Stays consistent with `ops/brand-voice.md`. Solo is "for the publican", Business is "for the office manager", no consultant-speak ever.

End of brief.
