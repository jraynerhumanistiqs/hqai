// Public /checkout - the HQ.ai branded order page.
//
// This is the step the funnel was missing. Before it, a buyer went from a
// pricing card straight out to Stripe's hosted page, so the moment of paying
// looked like nobody's product. Now the whole order is reviewed, priced and
// confirmed on HQ.ai, in HQ.ai's own type and colour, and Stripe is handed
// only the card entry.
//
// Deep link: /checkout?plan=business&cycle=annual - the pricing cards and the
// dashboard upgrade path both link in with the buyer's choice already made.
// Unknown or missing params fall back to the bundle on monthly.
//
// Auth: paying needs an account, because the subscription hangs off a
// business record. A signed-out visitor sees the same priced order and is
// sent to /signup carrying their selection, rather than being bounced to a
// login screen with nothing to look at.

import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import CheckoutClient from '@/components/checkout/CheckoutClient'
import {
  DEFAULT_CHECKOUT_PLAN,
  isCheckoutPlanId,
  type CheckoutPlanId,
} from '@/lib/checkout-plans'

export const metadata: Metadata = {
  title: 'Checkout - HQ.ai',
  description:
    'Confirm your HQ.ai plan and pay monthly or annually. Unlimited logins, no lock-in, cancel any time.',
  alternates: { canonical: '/checkout' },
  // An order page has nothing to rank for and should never be a search
  // result - /pricing is the indexable page.
  robots: { index: false, follow: false },
}

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string; cycle?: string; hours?: string }>
}) {
  const params = await searchParams

  const plan: CheckoutPlanId = isCheckoutPlanId(params.plan) ? params.plan : DEFAULT_CHECKOUT_PLAN
  const cycle: 'monthly' | 'annual' = params.cycle === 'annual' ? 'annual' : 'monthly'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <CheckoutClient
      initialPlan={plan}
      initialCycle={cycle}
      signedIn={Boolean(user)}
      accountEmail={user?.email ?? null}
    />
  )
}
