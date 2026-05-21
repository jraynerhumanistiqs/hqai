import Stripe from 'stripe'
import { PRICING } from '@/lib/pricing-config'

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
//   STRIPE_PRICE_ID_BUSINESS_FOUNDATION   (optional, only for the Foundation 100 lock-in)

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
// Enterprise env-var keys (set in Vercel + .env.local for Invoicing):
//   STRIPE_PRICE_ID_ENTERPRISE_PEOPLE
//   STRIPE_PRICE_ID_ENTERPRISE_RECRUIT
//   STRIPE_PRICE_ID_ENTERPRISE_FULL
export const PLANS: Record<
  'solo' | 'business' | 'enterprise-people' | 'enterprise-recruit' | 'enterprise-full',
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
  // Enterprise variants - sales-assisted, annual-only contracts. The
  // monthly entry exists only so the catalogue type stays uniform; it
  // is never resolved against by the public checkout. Pricing source:
  // PRICING.enterprise.variants.
  'enterprise-people': {
    name: PRICING.enterprise.variants[0].name,
    seats: PRICING.tiers[1].seats,
    credits: PRICING.tiers[1].includedCredits,
    monthly: { price: PRICING.enterprise.variants[0].priceMonthlyDisplay, envKey: 'STRIPE_PRICE_ID_ENTERPRISE_PEOPLE' },
    annual:  { price: PRICING.enterprise.variants[0].priceMonthlyDisplay, envKey: 'STRIPE_PRICE_ID_ENTERPRISE_PEOPLE' },
  },
  'enterprise-recruit': {
    name: PRICING.enterprise.variants[1].name,
    seats: PRICING.tiers[1].seats,
    credits: PRICING.tiers[1].includedCredits,
    monthly: { price: PRICING.enterprise.variants[1].priceMonthlyDisplay, envKey: 'STRIPE_PRICE_ID_ENTERPRISE_RECRUIT' },
    annual:  { price: PRICING.enterprise.variants[1].priceMonthlyDisplay, envKey: 'STRIPE_PRICE_ID_ENTERPRISE_RECRUIT' },
  },
  'enterprise-full': {
    name: PRICING.enterprise.variants[2].name,
    seats: PRICING.tiers[1].seats,
    credits: 5000,
    monthly: { price: PRICING.enterprise.variants[2].priceMonthlyDisplay, envKey: 'STRIPE_PRICE_ID_ENTERPRISE_FULL' },
    annual:  { price: PRICING.enterprise.variants[2].priceMonthlyDisplay, envKey: 'STRIPE_PRICE_ID_ENTERPRISE_FULL' },
  },
}

// The Foundation 100 offer is a separate annual SKU that locks Business
// at $179/mo for life. Stored on the Foundation config in pricing-config,
// surfaced here for the resolver.
export const FOUNDATION_ANNUAL_ENV_KEY = PRICING.foundation.stripePriceIdAnnual

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

/**
 * Resolve a plan id and cycle to its Stripe price id at request time.
 *
 * @param planId  - 'solo' | 'business'
 * @param cycle   - 'monthly' | 'annual'
 * @param foundation - true only when checking out the Foundation 100
 *                     locked annual offer. Valid only with
 *                     planId='business' AND cycle='annual'.
 *
 * Returns null if the corresponding env var is missing OR if the
 * combination is invalid - callers should surface a clear configuration
 * error rather than a 500.
 */
export function getStripePriceId(
  planId: PlanId,
  cycle: BillingCycle,
  foundation: boolean = false,
): string | null {
  if (foundation) {
    if (planId !== 'business' || cycle !== 'annual') return null
    const v = process.env[FOUNDATION_ANNUAL_ENV_KEY]
    return v && v.trim() ? v.trim() : null
  }
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
