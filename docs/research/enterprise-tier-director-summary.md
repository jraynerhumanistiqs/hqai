# HQ.ai Enterprise Tier - Director One-Pager

**Date**: 2026-05-21 | **For**: Humanistiqs Directors | **From**: Jimmy Rayner

---

## The proposition in one line

**Enterprise is where HQ.ai stops being a tool and starts being a partner.** A Humanistiqs Advisor (and/or Talent Partner) embeds into the customer's business, with the AI as their leverage rather than as the product itself. AI plus HQ - Human Intelligence and Judgement.

## Three SKUs, two billing options each

| Variant | Annual contract (monthly equiv / annual total) | Month-to-month rate | The buyer |
|---|---|---|---|
| **HQ People Enterprise** | $1,495/mo, $17,940/yr | $1,795/mo | 40-150 staff. Office Manager or Operations Lead doing HR on the side. Wants a named human for the hard 20%. |
| **HQ Recruit Enterprise** | $2,995/mo, $35,940/yr | $3,495/mo | 50-250 staff. Hires 12-60 roles/year. Tired of agency fees. Won't hire an internal recruiter. |
| **Full Enterprise** | $3,995/mo, $47,940/yr | $4,495/mo | 80-250 staff. Both shapes of problem. Wants one partner team across People and Recruit. |

**Annual is the anchor. Month-to-month is offered at a ~17% premium with 30-day cancellation notice.** The premium does two jobs - protects advisor calendar economics against churn-and-rehire burn, and frames annual as the obvious economic call for any customer expecting to stay 12+ months. Both routed via Stripe Invoicing.

## Why these prices

- **vs Employsure retainer + occasional lawyer** (current state for many): $15-25k/yr → People Ent at $17.9k. Same money, vastly better service.
- **vs Agency contingency** at 18% on 50 roles: ~$700k/yr → Recruit Ent at $35.9k. **20x cheaper.**
- **vs Internal recruiter + part-time HR**: $200-260k/yr → Full Enterprise at $47.9k. **5x cheaper.**

The recruitment delta is the spear-tip of every sales conversation.

## Pricing flexes on three published multipliers

Base price is the headline. On top of it, three transparent uplifts capture the
dimensions that genuinely drive advisor and talent-partner workload:

- **Headcount uplift** for 151-250 staff: +$400/mo (People), +$300/mo (Recruit), +$650/mo (Full). 251+ staff is Strategic tier, founder discretion.
- **Volume uplift** for higher hiring concurrency (Recruit and Full only): +$750/mo at 5-6 concurrent roles, +$1,500/mo at 7-8 concurrent. 9+ is Bulk Hiring, quoted separately.
- **Entity uplift** for multi-entity / franchise: +15% of base for 2-3 entities, +25% of base for 4-5 entities. 6+ is Strategic tier.

Schedule is public. Customer self-calculates. No negotiation. Full design rationale and worked examples in `enterprise-sliding-scale-analysis.md` and `enterprise-tier-strategy.md` §3.3.

## How we protect margin AND advisors AND service quality

Three explicit constraints, all enforced in writing:

1. **Capacity cap.** Year 1 max: 10 Enterprise customers total across all variants. Published on the landing page as scarcity signal. The cap doubles as service-quality protection.
2. **Hours included, overage mechanical.** People Ent includes 2 calls/mo + reasonable async. Beyond that, $250/hr clean. Recruit Ent includes up to 4 active roles. 5th role is $750/mo extra. No renegotiation, no scope creep.
3. **What's explicitly NOT included**, with referral paths: workplace investigations, FWC representation, executive search, bulk hiring campaigns. All referred to specialist partners with clear paid scope.

## Capacity model

| Resource | Year-1 FTE | Slots |
|---|---|---|
| Jimmy (founder) | 0.4 FTE on Enterprise | 6-8 People Ent |
| Contract Humanistiqs Advisor 1 | 0.6 FTE | 8-12 People Ent |
| Contract Talent Partner 1 | 0.7 FTE | 4-5 Recruit Ent |
| **Year-1 envelope** | | **10 customers total** |

Trigger for second-round hire (Advisor 2 + Talent Partner 2): the moment customer 9 lands. Lead time for senior contract placement is 6-10 weeks; we hire ahead of capacity.

## Sales motion - founder-led, no team

No outbound. No SDRs. No quotas. The funnel:

> Landing page Enterprise card → /enterprise page with form → Founder discovery call within 48h → Scoping doc within 5 days → Signed within 14 days

Founder takes the first 10 personally. After capacity scales, the most senior Humanistiqs Advisor takes new discovery calls.

## Year-1 numbers

| | Value |
|---|---|
| Customers (year-end target) | 10 |
| ARR | $305,400 |
| Direct labour cost | $203,400 |
| Tool + overhead | $29,880 |
| **Gross margin** | **$72,120 (24%)** |

Modest absolute margin. **Strategically priceless**: 10 named partnerships, 3-5 case studies, 20-30 warm referrals into Business tier.

## Year-2 trajectory (with second-round contractor hires)

ARR ~$855k, gross margin lifts to ~34% as the founder is no longer the bottleneck and the contractors mature into more customers per FTE.

## Top three risks (and how we sleep at night)

| Risk | Mitigation |
|---|---|
| Advisor burnout / over-utilisation | Hard 4-customer cap per Talent Partner; "intensive month" mechanic twice per advisor per year; mandatory quarterly utilisation review |
| Founder pulled into delivery away from product | Cap founder Enterprise time at 0.4 FTE; founder never runs individual roles, only People Ent + executive reviews on Full Ent |
| Scope creep ("unlimited consulting") | Engagement letter explicit on inclusions/exclusions; overage rates are mechanical, not a renegotiation |

## The ask of this director group

1. **Confirm Jimmy is good to allocate 0.4 FTE to Enterprise delivery** for the next 12 months. (If only 0.3 FTE, year-1 cap drops from 10 to 8.)
2. **Approve the contract Humanistiqs Advisor hire** at the moment customer 9 signs. ~$120k/yr loaded. Budget pre-cleared so we don't lose the 6-week lead time.
3. **Approve the contract Talent Partner hire** on the same trigger. ~$100k/yr loaded.
4. **Sign off the inaugural-customer concession** for the first 3-5 Enterprise customers: $200/mo discount in exchange for a public case study with named business and dollar saving. After customer 5, no discounting.
5. **Confirm PI insurance** is current and covers advisory work, or we update before first Enterprise contract.

## What ships this sprint

Landing page card and dedicated /enterprise page go live alongside the rest of pricing v2 (already merged). Inquiry form posts to Supabase + emails Jimmy. No automated checkout - every Enterprise inquiry surfaces as a human conversation. Long-form internal strategy in `enterprise-tier-strategy.md` for the founder.

End of one-pager.
