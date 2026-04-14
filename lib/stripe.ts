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

export const PLANS = {
  essentials: {
    name: 'Essentials',
    price: 9900, // $99 in cents
    seats: 3,
    queries: 50,
  },
  growth: {
    name: 'Growth',
    price: 19900,
    seats: 6,
    queries: -1, // unlimited
  },
  scale: {
    name: 'Scale',
    price: 37900,
    seats: 12,
    queries: -1,
  },
} as const

export type PlanId = keyof typeof PLANS
