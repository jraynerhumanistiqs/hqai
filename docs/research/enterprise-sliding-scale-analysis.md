# Enterprise Sliding-Scale Pricing - Strategy Analysis

**Date**: 2026-05-21
**Question from founder**: Should Enterprise pricing slide on client size, demand, complexity, requirements - rather than three fixed prices?
**TL;DR recommendation**: Yes, but as a **published, stepped multiplier schedule** layered on top of the three fixed SKUs. NOT a continuous sliding scale and NOT custom-quote-per-deal. Three explicit dimensions, transparent multipliers, customer can self-calculate before the discovery call. Keeps founder-led sales motion clean.

---

## 1. What "sliding scale" can mean (and the ones to reject)

There are five recognisable variants of variable pricing. They are not equally good.

### 1.1 Pure custom-quote (Harvey, Spellbook, McKinsey)

Public says "Contact us". Every deal is bespoke. **Reject.** Requires a sales team you don't have, kills self-service top-of-funnel, creates defensibility risk when two customers compare notes. The brief was explicit: no sales-team-required SKUs for a solo founder.

### 1.2 Per-employee pricing (Employment Hero, BambooHR, Rippling)

$X per active employee per month. **Reject.** This is the model that penalises growth - a customer scaling from 50 to 150 staff sees their HR bill triple. It is exactly the model HQ.ai positions against on the landing page. The "flat pricing" wedge is your sharpest sword and the brief warned not to dull it.

### 1.3 Pure outcome-based (RPO contingency, agency placement fees)

Pay per placement, per resolved case, per closed role. **Reject for HQ.ai Enterprise.** Outcomes are partly outside the partner's control, creates gaming incentives, and prices a subscription product like a project. It's also the Employsure trap - "you pay only when something goes wrong" - which is the framing you've explicitly built against. The brief said the wedge is decision-making, not panic-button advisory.

### 1.4 Continuous variable on one axis (e.g. $X per FTE per month, smooth function)

Mathematically simple. **Reject.** Creates a price that the customer cannot calculate without a sales call. Also creates negotiation pressure ("can you round down to..."). Sliding-scale-as-continuous is the worst of both worlds: opacity AND fairness anxiety.

### 1.5 Stepped published multipliers on a fixed base (HubSpot Pro/Enterprise, Salesforce Performance, Notion Enterprise add-ons)

A fixed base SKU + transparent, named multipliers for specific dimensions. Customer can self-calculate. Pricing page shows the maths.

**Adopt this one.** Section 3 of this doc designs the HQ.ai version.

---

## 2. The dimensions that actually predict cost-to-serve

If we are going to charge more for some customers than others, the multiplier must map to a real driver of advisor or talent-partner workload. Three dimensions stand up to scrutiny; three others do not.

### 2.1 Dimensions that genuinely predict workload (adopt)

**Dimension A - Headcount band.** A 200-staff business doesn't ask 4x the questions a 50-staff business asks, but they do ask ~50-100% more. The relationship is sub-linear but real. More staff = more probation reviews, more performance issues, more leave management, more contracts. This is the People Enterprise side multiplier.

**Dimension B - Hiring volume / concurrent role load.** A customer hiring 50 roles/year averaging 4 concurrent is the base case. A customer hiring 80 roles/year averaging 6-7 concurrent needs 50-70% more Talent Partner time, calibration sessions, and shortlist work. This is the Recruit Enterprise side multiplier.

**Dimension C - Entity complexity (multi-entity / franchise / multi-state).** A single 150-staff business is materially simpler than a franchise of 5 x 30-staff venues. Five sets of policies, five sets of award interactions, five org charts. The advisor's prep-time and document scaffolding both balloon. This applies across any variant.

### 2.2 Dimensions that look like they should matter but don't (reject)

**Industry intensity.** Healthcare and construction look high-complexity but the *intrinsic* complexity is already covered by the Industry Packs on the 2027 roadmap. Pricing for intensity through the Enterprise multiplier double-charges the customer who already buys the Pack. Reject as a dimension; route through Pack pricing instead.

