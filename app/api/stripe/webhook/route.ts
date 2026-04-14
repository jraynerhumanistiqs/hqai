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
        }
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
