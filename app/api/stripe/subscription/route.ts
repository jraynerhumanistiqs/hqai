// GET /api/stripe/subscription
//
// Read-only billing snapshot for the signed-in user's business, used by the
// dashboard billing surface (components/settings/BillingSection.tsx) to show
// a real plan card, renewal date, saved card and invoice history instead of
// just a plan name.
//
// Every Stripe lookup is best-effort: the route NEVER fails the whole payload
// because one sub-object is missing. A business with no Stripe customer, a
// key that is not configured, or a brand-new subscription all return 200 with
// nulls so the UI degrades to "no billing history yet" rather than an error
// banner. Nothing here mutates anything.

import { createClient } from '@/lib/supabase/server'
import { getStripe } from '@/lib/stripe'
import { getCreditBalance } from '@/lib/credits'
import { NextResponse } from 'next/server'
import type Stripe from 'stripe'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export interface BillingSnapshot {
  /** Stripe is reachable AND this business has a customer record. */
  configured: boolean
  subscription: {
    status: string
    cycle: 'monthly' | 'annual' | null
    /** Whole dollars per billing interval, from the Stripe price itself. */
    amount: number | null
    currency: string
    /** ISO date the current period ends (= next charge, unless cancelling). */
    currentPeriodEnd: string | null
    cancelAtPeriodEnd: boolean
    /** ISO date a trial ends, when one is running. */
    trialEnd: string | null
  } | null
  paymentMethod: {
    brand: string
    last4: string
    expMonth: number
    expYear: number
  } | null
  invoices: Array<{
    id: string
    /** ISO date. */
    date: string
    /** Whole dollars. */
    amount: number
    currency: string
    status: string
    number: string | null
    hostedUrl: string | null
    pdfUrl: string | null
  }>
  credits: { allocated: number; used: number; remaining: number } | null
}

const EMPTY: BillingSnapshot = {
  configured: false,
  subscription: null,
  paymentMethod: null,
  invoices: [],
  credits: null,
}

function dollars(cents: number | null | undefined): number | null {
  if (typeof cents !== 'number') return null
  return Math.round(cents) / 100
}

function iso(unixSeconds: number | null | undefined): string | null {
  if (typeof unixSeconds !== 'number' || !Number.isFinite(unixSeconds)) return null
  return new Date(unixSeconds * 1000).toISOString()
}

// A Stripe price's interval tells us the cycle without trusting client state
// or subscription metadata (which an older subscription may not carry).
function cycleFromPrice(price: Stripe.Price | null | undefined): 'monthly' | 'annual' | null {
  const interval = price?.recurring?.interval
  if (interval === 'month') return price?.recurring?.interval_count === 12 ? 'annual' : 'monthly'
  if (interval === 'year') return 'annual'
  return null
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('business_id, businesses(stripe_customer_id)')
    .eq('id', user.id)
    .single()

  const businessId = profile?.business_id ?? null
  const business = profile?.businesses as unknown as { stripe_customer_id: string | null } | null
  const customerId = business?.stripe_customer_id ?? null

  // Credits come from our own tables, so they are available even when Stripe
  // is not wired up at all.
  let credits: BillingSnapshot['credits'] = null
  if (businessId) {
    try {
      credits = await getCreditBalance(businessId)
    } catch (err) {
      console.error('[stripe/subscription] credit balance lookup failed', err)
    }
  }

  if (!customerId || !process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ ...EMPTY, credits })
  }

  const snapshot: BillingSnapshot = { ...EMPTY, configured: true, credits }
  const stripe = getStripe()

  // ── Subscription + the card attached to it ──────────────────────────
  try {
    const subs = await stripe.subscriptions.list({
      customer: customerId,
      status: 'all',
      limit: 10,
      expand: ['data.default_payment_method', 'data.items.data.price'],
    })

    // Prefer a live subscription over a dead one; among live ones, the most
    // recently created. A customer who upgraded mid-cycle can briefly have
    // two, and the cancelled one must not win.
    const rank = (s: Stripe.Subscription) =>
      s.status === 'active' || s.status === 'trialing' ? 2 : s.status === 'past_due' || s.status === 'unpaid' ? 1 : 0
    const sub = subs.data
      .slice()
      .sort((a, b) => rank(b) - rank(a) || b.created - a.created)[0] ?? null

    if (sub) {
      const item = sub.items?.data?.[0] ?? null
      const price = (item?.price ?? null) as Stripe.Price | null
      snapshot.subscription = {
        status: sub.status,
        cycle: cycleFromPrice(price),
        amount: dollars(price?.unit_amount ?? null),
        currency: (price?.currency ?? 'aud').toUpperCase(),
        currentPeriodEnd: iso(sub.current_period_end),
        cancelAtPeriodEnd: Boolean(sub.cancel_at_period_end),
        trialEnd: iso(sub.trial_end),
      }

      const pm = sub.default_payment_method
      if (pm && typeof pm !== 'string' && pm.card) {
        snapshot.paymentMethod = {
          brand: pm.card.brand,
          last4: pm.card.last4,
          expMonth: pm.card.exp_month,
          expYear: pm.card.exp_year,
        }
      }
    }
  } catch (err) {
    console.error('[stripe/subscription] subscription lookup failed', err)
  }

  // ── Fall back to the customer's default card ────────────────────────
  // A subscription created through Checkout does not always carry a
  // default_payment_method; the card sits on the customer instead.
  if (!snapshot.paymentMethod) {
    try {
      const customer = await stripe.customers.retrieve(customerId, {
        expand: ['invoice_settings.default_payment_method'],
      })
      if (!('deleted' in customer)) {
        const pm = customer.invoice_settings?.default_payment_method
        if (pm && typeof pm !== 'string' && pm.card) {
          snapshot.paymentMethod = {
            brand: pm.card.brand,
            last4: pm.card.last4,
            expMonth: pm.card.exp_month,
            expYear: pm.card.exp_year,
          }
        }
      }
    } catch (err) {
      console.error('[stripe/subscription] customer lookup failed', err)
    }
  }

  // ── Invoice history ────────────────────────────────────────────────
  try {
    const invoices = await stripe.invoices.list({ customer: customerId, limit: 6 })
    snapshot.invoices = invoices.data
      // A $0 draft invoice that Stripe generates and voids is noise on a
      // billing page - only show what the customer was actually billed.
      .filter((inv) => inv.status !== 'draft')
      .map((inv) => ({
        id: inv.id,
        date: iso(inv.created) ?? new Date().toISOString(),
        amount: dollars(inv.amount_paid || inv.amount_due) ?? 0,
        currency: (inv.currency ?? 'aud').toUpperCase(),
        status: inv.status ?? 'unknown',
        number: inv.number ?? null,
        hostedUrl: inv.hosted_invoice_url ?? null,
        pdfUrl: inv.invoice_pdf ?? null,
      }))
  } catch (err) {
    console.error('[stripe/subscription] invoice lookup failed', err)
  }

  return NextResponse.json(snapshot)
}
