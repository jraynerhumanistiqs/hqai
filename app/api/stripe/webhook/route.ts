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
            plan: plan || 'business',
          }).eq('id', businessId)
          // Grant the recurring credit allocation for this plan. The
          // amounts mirror lib/pricing-config.ts §includedCredits and the
          // brief's §2.3 packaging table.
          // Enterprise customers carry the Business credit ceiling
          // (Full Enterprise gets a higher allowance because it combines
          // both People and Recruit surfaces). Source: lib/pricing-config.ts
          // §enterprise and the strategy doc §2.x.
          const allocationByPlan: Record<
            'solo' | 'business' | 'recruit' | 'enterprise-people' | 'enterprise-recruit' | 'enterprise-full',
            number
          > = {
            solo:                  500,
            business:              2500,
            // Standalone HQ Recruit (hiring only) - mirrors the recruit
            // standalone credit allowance in lib/stripe.ts PLANS.recruit
            // (C10_SELF_SERVE.recruit.bands[0].credits).
            recruit:               500,
            'enterprise-people':   2500,
            'enterprise-recruit':  2500,
            'enterprise-full':     5000,
          }
          type PlanKey = keyof typeof allocationByPlan
          const planKey: PlanKey = (plan && plan in allocationByPlan)
            ? (plan as PlanKey)
            : 'business'
          const allocated = allocationByPlan[planKey]
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