**Geography (multi-state).** WA WHS is different from QLD WHS. But this is operationally absorbed inside the entity-complexity dimension (a multi-state operation is almost always multi-entity). Don't add a third dimension that overlaps with another.

**One-off project intensity** (mass redundancy, EA negotiation, restructure). These are real spikes but they should be quoted as fixed-fee project work at engagement-letter time, not as a multiplier on the recurring base. Mixing project work into the multiplier model bleeds scope.

---

## 3. The recommended model

### 3.1 The structure

**Base price** = the existing three SKUs at the current pricing.
**Plus** up to three published multipliers, applied additively or as percent uplifts depending on which sits cleanest.

```
Effective Enterprise price = Base SKU
                           + Headcount uplift (if applicable)
                           + Volume uplift (Recruit / Full only, if applicable)
                           + Entity-complexity uplift (if applicable)
```

All three are **published on the /enterprise page**. The customer can do the maths in 30 seconds. No discovery call needed to learn the number.

### 3.2 The schedule

**Headcount uplift** (proxies People Enterprise workload)

| Band | People Ent uplift | Recruit Ent uplift | Full Ent uplift |
|---|---|---|---|
| 40-150 staff | $0 (base) | $0 (base) | $0 (base) |
| 151-250 staff | +$400/mo | +$300/mo | +$650/mo |
| 251-500 staff | Strategic tier (founder discretion) | Strategic tier | Strategic tier |
| 500+ staff | Not a standard Enterprise band - quote standalone | same | same |

The Recruit-side uplift is smaller because Recruit workload is driven primarily by volume, not by headcount. Headcount only matters on the Recruit side as a leading indicator of hiring activity.

**Volume uplift** (Recruit Enterprise and Full Enterprise only)

| Concurrent roles / annual throughput | Uplift |
|---|---|
| Up to 4 concurrent / ~50 closures per year | $0 (base) |
| 5-6 concurrent / ~60-80 closures per year | +$750/mo |
| 7-8 concurrent / ~80-100 closures per year | +$1,500/mo |
| 9+ concurrent / over 100 closures per year | Bulk Hiring add-on, quoted separately |

**Entity-complexity uplift** (any variant)

| Entity count | Uplift |
|---|---|
| Single entity | $0 (base) |
| 2-3 entities (small group / restaurant chain / small franchise) | +15% of base |
| 4-5 entities (mid franchise / national footprint) | +25% of base |
| 6+ entities | Strategic tier (founder discretion) |

Multipliers stack. They are calculated against the **annual-contract base** even if the customer is on month-to-month - the +17% monthly-rolling premium then applies once to the total.

### 3.3 What each multiplier funds, mechanically

This is what makes the schedule defensible against price-comparison anxiety:

| Multiplier | Underlying capacity it unlocks |
|---|---|
| Headcount 151-250 (People) | +1 advisor hour/mo included, +1 quarterly review extra |
| Headcount 151-250 (Recruit) | +0.5 talent partner hour/mo, monthly executive review steps up to fortnightly |
| Volume 5-6 concurrent roles | 5th concurrent role included (was overage); +4 hrs/mo talent partner time |
| Volume 7-8 concurrent roles | 5th and 6th roles included; +8 hrs/mo talent partner time |
| Entity 2-3 | Per-entity scoping at onboarding; per-entity policy review per quarter |
| Entity 4-5 | Per-entity scoping at onboarding; per-entity policy review per quarter; per-entity hiring calibration |

When a customer asks "why am I paying more than X?" the answer is the additional capacity they actually receive. Not a vibe, a concrete delta.

### 3.4 Worked examples

**Customer A - 200-staff single-entity allied health, wants People Enterprise**

- Base People Ent annual: $1,495/mo
- Headcount uplift (151-250): +$400/mo
- Volume uplift: not applicable (People variant)
- Entity uplift: $0 (single entity)
- **Effective price: $1,895/mo annual ($22,740/yr), or $2,275/mo billed monthly**

**Customer B - 75-staff franchise group of 4 cafes, wants Full Enterprise**

