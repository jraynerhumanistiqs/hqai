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

  const session = await getStripe().billingPortal.sessions.create({
    customer: customerId,
    return_url: `${origin}/dashboard/settings`,
  })

  return NextResponse.json({ url: session.url })
}
