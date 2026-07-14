// lib/plan-suggest.ts
//
// The checkout-able plan taxonomy and the product-needs -> plan
// suggestion logic behind the onboarding plan picker. Pure and
// client-safe (no React, no Stripe) so node:test can exercise it
// directly - see tests/checkout/plan-suggest.test.ts.
//
// Plan ids map to lib/stripe.ts PLANS:
//   people-solo / people-business  - HQ People standalone (HR only)
//   recruit                        - HQ Recruit standalone (hiring only)
//   solo / business                - HQ Business bundle (HR + hiring)

import { C10_SELF_SERVE } from '@/lib/pricing-config'

export type CheckoutPlanId = 'solo' | 'business' | 'recruit' | 'people-solo' | 'people-business'

const CHECKOUT_PLAN_IDS: readonly CheckoutPlanId[] = [
  'solo', 'business', 'recruit', 'people-solo', 'people-business',
]

export function isCheckoutPlanId(value: unknown): value is CheckoutPlanId {
  return typeof value === 'string' && (CHECKOUT_PLAN_IDS as readonly string[]).includes(value)
}

// The 'up to 25' band ceiling. Both the People and bundle small bands
// share it (C10_SELF_SERVE labels 'up to 25').
export const SMALL_BAND_MAX_HEADCOUNT = 25

export interface ProductNeeds {
  people: boolean
  recruit: boolean
}

/**
 * Suggest a plan from what the buyer needs and how many staff they have.
 *
 * - HR + hiring -> the HQ Business bundle, banded by headcount
 * - HR only     -> HQ People, banded by headcount
 * - hiring only -> HQ Recruit standalone (no bands)
 * - nothing     -> null (the picker blocks Continue until one is chosen)
 *
 * Unknown headcount suggests the small band - the honest default; the
 * buyer told us nothing that justifies the bigger price.
 */
export function suggestPlanId(needs: ProductNeeds, headcount?: number): CheckoutPlanId | null {
  const small = !(typeof headcount === 'number' && headcount > SMALL_BAND_MAX_HEADCOUNT)
  if (needs.people && needs.recruit) return small ? 'solo' : 'business'
  if (needs.people) return small ? 'people-solo' : 'people-business'
  if (needs.recruit) return 'recruit'
  return null
}

/** The product needs implied by a plan id - seeds the picker toggles
 *  when a plan arrives via query param or the resume guard. */
export function planToNeeds(planId: CheckoutPlanId): ProductNeeds {
  if (planId === 'recruit') return { people: false, recruit: true }
  if (planId === 'people-solo' || planId === 'people-business') return { people: true, recruit: false }
  return { people: true, recruit: true }
}

// Guard the band assumption against config drift.
if (process.env.NODE_ENV !== 'production') {
  const labels = [C10_SELF_SERVE.people.bands[0].label, C10_SELF_SERVE.bundle.solo.label]
  labels.forEach(l => {
    if (!l.includes(String(SMALL_BAND_MAX_HEADCOUNT))) {
      console.warn(`[plan-suggest] small band label "${l}" no longer mentions ${SMALL_BAND_MAX_HEADCOUNT} - update SMALL_BAND_MAX_HEADCOUNT`)
    }
  })
}
