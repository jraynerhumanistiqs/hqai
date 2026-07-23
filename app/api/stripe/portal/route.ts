import { createClient } from '@/lib/supabase/server'
import { getStripe } from '@/lib/stripe'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('businesses(stripe_customer_id)')
    .eq('id', user.id).single()

  const customerId = (profile?.businesses as any)?.stripe_customer_id
  if (!customerId) {
    return NextResponse.json({ error: 'No billing account' }, { status: 400 })
  }

  const origin = req.headers.get('origin') || 'https://www.humanistiqs.ai'

  try {
    const session = await getStripe().billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}/dashboard/settings`,
    })
    return NextResponse.json({ url: session.url })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[stripe/portal] billingPortal.sessions.create failed', err)
    // Most common live-mode cause: the Customer Portal has not been activated
    // in Stripe yet. In live mode you must save the portal settings once
    // (Stripe Dashboard > Settings > Billing > Customer portal) to create the
    // default configuration; until then this call throws a "configuration"
    // error. Surface the real reason instead of a generic connection error.
    const hint = /configuration/i.test(message)
      ? 'Billing management is not switched on yet. Please contact support and we will sort it.'
      : 'Could not open the billing portal. Please try again or contact support.'
    return NextResponse.json({ error: hint, detail: message }, { status: 502 })
  }
}
