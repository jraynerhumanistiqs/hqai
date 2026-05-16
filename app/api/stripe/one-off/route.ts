// B10 - one-off Stripe Checkout for the $25 Letter-of-Offer experiment.
//
// Designed for the no-signup landing page at /offer. Accepts an
// email, the chosen offer, and a free-form `inputs` payload (the
// form fields collected on the landing page). Stripe metadata has a
// 500 character per-value limit and a 50 key limit, so we serialise
// the form as a single JSON string under `metadata.inputs_json`. On
// the success path /api/administrator/one-off/fulfil reads it back,
// generates the document, and emails it via Resend.

import { NextRequest, NextResponse } from 'next/server'
import { getStripe, getOneOffPriceId, isOneOffOfferId, ONE_OFF_OFFERS } from '@/lib/stripe'

export const runtime = 'nodejs'

interface Body {
  offerId?: unknown
  email?: unknown
  inputs?: unknown
  successUrl?: unknown
  cancelUrl?: unknown
}

function safeStringifyInputs(value: unknown): string {
  try {
    if (!value || typeof value !== 'object') return '{}'
    const str = JSON.stringify(value)
    // Stripe metadata value limit is 500 chars. Truncate with a tag
    // so the fulfilment endpoint can detect overflow and ask the
    // customer to re-enter via the success page.
    if (str.length <= 480) return str
    return JSON.stringify({ _truncated: true, head: str.slice(0, 400) })
  } catch {
    return '{}'
  }
}

export async function POST(req: NextRequest) {
  let body: Body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (!isOneOffOfferId(body.offerId)) {
    return NextResponse.json({ error: 'Invalid offerId' }, { status: 400 })
  }
  const offer = ONE_OFF_OFFERS[body.offerId]
  const priceId = getOneOffPriceId(body.offerId)
  if (!priceId) {
    return NextResponse.json({
      error: 'This offer is not configured yet. Please contact support.',
    }, { status: 503 })
  }

  const email = typeof body.email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)
    ? body.email.trim()
    : null
  if (!email) return NextResponse.json({ error: 'Valid email required' }, { status: 400 })

  const origin = req.headers.get('origin')
    || process.env.NEXT_PUBLIC_BASE_URL
    || 'https://www.humanistiqs.ai'
  const successUrl = (typeof body.successUrl === 'string' && body.successUrl.startsWith(origin))
    ? body.successUrl
    : `${origin}/offer/success?session_id={CHECKOUT_SESSION_ID}`
  const cancelUrl = (typeof body.cancelUrl === 'string' && body.cancelUrl.startsWith(origin))
    ? body.cancelUrl
    : `${origin}/offer/cancelled`

  try {
    const session = await getStripe().checkout.sessions.create({
      mode: 'payment',
      customer_email: email,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url:  cancelUrl,
      allow_promotion_codes: true,
      metadata: {
        offer_id:      body.offerId,
        credit_amount: String(offer.credits),
        customer_email: email,
        inputs_json:   safeStringifyInputs(body.inputs),
      },
      // Mirror on the payment intent too so the fulfilment endpoint
      // can resolve metadata even if Stripe ever changes how it
      // forwards Session metadata to downstream events.
      payment_intent_data: {
        metadata: {
          offer_id:      body.offerId,
          customer_email: email,
        },
      },
    })
    if (!session.url) {
      return NextResponse.json({ error: 'Stripe did not return a checkout URL' }, { status: 502 })
    }
    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('[stripe/one-off]', err)
    return NextResponse.json({ error: 'Could not start checkout', detail: (err as Error).message }, { status: 502 })
  }
}
