# HQ.ai Enterprise Tier - Strategy and Pricing

**Date**: 2026-05-21
**Author**: Strategy (internal), based on the retention-and-monetisation brief plus the founder's Enterprise positioning intent.
**Audience**: Founder. Long-form internal reference.
**Companion doc**: `enterprise-tier-director-summary.md` (one-page, share to directors).

---

## 1. The strategic frame

The brief (Section 4.2) deferred the Enterprise tier to Q3 2027, on the grounds that a solo founder shouldn't run two new launches in parallel. That call still holds for an Enterprise tier shaped like Linear Enterprise or Notion Enterprise - heavy procurement, SSO, custom rubrics, $799/mo seat plans.

The founder is now asking for something different. The Enterprise tier becomes the **explicit human layer on top of the AI**. The Humanistiqs Advisor (or Talent Partner) is the product. The AI tool is included. The framing is "AI plus HQ" - HQ standing in for Human Intelligence and Judgement, which doubles as the brand mark.

This is a much sharper product than a generic enterprise SaaS tier. It is also the only way the Humanistiqs brand asset (the founder's network of senior HR practitioners) gets monetised at scale. The Business tier sells the tool. The Enterprise tier sells the partner.

That reframing changes three things in the brief's reasoning:
- It is **not** a marketplace play (deferred to 2028). It is a productised consulting service with the AI as leverage.
- Capacity, not LLM cost, is the binding constraint. Pricing has to protect the advisor calendar.
- Margin shape is different - human time is the cost line, not tokens.

The rest of this document works out what that means for pricing, packaging, sales motion, capacity model, and code.

## 2. The three variants

Three SKUs only. More than that creates a packaging matrix the founder cannot brief consistently to a buyer in 60 seconds.

### 2.1 HQ People Enterprise - the "general counsel on retainer" SKU

**The buyer story**: a 40-150-staff Australian business that has someone in an Office Manager / Operations Lead / Finance Director seat trying to handle HR alongside their actual job. They've used HQ.ai Business for a few months. They love the AI for the 80% of questions that are clear. For the 20% that aren't (a probation termination, an investigation, a redundancy round, a complex parental leave overlap), they want a human voice on the phone within the hour.

**What's included**:
- Everything in Business tier (15 seats, 2,500 credits, unlimited recruit roles).
- **Named Humanistiqs Advisor.** Same person every time. Photo, bio, direct mobile.
- **Two scheduled 45-minute advisory calls per month.** Standing weekly slot or fortnightly cadence. Customer's choice.
- **Same-business-day response SLA** on Slack/email advisory queries. Practical cap "reasonable use" - typical customer uses 4-6 substantive queries per month beyond the calls.
- **Quarterly compliance health check** - structured 90-minute review of the customer's HR posture against current FWO and Award changes. Recorded as a deliverable.
- **Roadmap influence** - direct quarterly call with founder, requests can be elevated.

**What is explicitly NOT included**:
- Workplace investigations (refer external specialist, paid).
- Litigation support, FWC representation (refer employment lawyer, paid).
- Drafting custom enterprise agreements (refer ER specialist, paid).
- Out-of-hours/emergency advisory (overage at $400/hr).

**Overage**:
- Additional advisor time beyond included: **$250/hour**, billed in 15-min increments.
- After-hours emergency advisory (defined as outside 8am-6pm AEST weekdays): **$400/hour**, capped at 4 hours/month so the advisor isn't on-call.

### 2.2 HQ Recruit Enterprise - the "talent partner not a recruiter" SKU

**The buyer story**: a 50-250-staff business that hires 12-60 roles per year. They have used HQ Recruit and got real value from it - especially the CV scoring and phone screen agents. But running the funnel, doing the calibration sessions, presenting the shortlist properly, handling candidate care - all of that is a part-time job they don't have time for. An agency would charge $14k per placement (18% of $80k). An internal recruiter would cost $90-110k/year fully loaded. They want neither.

**What's included**:
- Everything in Business tier.
- **Named Humanistiqs Talent Partner** running HQ Recruit on the customer's behalf.
- **Up to 4 active roles concurrent at any moment** (typical throughput 50 closures/year).
- **Weekly role-status calls** with the hiring manager (30 min per role per week, max).
- **Calibration sessions** at role kickoff and after first shortlist to tune the AI rubric.
- **Shortlist delivery** with named recommendations and structured rationale (HQ.ai outputs + Partner's professional judgement, integrated).
- **Hiring manager debrief support** before final interviews.

**What is explicitly NOT included**:
- Executive search (>$150k base roles). Refer Humanistiqs Executive Search team, paid.
- Bulk hiring campaigns (>10 simultaneous opens, e.g. seasonal hospitality). Quoted separately.
- Passive sourcing campaigns / LinkedIn Recruiter outreach. Quoted as an add-on at $1,500/campaign.
- Reference checking (refer to one-off marketplace at $25/check, or done by client).

**Overage**:
- 5th and subsequent concurrent active role: **$750/month per additional role**, billed pro-rata.
- Executive search add-on: **$8,500 per placement** (fixed fee, not contingency).
- Passive sourcing campaign: **$1,500 per 30-day campaign** (LinkedIn Recruiter, email outreach, calendared briefings).

### 2.3 Full Enterprise - People + Recruit, single partner team

**The buyer story**: a 80-250-staff business with both shapes of problem above. The "I want general counsel" problem AND the "I need someone running my hiring funnel" problem. A founder, COO, or Head of People who has decided to lean into HQ.ai as the operating layer for both functions.

**What's included**:
- Everything in HQ People Enterprise AND HQ Recruit Enterprise.
- **Single dedicated partner team** - one Advisor and one Talent Partner who coordinate.
- **Monthly Executive Review** combining both surfaces: workforce posture, hiring pipeline, compliance risk register, action items. Delivered as a recorded session + written brief.
- **Founder check-in twice yearly** (Jimmy Rayner personally).
- **Priority on new module access** (Hospitality Pack, Trades Pack, Allied Health Pack rolling out 2027).

**Overage**: same as the underlying variants.

## 3. Pricing

### 3.1 The numbers

| Variant | Annual contract (monthly equiv) | Annual contract total | Month-to-month rate | Annual saving over month-to-month |
|---|---|---|---|---|
| HQ People Enterprise | $1,495 | $17,940 | $1,795/mo | $3,600/yr |
| HQ Recruit Enterprise | $2,995 | $35,940 | $3,495/mo | $6,000/yr |
| Full Enterprise | $3,995 | $47,940 | $4,495/mo | $5,940/yr |

**Both options offered (founder decision, May 2026).** Annual contract is the headline rate and the calendar-reservation-aligned choice. Month-to-month exists for customers whose cash-flow constraints don't fit a 12-month upfront-or-quarterly commit - some of those customers will stay 12+ months anyway and we'd rather have their MRR than lose them to a "no" at signing.

Month-to-month carries a **~17% premium** (mirror of the Solo/Business 16.7% annual discount band) and a **30-day cancellation notice**. The premium does two jobs:
1. Protects margin against churn-and-rehire calendar burn for the advisor.
2. Makes annual the obvious economic call for any customer expecting to stay - which is the conversation we want them having on the discovery call.

The 30-day notice gives the advisor a clean offboarding window to redistribute work to other customers, rather than a same-day disappearance. Both options billed via Stripe Invoicing; the founder picks the right Stripe Price ID at engagement-letter signing.

### 3.2 Why these numbers, not bigger or smaller

I worked this from three directions and the numbers converge.

**Direction A - cost-plus margin floor**:

| Cost line | HQ People Ent | HQ Recruit Ent | Full Ent |
|---|---|---|---|
| Advisor / Talent Partner hours per month (typical) | 4.5 | 13 | 17 |
| Hourly cost (loaded contractor or salaried equivalent) | $200 | $150 | $200 / $150 mix |
| Direct labour cost/month | $900 | $1,950 | $2,850 |
| AI inference + tool cost | $90 | $130 | $200 |
| Overhead allocation | $80 | $130 | $180 |
| Total direct cost | $1,070 | $2,210 | $3,230 |
| Price | $1,495 | $2,995 | $3,995 |
| Gross margin per month | $425 (28%) | $785 (26%) | $765 (19%) |

The Full Enterprise margin looks thin. That's intentional - the value-add is the integrated team and the founder hours, not the unit economics. Customers buying Full Enterprise are forward-pipeline for new SKUs (Industry Packs at $39/mo each), case studies, and channel referrals. The strategic margin is much higher than the unit margin.

**Direction B - competitive substitution**:

| Customer's current state | What they currently spend/yr | HQ.ai Enterprise alternative | Saving |
|---|---|---|---|
| Office Manager + Employsure retainer + occasional lawyer | $15-25k/yr | HQ People Ent @ $17.9k | Range from saves $7k to costs $3k more, but service is night-and-day |
| Internal part-time HR contractor 2 days/week | $50-70k/yr | HQ People Ent @ $17.9k | $32-52k saved |
| Recruitment agency on contingency for 50 roles | $700k+/yr | HQ Recruit Ent @ $35.9k | $664k saved |
| RPO embedded recruiter | $100-200k/yr | HQ Recruit Ent @ $35.9k | $64-164k saved |
| Internal recruiter + Employsure + part-time HR | $200-260k/yr | Full Enterprise @ $47.9k | $152-212k saved |

The recruitment-side delta is what makes this work. Australian SMEs are paying obscene amounts to contingency agencies and HQ Recruit Enterprise is a 20x cheaper proposition. That is a re-platforming-grade saving and is the spear-tip of the sales conversation.

**Direction C - benchmark against equivalent SaaS + service plays**:

- Lattice + a fractional HR consultant: ~$2,200/mo combined. HQ People Ent at $1,495 undercuts.
- Bullhorn + agency contingency: ~$8k/mo plus per-placement. HQ Recruit Ent at $2,995 undercuts massively if the customer was paying for both.
- HRBP-as-a-service offerings (e.g. People Stack, HR Anchor): $1,200-2,500/mo subscriptions. We sit at the upper end because of the AI tool inclusion - which they don't have.

### 3.3 What we deliberately don't do

- **No published price-per-seat scaling.** Enterprise is a single price regardless of customer headcount within the qualification band (50-250 staff). Pricing per seat would put HQ.ai in the same anchor frame as Employment Hero and that frame loses on volume math.
- **No discounting at sale.** The first 3-5 Enterprise customers might get a Foundation-style anchor ("Inaugural Enterprise Partner: $1,295/mo for 12 months on People Ent") in exchange for a public case study, but the published rate is the rate. Discount discipline is a margin protection.
- **No commission-based sales motion.** No SDRs, no AEs, no quotas. The founder runs the discovery calls personally for the first 10 customers. After that, the highest-judgement Humanistiqs Advisor takes them.
- **No "starter Enterprise" sub-tier.** Three SKUs only. If a customer can't fit any of them, the answer is "stay on Business and book ad-hoc advisor hours at $250/hr".

## 4. Capacity model - the calculation that protects the advisors

This is the most important section in the document. Get this wrong and the service quality collapses inside six months.

### 4.1 Per-advisor capacity

**Humanistiqs Advisor** (HQ People Enterprise side):
- 1.0 FTE equivalent = 140 productive billable hours per month (after admin, internal review, deal support).
- Typical Enterprise customer consumes 4-6 advisor hours per month.
- Theoretical max: 28-35 customers per FTE.
- **Realistic max accounting for peaks, vacations, training, illness: 18-22 customers per FTE.**

**Humanistiqs Talent Partner** (HQ Recruit Enterprise side):
- 1.0 FTE equivalent = 140 productive hours per month.
- Typical Enterprise customer consumes 13-18 hours per month (across 4 concurrent roles).
- Theoretical max: 8-11 customers per FTE.
- **Realistic max: 6-8 customers per FTE.**

**Full Enterprise** consumes both surfaces. A Full Enterprise customer counts as 1 unit on each side.

### 4.2 Year-1 capacity envelope

The founder + 1-2 contract advisors can absorb:

| Resource | FTE | People Ent slots | Recruit Ent slots |
|---|---|---|---|
| Jimmy (founder) | 0.4 FTE on Enterprise | 6-8 | n/a (founder doesn't take direct recruit work) |
| Humanistiqs Advisor 1 (contract) | 0.6 FTE | 8-12 | n/a |
| Talent Partner 1 (contract) | 0.7 FTE | n/a | 4-5 |
| **Year-1 max** | | **~20 People Ent slots** | **~5 Recruit Ent slots** |

**Hard cap for year 1: 10 Enterprise customers total**, weighted toward HQ People Enterprise (which is the bigger market and the lower-capacity ask). Publish this cap on the landing page - it doubles as scarcity-driven conversion.

### 4.3 Hiring trigger

When the 10-customer cap is filled, before opening more slots:
- Hire one additional contract Humanistiqs Advisor (target: senior ex-HR Director, 15+ years, AU only).
- Hire one additional contract Talent Partner (target: ex in-house TA Lead, 10+ years).

Cost: ~$200k/yr loaded for both contractors. Need ~6 new Enterprise customers to break even on the hire. Hire the moment customer 9 lands, not after customer 10 - the lead time on senior contractor placement is 6-10 weeks.

### 4.4 What happens when an Enterprise customer overloads

The contract permits the partner to flag "intensive month" twice per year. In an intensive month, the advisor surfaces three options:
1. Defer non-urgent items to the following month.
2. Bring in a second Humanistiqs advisor for the spike at the published overage rate.
3. Refer the specific intensive work (e.g. major redundancy round) to a specialist partner at the customer's expense.

Document this in the engagement letter. The constraint is genuine and the customer needs to know the operating boundary.

## 5. Sales funnel - founder-led, four-stage

No outbound sales. No cold email. The funnel is short and qualified:

```
[Landing page]
   ↓ Pricing section shows Enterprise card with "From $1,495/mo" and CTA
[/enterprise page]
   ↓ Three variants explained, qualifying criteria visible, capacity cap stated
[Discovery call form]
   ↓ Form submission triggers founder email + saves to enterprise_inquiries
[Founder discovery call (within 48h)]
   ↓ 30-minute qualification + scoping conversation. Founder personally for first 10.
[Scoping doc + proposal]
   ↓ Within 5 business days post-call. PDF + Stripe Invoice draft.
[Engagement letter signed + Stripe payment]
   ↓ Annual contract executed via Stripe Invoicing. Day 0.
[30-day onboarding sprint]
   ↓ Named partner assigned, tool walkthrough, goal definition, cadence locked.
[Ongoing partnership]
```

### 5.1 Qualifying criteria - what the inquiry form asks

Required for the system to surface a "qualified" tag to the founder:
- Business size: 30+ staff (gate). Below this, recommend Business tier.
- Sector: AU-based business under Australian employment law.
- Specific shape: which variant they're interested in (People / Recruit / Full).
- Current spend: "What are you currently spending on HR retainer / recruitment / advisory?" - free text, helps qualify pricing fit.
- Urgency: "When do you need this in place?" (single-select: This month / Next month / Within quarter / Just exploring).

Submissions that don't meet the staff-size gate get an automated email recommending Business tier + a calendar link to a 15-min call if they still want it. The founder doesn't get notified for those - the form pre-filters.

### 5.2 Founder's qualification checklist (off-page)

When a qualified inquiry lands, the founder runs through this in 5 minutes before booking the discovery call:
- Linkedin look at the business: real company, plausible size, plausible sector.
- Two-question gut check: "Could I confidently deliver value to this customer for 12 months?" and "Does this customer fit the Humanistiqs voice?" - if either is no, decline politely and refer to a partner.
- Diary check: do we have a slot in the capacity envelope?

### 5.3 Discovery call structure (30 minutes)

- 5 min: their situation, current spend, frustration vector.
- 10 min: tool demonstration tailored to the variant they're interested in.
- 5 min: what's included, what isn't, hard numbers.
- 5 min: pricing and commercials, no flinching.
- 5 min: next steps - scoping doc within 5 days, decision window.

### 5.4 Post-sign onboarding (30-day sprint)

| Day | Activity | Owner |
|---|---|---|
| 0 | Kickoff email + calendar invites | Partner |
| 2 | Tool walkthrough call (60 min) | Partner |
| 5 | Knowledge ingestion of customer policies | Partner + customer admin |
| 10 | Goal definition workshop | Partner + customer exec sponsor |
| 14 | First scheduled advisory call OR first role calibration | Partner |
| 21 | Operating cadence locked (weekly/fortnightly/monthly mix) | Partner |
| 30 | 30-day review + adjustment | Partner + customer exec |

## 6. Margin and unit economics over time

### 6.1 Year 1 (May 2026 - April 2027)

| Metric | People Ent | Recruit Ent | Full Ent | Total |
|---|---|---|---|---|
| Customers (year-end) | 5 | 2 | 3 | 10 |
| ARR | $89,700 | $71,880 | $143,820 | **$305,400** |
| Direct labour cost | $54,000 | $46,800 | $102,600 | $203,400 |
| Tool + overhead | $10,200 | $6,000 | $13,680 | $29,880 |
| Gross margin | $25,500 | $19,080 | $27,540 | **$72,120 (24%)** |

Year-1 Enterprise gross margin is modest in $ terms but **strategically priceless**: 10 named partnerships, 3-5 case studies, 20-30 warm partner referrals out of those partnerships.

### 6.2 Year 2 (assuming one additional Humanistiqs Advisor + Talent Partner hired)

| Metric | Total at end of Year 2 |
|---|---|
| Customers | 28 (scaled within new capacity envelope) |
| ARR | ~$855,000 |
| Direct labour | $480,000 (incl new hires) |
| Tool + overhead | $84,000 |
| Gross margin | $291,000 (34%) |

Margin improves because (a) the founder's time is no longer the bottleneck, (b) the senior hires can serve more customers per FTE as systems mature, (c) overage revenue compounds (~12% of customers will buy at least one overage hour or extra role per quarter).

### 6.3 The non-cash margin

Three forms of revenue that don't show on the Enterprise unit-economics table but compound from it:
- **Case studies**: each Enterprise customer becomes a 600-800 word named case study with dollar figures. Per the landing-page brief, these are the highest-converting marketing asset HQ.ai will ever have. Cost: $0 to produce in-flow with the customer.
- **Partner referrals**: Enterprise customers refer peers at 2-3x the rate of Business tier customers (their CEO/COO is more networked, the spend is higher and more discussed). Each Enterprise customer brings ~1.5 net new Business tier customers by year-end via referral. That's $89.7k of indirect ARR per cohort.
- **Channel introductions**: an Enterprise customer in hospitality with a connected accountant or BAS agent contact opens the partner-channel doors that the brief flagged as the next moat. The founder should walk every Enterprise customer through a quarterly "who in your network would benefit from this" question.

## 7. Risks and how we mitigate them

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Advisor over-utilisation collapses service | M | H | Hard 2-customer-per-FTE-month buffer in capacity model; "intensive month" mechanic; published 18-22 customer cap per FTE |
| Customer treats it as bespoke consulting (unlimited scope) | H | M | Engagement letter explicit on inclusions/exclusions; overage is mechanical, not a renegotiation |
| First advisor hire is wrong fit | M | H | 3-month probation in contractor contract; founder shadow on first 5 calls per new hire; explicit calibration of Humanistiqs voice in onboarding |
| Founder gets pulled away from product into delivery | H | H | Cap founder Enterprise hours at 0.4 FTE; founder doesn't take direct role-running work, only People Ent + executive reviews on Full Ent |
| Discovery call conversion is low | M | M | First 10 customers are largely warm intros from existing Humanistiqs network; founder runs them personally; conversion expected >50% on this cohort |
| Customer churns mid-contract | M | M | Annual contract structure; pause-don't-cancel option at 6+ months in (frozen mid-contract, no refund, resumes when ready) |
| Margin compression as the bench grows | L | M | Annual price review at year-end; lock new customers at refreshed rates; existing customers honour their signed rate |
| Advisor burnout | M | H | 4-customer absolute monthly cap per Talent Partner; mandatory quarterly review of utilisation with founder; built-in defer-an-intensive-month mechanic |
| Regulatory / professional indemnity exposure | M | H | Standard advisory professional indemnity policy; engagement letter language ("guidance not legal advice"); refer all litigation/EA work to qualified employment lawyers as paid referrals |

## 8. Implementation - what gets built this sprint

This document drives the following code work (a separate coder agent has the spec):

1. **`lib/pricing-config.ts`** - add `ENTERPRISE` block with the three variants, their pricing, inclusions, exclusions, and overage rates. Same single-source-of-truth pattern as Solo/Business.
2. **`lib/stripe.ts`** - register the three Enterprise plan IDs but mark them `salesAssisted: true` so the checkout route refuses public checkout and surfaces "Contact sales" instead.
3. **`components/landing/PricingSection.tsx`** - add an Enterprise card below the Solo/Business grid. No public monthly price displayed - "From $1,495/mo" or "Talk to us" with a CTA to /enterprise.
4. **`app/enterprise/page.tsx`** - new dedicated page. Hero explains the AI-plus-HQ frame, three variant cards, qualifying criteria, capacity cap signal, inquiry form.
5. **`components/enterprise/InquiryForm.tsx`** - client-side form. Posts to /api/enterprise-inquiry.
6. **`app/api/enterprise-inquiry/route.ts`** - server route. Saves to enterprise_inquiries Supabase table, emails founder via Resend, sends confirmation to inquirer.
7. **`supabase/migrations/enterprise_inquiries.sql`** - new table.
8. **`components/landing/FaqSection.tsx`** - new Enterprise FAQ entry between current entries.
9. **`lib/email.ts`** - new `sendEnterpriseInquiryEmail` and `sendEnterpriseInquiryConfirmation` helpers.

## 9. Open questions (founder to decide)

1. **Founder availability for first 10 discovery calls**: confirm 0.4 FTE allocation is realistic. If founder thinks 0.3, we cap year-1 at 8 not 10.
2. **First contract Humanistiqs Advisor candidate**: do we have a named person? If so, the year-1 capacity envelope can lift to 12.
3. **Stripe billing mode**: annual invoice paid upfront, or annual contract billed quarterly via Stripe Invoicing? Recommend quarterly for cash-flow softness on the customer side; doesn't change ARR booking.
4. **PI insurance**: confirm current policy covers advisory work or update before first Enterprise contract.
5. **Founder publishing the case-study deal**: the agreement that every Enterprise customer becomes a public case study (in exchange for the inaugural-rate anchor for the first 3-5 customers) needs to land in the engagement letter, not the sales call.
6. **Capacity cap publication**: founder confident publishing "Only 10 Enterprise partnerships in 2026" on the landing page? It's a strong commercial signal AND a soft accountability device.

End of document.
