import { getStripe } from '@/lib/stripe'
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function POST(req: NextRequest) {
  const supabase = getSupabaseAdmin()
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')!

  let event
  try {
    event = getStripe().webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as any
      if (session.subscription) {
        const subscription = await getStripe().subscriptions.retrieve(session.subscription)
        const businessId = subscription.metadata.business_id
        const plan = subscription.metadata.plan
        if (businessId) {
          await supabase.from('businesses').update({
            stripe_subscription_id: subscription.id,
            subscription_status: 'active',
            plan: plan || 'growth',
          }).eq('id', businessId)
          // B10 - grant the recurring credit allocation for this plan.
          // The amount is hard-coded against the tier; future changes
          // belong in lib/stripe.ts:PLANS.
          const allocationByPlan: Record<string, number> = {
            essentials: 500,
            growth:    1500,
            scale:     5000,
          }
          const allocated = allocationByPlan[plan || 'growth'] ?? 1500
          await supabase.from('credit_allocations').insert({
            business_id:  businessId,
            allocated,
            period_start: new Date().toISOString(),
            source:       'subscription',
            stripe_invoice_id: session.invoice ?? null,
          })
        }
      } else if (session.metadata?.offer_id) {
        // B10 - one-off Letter-of-Offer purchase. Records a credit
        // ledger row keyed by the customer email so the fulfilment
        // worker can locate it when the user follows the success
        // URL.
        const offerId = String(session.metadata.offer_id)
        const credits = Number(session.metadata.credit_amount ?? '1')
        const email = String(session.metadata.customer_email ?? session.customer_email ?? '')
        await supabase.from('credit_ledger').insert({
          business_id:     null,
          user_id:         null,
          tool:            'one_off',
          intent:          `one_off:${offerId}`,
          cost:            -credits, // negative = credit granted
          stripe_event_id: event.id,
          notes:           email ? `one-off purchase for ${email}` : null,
        })
      }
      break
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object as any
      const businessId = subscription.metadata?.business_id
      if (businessId) {
        await supabase.from('businesses').update({
          subscription_status: subscription.status,
        }).eq('id', businessId)
      }
      break
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as any
      const businessId = subscription.metadata?.business_id
      if (businessId) {
        await supabase.from('businesses').update({
          subscription_status: 'cancelled',
          plan: 'free',
        }).eq('id', businessId)
      }
      break
    }
  }

  return NextResponse.json({ received: true })
}