- Base Full Ent annual: $3,995/mo
- Headcount uplift: $0 (75 staff is in base band)
- Volume uplift: $0 (assume normal hiring pace)
- Entity uplift (4 entities, +25%): +$999/mo
- **Effective price: $4,994/mo annual ($59,928/yr), or $5,993/mo billed monthly**

**Customer C - 120-staff scaling tech business, ~75 roles/year, 6 concurrent, wants Recruit Enterprise**

- Base Recruit Ent annual: $2,995/mo
- Headcount uplift: $0 (120 staff is in base band)
- Volume uplift (5-6 concurrent, ~75/yr): +$750/mo
- Entity uplift: $0 (single entity)
- **Effective price: $3,745/mo annual ($44,940/yr), or $4,495/mo billed monthly**
- vs internal RPO recruiter at $150k/yr: still 3.3x cheaper.

**Customer D - 220-staff multi-state retail group with 3 entities, wants Full Enterprise, hires ~65 roles/year**

- Base Full Ent annual: $3,995/mo
- Headcount uplift (151-250): +$650/mo
- Volume uplift (5-6 concurrent, ~65/yr): +$750/mo
- Entity uplift (3 entities, +15%): +$599/mo
- **Effective price: $5,994/mo annual ($71,928/yr), or $7,202/mo billed monthly**
- This is the upper end of "standard" Enterprise. Beyond this, founder reaches for the Strategic tier conversation.

### 3.5 What this changes about the floor and ceiling

The floor stays at $1,495/mo (base People Enterprise, annual). Lower than that and the advisor-capacity cost line dominates - margin disappears. Customers under 40 staff should be on Business tier with ad-hoc advisor escalations at $250/hr, not Enterprise.

The ceiling moves up. Previously the top published price was $3,995/mo (Full Enterprise). Under the schedule above, a 200-staff multi-entity Full Enterprise customer is at $5,994/mo - 50% more revenue per customer at the top of the standard band. That extra revenue funds the extra capacity, with margin retained.

Above $5,994/mo, the founder hand-prices on a Strategic tier - that conversation stays a private founder-customer one, no published rates.

### 3.6 What this does NOT change

- The headline Enterprise pricing on the landing page and the /enterprise hero still reads **"From $1,495/mo on annual contract"**. The "from" carries the work - any customer over base bands gets to the actual number in 30 seconds via the published schedule.
- Three SKUs, not six. We are not creating sub-tiers (People-Small / People-Standard / People-Large). The complexity dimension is on the multiplier table, not in the SKU shelf.
- Inaugural concession ($200/mo for first 5 customers in exchange for case study) still applies and is calculated against the effective price after multipliers.
- Year-1 capacity cap of 10 partnerships still stands - the multiplier schedule does not change capacity. It changes how that capacity is priced.

---

## 4. Margin model under the new schedule

The schedule must improve margins, not destroy them. Quick check at three representative effective prices:

| Profile | Effective price/mo | Direct labour cost/mo | Tool + overhead/mo | Margin/mo | GM % |
|---|---|---|---|---|---|
| Base People Ent (no uplift) | $1,495 | $900 | $170 | $425 | 28% |
| 200-staff People Ent (+headcount) | $1,895 | $1,100 | $180 | $615 | 32% |
| 220-staff multi-entity Full Ent | $5,994 | $3,400 | $260 | $2,334 | 39% |

Margin improves with size, as it should - capacity expansion has economies (one Talent Partner can serve more customers efficiently once setup costs are sunk, advisor batch-processes similar customer profiles, etc). This is the right direction for the unit economics.

---

## 5. Risks unique to the sliding-scale model

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Customer disputes their band ("we're 148 staff this month, 152 next") | M | L | Bands are sticky. Priced at signing; reviewed at anniversary. Six-month grace on a customer crossing into a higher band mid-contract. |
| Customer hides entity count or volume to land in lower band | L | M | Scoping doc captures all entities and historical hiring volume. Engagement letter has a "true-up at anniversary" clause for material misstatement. |
| Multipliers feel like an upsell ambush at engagement-letter signing | M | M | Multipliers published on /enterprise. Inquiry form pre-captures headcount/volume/entity count so the founder can quote the actual number on the discovery call, not after. No surprise at signing. |
| Multipliers stack to break the affordability ceiling | L | M | Standard band tops out around $6k/mo. Beyond that the founder pulls customer into Strategic tier conversation explicitly. |
| Competitor screenshots the schedule and undercuts each band | L | L | Public pricing is already the case for Solo/Business. Enterprise pricing visibility on the multiplier table is incremental, and the actual partnership offer (named advisor, capacity-capped) is the moat - not the price. |
| Solo founder gets pulled into per-band quote conversations | L | L | Quote is mechanical: 4-step form (headcount band / variant / volume / entity count). Founder can resolve in 30 seconds. No negotiation, no exception-by-exception. |

