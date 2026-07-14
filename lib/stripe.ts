import Stripe from 'stripe'
import { PRICING, C10_SELF_SERVE } from '@/lib/pricing-config'

let _stripe: Stripe | null = null

export function getStripe() {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2024-04-10',
    })
  }
  return _stripe
}

// Catalogue of self-serve subscription plans. Prices are AUD whole-dollars
// per month (or the equivalent monthly rate on annual). Stripe Price IDs
// live in env vars, resolved at runtime - this lets the same code point
// at staging vs production catalogues.
//
// Source of truth for shape and numbers: lib/pricing-config.ts (which
// mirrors docs/research/retention-and-monetisation-brief.md §2.8).
//
// Required env vars (set in Vercel + .env.local):
//   STRIPE_PRICE_ID_SOLO_MONTHLY
//   STRIPE_PRICE_ID_SOLO_ANNUAL
//   STRIPE_PRICE_ID_BUSINESS_MONTHLY
//   STRIPE_PRICE_ID_BUSINESS_ANNUAL
//   STRIPE_PRICE_ID_RECRUIT_MONTHLY   (standalone HQ Recruit - hiring only)
//   STRIPE_PRICE_ID_RECRUIT_ANNUAL    (optional; annual not surfaced in UI yet)

export type BillingCycle = 'monthly' | 'annual'

interface PlanVariant {
  price: number // AUD whole dollars per month (annual price is monthly-equivalent)
  envKey: string
}

interface PlanCatalogueEntry {
  name: string
  seats: number
  credits: number
  monthly: PlanVariant
  annual: PlanVariant
}

// Self-serve subscription plans. Enterprise variants are also registered
// here so the webhook can resolve allocations by planId, but they are
// flagged as sales-assisted and the public checkout route refuses to
// start a Stripe Checkout Session for them - see isSalesAssistedPlan().
//
// Enterprise env-var keys (set in Vercel + .env.local for Invoicing).
// Each variant now has BOTH an annual-contract Price and a monthly-rolling
// Price - the founder chose to offer monthly with a ~17% premium so
// customers who want cash-flow flexibility can pay monthly without
// signing a 12-month fixed term. 30-day cancellation notice on monthly
// rolling protects the advisor calendar.
//   STRIPE_PRICE_ID_ENTERPRISE_PEOPLE_ANNUAL
//   STRIPE_PRICE_ID_ENTERPRISE_PEOPLE_MONTHLY
//   STRIPE_PRICE_ID_ENTERPRISE_RECRUIT_ANNUAL
//   STRIPE_PRICE_ID_ENTERPRISE_RECRUIT_MONTHLY
//   STRIPE_PRICE_ID_ENTERPRISE_FULL_ANNUAL
//   STRIPE_PRICE_ID_ENTERPRISE_FULL_MONTHLY
export const PLANS: Record<
  | 'solo' | 'business' | 'recruit' | 'people-solo' | 'people-business'
  | 'enterprise-people' | 'enterprise-recruit' | 'enterprise-full',
  PlanCatalogueEntry
