// POST /api/stripe/checkout
//
// Starts a Stripe Checkout session for the authenticated user's
// business. The client supplies a planId; the price id is resolved
// server-side from env vars so a malicious client can't substitute a
// cheaper price. Returns { url } on success - the caller redirects
// the browser there.

import { createClient } from '@/lib/supabase/server'
import { buildCheckoutReturnUrls, getAdvisoryHourPriceId, getStripe, getStripePriceId, isBillingCycle, isCheckoutReturnTo, isPlanId, isSalesAssistedPlan } from '@/lib/stripe'
import { ADVISORY_HOURS } from '@/lib/pricing-config'
import { NextRequest, NextResponse } from 'next/server'
import type Stripe from 'stripe'

export const runtime = 'nodejs'

// Clamp a client-supplied advisory-hours value to a safe integer within the
// published band. Anything junk becomes 0 (no hours booked).
function safeHours(raw: unknown): number {
  const n = typeof raw === 'number' ? raw : Number(raw)
  if (!Number.isFinite(n)) return 0
  return Math.min(Math.max(Math.trunc(n), 0), ADVISORY_HOURS.maxHours)
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  let body: { planId?: unknown; cycle?: unknown; returnTo?: unknown; advisoryHours?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (!isPlanId(body.planId)) {
    return NextResponse.json({
      error: `Invalid planId "${String(body.planId)}". Expected one of: solo, business (enterprise plans go through /enterprise).`,
    }, { status: 400 })
  }
  const planId = body.planId

  // Enterprise variants are sales-assisted - they go through the
  // discovery call funnel at /enterprise, not public Stripe Checkout.
  // The founder invoices these customers manually via Stripe Invoicing.
  if (isSalesAssistedPlan(planId)) {
    return NextResponse.json({
      error: 'This plan requires a discovery call.',
      redirect: '/outsourcing',
    }, { status: 400 })
  }

  // Default to monthly if the caller forgot to send a cycle. New clients
  // always send one; the default keeps any legacy callers limping along.
  const cycle = isBillingCycle(body.cycle) ? body.cycle : 'monthly'

  // Where to send the buyer after Stripe. Unknown or missing values fall
  // back to 'settings' so the pre-existing dashboard billing callers keep
  // their exact behaviour; only the onboarding funnel opts into /welcome.
  const returnTo = isCheckoutReturnTo(body.returnTo) ? body.returnTo : 'settings'

  const priceId = getStripePriceId(planId, cycle)
  if (!priceId) {
    console.error(`[stripe/checkout] missing env var for plan ${planId}/${cycle}`)
    return NextResponse.json({
      error: 'Billing is not fully configured yet. Please contact support.',
    }, { status: 503 })
  }

  // Optional advisory hours booked on the onboarding Support step. Same
  // $250/hr one-off for HR and Recruitment - tracked separately for the
  // advisor's benefit, billed as a single one-time line item (quantity =
  // total hours) on the subscription's first invoice.
  const advisory = (body.advisoryHours ?? {}) as { hr?: unknown; recruit?: unknown }
  const hrHours = safeHours(advisory.hr)
  const recruitHours = safeHours(advisory.recruit)
  const totalAdvisoryHours = hrHours + recruitHours

  let advisoryPriceId: string | null = null
  if (totalAdvisoryHours > 0) {
    advisoryPriceId = getAdvisoryHourPriceId()
    if (!advisoryPriceId) {
      // The buyer asked to pay for hours but the price isn't wired yet.
      // Refuse rather than charge the plan and silently drop the hours -
      // the same "not switched on yet" 503 the funnel already handles.
      console.error('[stripe/checkout] advisory hours requested but STRIPE_PRICE_ID_ADVISORY_HOUR is unset')
      return NextResponse.json({
        error: 'Advisory time isn\'t switched on for online payment just yet. Please contact support.',
      }, { status: 503 })
    }
  }

  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('business_id, businesses(stripe_customer_id, name)')
    .eq('id', user.id)
    .single()

  if (profileErr || !profile?.business_id) {
    return NextResponse.json({ error: 'No business profile' }, { status: 400 })
  }
  const business = profile.businesses as unknown as { stripe_customer_id: string | null; name: string | null } | null

  let customerId = business?.stripe_customer_id ?? null

  if (!customerId) {
    try {
      const customer = await getStripe().customers.create({
        email: user.email,
        name: business?.name || undefined,
        metadata: { business_id: profile.business_id },
      })
      customerId = customer.id
      const { error: updErr } = await supabase
        .from('businesses')
        .update({ stripe_customer_id: customer.id })
        .eq('id', profile.business_id)
      if (updErr) {
        console.error('[stripe/checkout] failed to persist stripe_customer_id', updErr)
      }
    } catch (err) {
      console.error('[stripe/checkout] customer create failed', err)
      return NextResponse.json({ error: 'Could not create Stripe customer' }, { status: 502 })
    }
  }

  const origin = req.headers.get('origin')
    || process.env.NEXT_PUBLIC_BASE_URL
    || 'https://www.humanistiqs.ai'

  const { successUrl, cancelUrl } = buildCheckoutReturnUrls(origin, returnTo, planId, cycle)

  // Recurring plan first; advisory hours (if any) as a one-time line item.
  // Stripe bills one-time prices on the initial invoice only, so the hours
  // are charged today alongside the first subscription payment.
  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [{ price: priceId, quantity: 1 }]
  if (advisoryPriceId && totalAdvisoryHours > 0) {
    lineItems.push({ price: advisoryPriceId, quantity: totalAdvisoryHours })
  }

  // Advisory-hours breakdown travels on both the session and the
  // subscription so the founder can see, in Stripe, exactly how much HR vs
  // recruitment time each buyer paid for and book the advisor accordingly.
  const advisoryMeta: Record<string, string> = totalAdvisoryHours > 0
    ? {
        advisory_hr_hours: String(hrHours),
        advisory_recruit_hours: String(recruitHours),
        advisory_hourly_rate: String(ADVISORY_HOURS.hourlyRate),
      }
    : {}

  try {
    const session = await getStripe().checkout.sessions.create({
      customer: customerId!,
      mode: 'subscription',
      line_items: lineItems,
      success_url: successUrl,
      cancel_url: cancelUrl,
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      subscription_data: {
        metadata: {
          business_id: profile.business_id,
          plan: planId,
          cycle,
          ...advisoryMeta,
        },
      },
      // Keep the business id on the checkout session too so the webhook
      // can resolve it even if subscription_data metadata propagation
      // ever slips.
      metadata: {
        business_id: profile.business_id,
        plan: planId,
        cycle,
        ...advisoryMeta,
      },
    })
    if (!session.url) {
      console.error('[stripe/checkout] session created with no url')
      return NextResponse.json({ error: 'Stripe did not return a checkout URL' }, { status: 502 })
    }
    return NextResponse.json({ url: session.url })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[stripe/checkout] session create failed', err)
    return NextResponse.json({ error: 'Could not start checkout', detail: message }, { status: 502 })
  }
}
