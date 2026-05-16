import Stripe from 'stripe'

let _stripe: Stripe | null = null

export function getStripe() {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2024-04-10',
    })
  }
  return _stripe
}

// Catalogue of self-serve plans. price = monthly AUD in cents. Price IDs
// live in Stripe - we resolve them at runtime from env vars rather than
// hardcoding so the same code points at staging vs production catalogues.
//
// Required env vars (set in Vercel + .env.local):
//   STRIPE_PRICE_ID_ESSENTIALS
//   STRIPE_PRICE_ID_GROWTH
//   STRIPE_PRICE_ID_SCALE
export const PLANS = {
  essentials: {
    name: 'Essentials',
    price: 9900,
    seats: 3,
    queries: 50,
    envKey: 'STRIPE_PRICE_ID_ESSENTIALS',
  },
  growth: {
    name: 'Growth',
    price: 19900,
    seats: 6,
    queries: -1,
    envKey: 'STRIPE_PRICE_ID_GROWTH',
  },
  scale: {
    name: 'Scale',
    price: 37900,
    seats: 12,
    queries: -1,
    envKey: 'STRIPE_PRICE_ID_SCALE',
  },
} as const

export type PlanId = keyof typeof PLANS

export function isPlanId(value: unknown): value is PlanId {
  return typeof value === 'string' && value in PLANS
}

/**
 * Resolve a plan id to its Stripe price id at request time.
 * Returns null if the corresponding env var is missing so callers can
 * surface a clear configuration error instead of a 500.
 */
export function getStripePriceId(planId: PlanId): string | null {
  const envKey = PLANS[planId].envKey
  const value = process.env[envKey]
  return value && value.trim() ? value.trim() : null
}

// B10 - one-off "Letter of Offer $25 no signup" growth experiment.
// Catalogued separately from subscription PLANS because it is mode:
// 'payment' (not subscription) and grants a single document credit
// rather than a recurring allowance.
export const ONE_OFF_OFFERS = {
  letter_of_offer: {
    name:       'Letter of Offer',
    priceCents: 2500,
    credits:    1,
    envKey:     'STRIPE_PRICE_ID_LETTER_OF_OFFER',
  },
} as const

export type OneOffOfferId = keyof typeof ONE_OFF_OFFERS

export function isOneOffOfferId(value: unknown): value is OneOffOfferId {
  return typeof value === 'string' && value in ONE_OFF_OFFERS
}

export function getOneOffPriceId(id: OneOffOfferId): string | null {
  const envKey = ONE_OFF_OFFERS[id].envKey
  const v = process.env[envKey]
  return v && v.trim() ? v.trim() : null
}

/** Format cents (AUD) as a display string, e.g. 9900 -> "$99". */
export function formatPlanPrice(cents: number): string {
  if (cents % 100 === 0) return `$${cents / 100}`
  return `$${(cents / 100).toFixed(2)}`
}
