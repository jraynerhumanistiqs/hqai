// lib/checkout-plans.ts
//
// The self-serve plans a buyer can actually pay for on /checkout, flattened
// into one list the order page can render and price.
//
// Every number here is DERIVED from lib/pricing-config.ts - nothing is
// duplicated. The plan ids match lib/stripe.ts PLANS and the validator in
// app/api/stripe/checkout/route.ts, so a selection on this page resolves to a
// real Stripe price without any translation step.
//
// Enterprise (HR365 / Recruit365) is deliberately absent: it is
// sales-assisted and invoiced, and the checkout route refuses those ids.

import { C10_SELF_SERVE, PRICING } from '@/lib/pricing-config'

export type CheckoutPlanId = 'people-solo' | 'people-business' | 'recruit' | 'solo' | 'business'

export interface CheckoutPlan {
  id: CheckoutPlanId
  /** Product family, used to group the picker. */
  family: 'people' | 'recruit' | 'bundle'
  /** Product name as the buyer knows it, e.g. "HQ Business". */
  product: string
  /** Short line naming who the plan is for. */
  kicker: string
  /** Team-size band, e.g. "up to 25". Null where the plan has no band. */
  band: string | null
  monthly: number
  /** Null where no annual price is published for the plan. */
  annualTotal: number | null
  /** AI actions included each month. */
  credits: number
  features: string[]
}

const { people, recruit, bundle } = C10_SELF_SERVE

export const CHECKOUT_PLANS: CheckoutPlan[] = [
  {
    id: 'people-solo',
    family: 'people',
    product: people.name,
    kicker: 'HR only',
    band: people.bands[0].label,
    monthly: people.bands[0].monthly,
    annualTotal: people.bands[0].annualTotal ?? null,
    credits: people.bands[0].credits,
    features: people.features,
  },
  {
    id: 'people-business',
    family: 'people',
    product: people.name,
    kicker: 'HR only',
    band: people.bands[1].label,
    monthly: people.bands[1].monthly,
    annualTotal: people.bands[1].annualTotal ?? null,
    credits: people.bands[1].credits,
    features: people.features,
  },
  {
    // Standalone hiring. No annual price is published for it, so the order
    // page keeps this plan on monthly and says so rather than inventing one.
    id: 'recruit',
    family: 'recruit',
    product: recruit.name,
    kicker: 'Hiring only',
    band: null,
    monthly: recruit.standaloneMonthly,
    annualTotal: null,
    credits: recruit.bands[0].credits,
    features: recruit.features,
  },
  {
    id: 'solo',
    family: 'bundle',
    product: bundle.name,
    kicker: 'HR and hiring',
    band: bundle.solo.label,
    monthly: bundle.solo.monthly,
    annualTotal: bundle.solo.annualTotal,
    credits: PRICING.tiers[0].includedCredits,
    features: bundle.features,
  },
  {
    id: 'business',
    family: 'bundle',
    product: bundle.name,
    kicker: 'HR and hiring',
    band: bundle.business.label,
    monthly: bundle.business.monthly,
    annualTotal: bundle.business.annualTotal,
    credits: PRICING.tiers[1].includedCredits,
    features: bundle.features,
  },
]

export const DEFAULT_CHECKOUT_PLAN: CheckoutPlanId = 'business'

export function isCheckoutPlanId(value: unknown): value is CheckoutPlanId {
  return typeof value === 'string' && CHECKOUT_PLANS.some((p) => p.id === value)
}

export function getCheckoutPlan(id: CheckoutPlanId): CheckoutPlan {
  // Non-null: the id type is the keyset of CHECKOUT_PLANS.
  return CHECKOUT_PLANS.find((p) => p.id === id)!
}

/**
 * What the buyer is charged today, in whole dollars, for one billing period.
 * Annual bills the whole year up front; a plan with no annual price always
 * bills monthly.
 */
export function amountDueToday(plan: CheckoutPlan, cycle: 'monthly' | 'annual'): number {
  if (cycle === 'annual' && plan.annualTotal !== null) return plan.annualTotal
  return plan.monthly
}

/** The cycle a plan can actually be billed on, given what the buyer asked for. */
export function effectiveCycle(plan: CheckoutPlan, requested: 'monthly' | 'annual'): 'monthly' | 'annual' {
  return requested === 'annual' && plan.annualTotal !== null ? 'annual' : 'monthly'
}

/** "$2,690" - AUD whole dollars, en-AU grouping. */
export function money(amount: number): string {
  return `$${amount.toLocaleString('en-AU')}`
}

/**
 * "$244.55" - AUD to the cent. Plan prices are whole dollars, but the GST
 * component of one rarely is, so a tax line needs its own formatter.
 */
export function moneyExact(amount: number): string {
  return `$${amount.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
