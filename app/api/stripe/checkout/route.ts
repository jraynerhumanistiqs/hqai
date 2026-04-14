import { createClient } from '@/lib/supabase/server'
import { getStripe, PLANS, PlanId } from '@/lib/stripe'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { priceId, planId } = await req.json()

  const { data: profile } = await supabase
    .from('profiles').select('business_id, businesses(stripe_customer_id, name)')
    .eq('id', user.id).single()

  const business = (profile?.businesses as any)
  let customerId = business?.stripe_customer_id

  // Create Stripe customer if none exists
  if (!customerId) {
    const customer = await getStripe().customers.create({
      email: user.email,
      name: business?.name || undefined,
      metadata: { business_id: profile?.business_id || '' },
    })
    customerId = customer.id
    await supabase.from('businesses')
      .update({ stripe_customer_id: customer.id })
      .eq('id', profile?.business_id)
  }

  const origin = req.headers.get('origin') || 'https://hqai.vercel.app'

  const session = await getStripe().checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${origin}/dashboard/settings?billing=success`,
    cancel_url: `${origin}/dashboard/settings?billing=cancelled`,
    subscription_data: {
      metadata: {
        business_id: profile?.business_id || '',
        plan: planId || '',
      },
    },
  })

  return NextResponse.json({ url: session.url })
}