---

## 6. Sales-funnel impact

The funnel design barely changes. The inquiry form (already shipped) gets two new optional fields:

- **How many entities does your business operate as?** (single-select: 1 / 2-3 / 4-5 / 6+)
- **Annual hiring volume estimate** (single-select; only shown if variant_interest is Recruit or Full / Unsure: Under 30 roles / 30-60 / 60-100 / 100+ )

These two questions plus the existing staff_headcount field give the founder enough to calculate the effective price *before* the discovery call. The discovery call is then about value and fit, not about price discovery. That is the right shape for the founder-led motion.

On the /enterprise page itself, a new section ("How pricing flexes") is added between the variant cards and the qualifying-band table. It shows the schedule with worked examples.

The /pricing landing teaser stays as-is - the customer follows the link to /enterprise where the detail lives. The landing page does not need three nested pricing tables; that's the wrong density on a marketing surface.

---

## 7. Operational impact

What changes operationally with this model:

| Today | With multipliers |
|---|---|
| Founder picks one of 6 Stripe Price IDs (3 variants x 2 cycles) at signing | Founder issues a custom Stripe Invoice per customer for the effective price; Price ID metadata records the base variant and the multipliers applied |
| Engagement letter has a single price line | Engagement letter has a calculation block showing base + each multiplier + total |
| Anniversary renewal at same price | Anniversary renewal recalculates against current state (new headcount, new entity count, new volume); customer informed 60 days ahead of any change |

No Stripe Dashboard explosion. The current six Enterprise Price IDs cover the base. Multipliers are applied via custom invoice line items at billing, not new Price objects. The metadata field on the Stripe Customer Subscription carries the multiplier audit so the webhook can resolve credit allocations correctly.

---

## 8. What I recommend

**Ship the multiplier model.** It directly answers the question "can pricing flex with client size / demand / complexity" with a defensible, transparent, solo-founder-compatible answer.

Specifically:
1. Extend `lib/pricing-config.ts` with an `enterpriseMultipliers` block (three dimensions, the schedules in §3.2).
2. Add the "How pricing flexes" section to /enterprise between variants and qualifying-band table. Include the three worked examples.
3. Add the two extra optional fields to the inquiry form (entity count, annual hiring volume).
4. Update the engagement letter template (founder-side, off-codebase) to include the calculation block.
5. Update the strategy doc and the director one-pager.

**What I do not recommend:**
- Don't run continuous sliding scale.
- Don't add per-employee pricing.
- Don't expose pricing only to "Contact us" gates - keep the schedule public.
- Don't add a fourth or fifth dimension (industry, geography, AI usage volume). Three is the operational ceiling.

---

## 9. The founder's decision

Three options on the table:

**Option 1 - Ship the multiplier model as described.** Recommended. Captures the value, stays sales-cheap, defensible.

**Option 2 - Keep flat pricing for now, add multipliers at year 2.** Defensible if the first 10 partnerships are all small-band customers and the multiplier becomes academic. Risk: leaves 30-50% revenue on the table on the first big customer that lands.

**Option 3 - Hybrid: ship the headcount uplift now, defer the entity and volume uplifts.** Smallest change, captures the most common "you're bigger than base" case. Loses the recruit-side capture and the franchise capture.

If the call is Option 1, the implementation is a single sprint: ~4-6 hours of coder time plus the doc updates. I can have the code agent ship it on a single push if you say yes.

If the call is Option 2 or 3, this analysis stays on file for the year-2 conversation.

End of analysis.