> = {
  solo: {
    name: 'Solo',
    seats: PRICING.tiers[0].seats,
    credits: PRICING.tiers[0].includedCredits,
    monthly: {
      price: PRICING.tiers[0].priceMonthly,
      envKey: 'STRIPE_PRICE_ID_SOLO_MONTHLY',
    },
    annual: {
      price: PRICING.tiers[0].priceAnnualMonthly,
      envKey: 'STRIPE_PRICE_ID_SOLO_ANNUAL',
    },
  },
  business: {
    name: 'Business',
    seats: PRICING.tiers[1].seats,
    credits: PRICING.tiers[1].includedCredits,
    monthly: {
      price: PRICING.tiers[1].priceMonthly,
      envKey: 'STRIPE_PRICE_ID_BUSINESS_MONTHLY',
    },
    annual: {
      price: PRICING.tiers[1].priceAnnualMonthly,
      envKey: 'STRIPE_PRICE_ID_BUSINESS_ANNUAL',
    },
  },
  // Standalone HQ Recruit - hiring only, no HQ People subscription required.
  // A real self-serve plan (NOT sales-assisted), so the public checkout route
  // will start a Stripe Checkout Session for it. The Stripe product/prices
  // must be created and STRIPE_PRICE_ID_RECRUIT_* set before live billing
  // works; until then getStripePriceId returns null and the checkout route
  // surfaces a clear "billing not configured" 503 rather than charging.
  recruit: {
    name: C10_SELF_SERVE.recruit.name,
    seats: 3,
    credits: C10_SELF_SERVE.recruit.bands[0].credits,
    monthly: {
      price: C10_SELF_SERVE.recruit.standaloneMonthly,
      envKey: 'STRIPE_PRICE_ID_RECRUIT_MONTHLY',
    },
    annual: {
      // 2-months-free equivalent, monthly rate. Annual is not surfaced in the
      // UI yet - the recruit card is monthly-only - but the slot exists so the
      // catalogue is complete if annual recruit is added later.
      price: Math.round((C10_SELF_SERVE.recruit.standaloneMonthly * 10) / 12),
      envKey: 'STRIPE_PRICE_ID_RECRUIT_ANNUAL',
    },
  },
  // Standalone HQ People - HR only, banded by team size like the bundle.
  // The env-var keys match the ones scripts/stripe-c10-setup.py already
  // generated (PEOPLE_SOLO_* / PEOPLE_BUSINESS_*), so wiring these plans
  // is a paste-the-ids job, not a new Stripe catalogue build. Same
  // missing-env behaviour as recruit: a friendly 503, never a charge.
  'people-solo': {
    name: C10_SELF_SERVE.people.name,
    seats: 3,
    credits: C10_SELF_SERVE.people.bands[0].credits,
    monthly: {
      price: C10_SELF_SERVE.people.bands[0].monthly,
      envKey: 'STRIPE_PRICE_ID_PEOPLE_SOLO_MONTHLY',
    },
    annual: {
      price: Math.round((C10_SELF_SERVE.people.bands[0].annualTotal ?? C10_SELF_SERVE.people.bands[0].monthly * 10) / 12),
      envKey: 'STRIPE_PRICE_ID_PEOPLE_SOLO_ANNUAL',
    },
  },
  'people-business': {
    name: C10_SELF_SERVE.people.name,
    seats: 15,
    credits: C10_SELF_SERVE.people.bands[1].credits,
    monthly: {
      price: C10_SELF_SERVE.people.bands[1].monthly,
      envKey: 'STRIPE_PRICE_ID_PEOPLE_BUSINESS_MONTHLY',
    },
    annual: {
      price: Math.round((C10_SELF_SERVE.people.bands[1].annualTotal ?? C10_SELF_SERVE.people.bands[1].monthly * 10) / 12),
      envKey: 'STRIPE_PRICE_ID_PEOPLE_BUSINESS_ANNUAL',
    },
  },
  // Enterprise variants - sales-assisted. Both annual-contract AND
  // monthly-rolling are real Stripe Prices that the founder issues via
  // Stripe Invoicing depending on the customer's chosen cycle. Public
  // checkout still refuses these planIds (isSalesAssistedPlan).
  // Pricing source: PRICING.enterprise.variants.
  'enterprise-people': {
    name: PRICING.enterprise.variants[0].name,
    seats: PRICING.tiers[1].seats,
    credits: PRICING.tiers[1].includedCredits,
    monthly: {
      price:  PRICING.enterprise.variants[0].priceMonthlyRolling,
      envKey: PRICING.enterprise.variants[0].stripePriceIdEnvKeyMonthly,
    },
    annual: {
      price:  PRICING.enterprise.variants[0].priceMonthlyDisplay,
      envKey: PRICING.enterprise.variants[0].stripePriceIdEnvKeyAnnual,
    },
  },
  'enterprise-recruit': {
    name: PRICING.enterprise.variants[1].name,
    seats: PRICING.tiers[1].seats,
    credits: PRICING.tiers[1].includedCredits,
    monthly: {
      price:  PRICING.enterprise.variants[1].priceMonthlyRolling,
      envKey: PRICING.enterprise.variants[1].stripePriceIdEnvKeyMonthly,
    },
    annual: {
      price:  PRICING.enterprise.variants[1].priceMonthlyDisplay,
      envKey: PRICING.enterprise.variants[1].stripePriceIdEnvKeyAnnual,
    },
  },
  'enterprise-full': {
    name: PRICING.enterprise.variants[2].name,
    seats: PRICING.tiers[1].seats,
    credits: 5000,
    monthly: {
      price:  PRICING.enterprise.variants[2].priceMonthlyRolling,
      envKey: PRICING.enterprise.variants[2].stripePriceIdEnvKeyMonthly,
    },
    annual: {
      price:  PRICING.enterprise.variants[2].priceMonthlyDisplay,
      envKey: PRICING.enterprise.variants[2].stripePriceIdEnvKeyAnnual,
    },
  },
}

