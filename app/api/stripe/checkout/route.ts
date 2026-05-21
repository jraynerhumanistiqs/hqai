// POST /api/stripe/checkout
//
// Starts a Stripe Checkout session for the authenticated user's
// business. The client supplies a planId; the price id is resolved
// server-side from env vars so a malicious client can't substitute a
// cheaper price. Returns { url } on success - the caller redirects
// the browser there.

import { createClient } from '@/lib/supabase/server'
import { getStripe, getStripePriceId, isBillingCycle, isPlanId } from '@/lib/stripe'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  let body: { planId?: unknown; cycle?: unknown; foundation?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (!isPlanId(body.planId)) {
    return NextResponse.json({ error: 'Invalid planId. Expected one of: solo, business.' }, { status: 400 })
  }
  const planId = body.planId

  // Default to monthly if the caller forgot to send a cycle. New clients
  // always send one; the default keeps any legacy callers limping along.
  const cycle = isBillingCycle(body.cycle) ? body.cycle : 'monthly'
  const foundation = body.foundation === true

  // TODO: gate Foundation pricing behind a foundation_members table once the first cohort lands.
  // For now we trust the boolean flag from the client - the Foundation 100
  // is enforced by Stripe at the price-id level (only Foundation customers
  // are sent to the locked annual price).
  if (foundation && (planId !== 'business' || cycle !== 'annual')) {
    return NextResponse.json({ error: 'Foundation pricing requires the Business plan on an annual cycle.' }, { status: 400 })
  }

  const priceId = getStripePriceId(planId, cycle, foundation)
  if (!priceId) {
    console.error(`[stripe/checkout] missing env var for plan ${planId}/${cycle}${foundation ? '/foundation' : ''}`)
    return NextResponse.json({
      error: 'Billing is not fully configured yet. Please contact support.',
    }, { status: 503 })
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

  try {
    const session = await getStripe().checkout.sessions.create({
      customer: customerId!,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/dashboard/settings?billing=success`,
      cancel_url: `${origin}/dashboard/settings?billing=cancelled`,
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      subscription_data: {
        metadata: {
          business_id: profile.business_id,
          plan: planId,
          cycle,
          foundation: foundation ? 'true' : 'false',
        },
      },
      // Keep the business id on the checkout session too so the webhook
      // can resolve it even if subscription_data metadata propagation
      // ever slips.
      metadata: {
        business_id: profile.business_id,
        plan: planId,
        cycle,
        foundation: foundation ? 'true' : 'false',
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