export type PlanId = keyof typeof PLANS

export function isPlanId(value: unknown): value is PlanId {
  return typeof value === 'string' && value in PLANS
}

/**
 * Sales-assisted plans (Enterprise variants) cannot self-serve through
 * Stripe Checkout. The /api/stripe/checkout route refuses these and
 * directs the buyer to /enterprise for a discovery call. They exist in
 * the catalogue so the webhook can resolve subscription allocations
 * when the founder invoices these customers manually via Stripe
 * Invoicing.
 */
export function isSalesAssistedPlan(planId: PlanId): boolean {
  return planId.startsWith('enterprise-')
}

export function isBillingCycle(value: unknown): value is BillingCycle {
  return value === 'monthly' || value === 'annual'
}

// Where the buyer is returned after Stripe Checkout. 'settings' is the
// original dashboard billing flow (unchanged); 'onboarding' is the
// self-serve funnel, which returns to the standalone /welcome screen.
export type CheckoutReturnTo = 'onboarding' | 'settings'

export function isCheckoutReturnTo(value: unknown): value is CheckoutReturnTo {
  return value === 'onboarding' || value === 'settings'
}

/**
 * Build the Stripe Checkout success/cancel URLs for a return context.
 *
 * 'settings' (the default) preserves the pre-existing dashboard
 * billing behaviour exactly. 'onboarding' sends the buyer to /welcome
 * with the plan and cycle carried in the query string so the cancelled
 * variant can re-create the same checkout. {CHECKOUT_SESSION_ID} is a
 * literal Stripe template token - Stripe substitutes the real session
 * id at redirect time, so it must NOT be URL-encoded.
 */
export function buildCheckoutReturnUrls(
  origin: string,
  returnTo: CheckoutReturnTo,
  planId: string,
  cycle: string,
): { successUrl: string; cancelUrl: string } {
  if (returnTo === 'onboarding') {
    const planQuery = `plan=${encodeURIComponent(planId)}&cycle=${encodeURIComponent(cycle)}`
    return {
      successUrl: `${origin}/welcome?state=success&${planQuery}&session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${origin}/welcome?state=cancelled&${planQuery}`,
    }
  }
  return {
    successUrl: `${origin}/dashboard/settings?billing=success`,
    cancelUrl: `${origin}/dashboard/settings?billing=cancelled`,
  }
}

/**
 * Resolve a plan id and cycle to its Stripe price id at request time.
 *
 * @param planId  - 'solo' | 'business'
 * @param cycle   - 'monthly' | 'annual'
 *
 * Returns null if the corresponding env var is missing - callers should
 * surface a clear configuration error rather than a 500.
 */
export function getStripePriceId(
  planId: PlanId,
  cycle: BillingCycle,
): string | null {
  const envKey = PLANS[planId][cycle].envKey
  const value = process.env[envKey]
  return value && value.trim() ? value.trim() : null
}

// One-off SKUs (Stripe mode: 'payment', not subscription). The full
// catalogue lives in pricing-config.ts; this resolver layer maps each
// id to its env-var key and surfaces the resolved Price id at runtime.
type OneOffEntry = { name: string; priceCents: number; credits: number; envKey: string }

const ONE_OFF_CATALOGUE: Record<string, OneOffEntry> = Object.fromEntries(
  PRICING.oneOffs.map((sku) => [
    sku.id.replace(/-/g, '_'),
    {
      name: sku.name,
      priceCents: sku.price * 100,
      credits: 1,
      envKey: sku.stripePriceId,
    },
  ]),
)

export const ONE_OFF_OFFERS = ONE_OFF_CATALOGUE

export type OneOffOfferId = string

export function isOneOffOfferId(value: unknown): value is OneOffOfferId {
  return typeof value === 'string' && value in ONE_OFF_OFFERS
}

export function getOneOffPriceId(id: OneOffOfferId): string | null {
  const entry = ONE_OFF_OFFERS[id]
  if (!entry) return null
  const v = process.env[entry.envKey]
  return v && v.trim() ? v.trim() : null
}

/** Format cents (AUD) as a display string, e.g. 9900 -> "$99". */
export function formatPlanPrice(cents: number): string {
  if (cents % 100 === 0) return `$${cents / 100}`
  return `$${(cents / 100).toFixed(2)}`
}
