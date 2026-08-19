// POST /api/checkout-query
//
// Backs the "submit a query" form on the /welcome cancelled screen (a buyer
// who backed out of Stripe checkout). The form asks only for the substance
// of their question; everything else (name, email, business, plan, the
// onboarding details) is RECALLED server-side from the authed session and
// folded into the emails.
//
// Fires two emails (Resend, best-effort - never hard-fail the response):
//   1. Team notification -> HQ_CONTACT_EMAIL, replyTo the buyer.
//   2. Buyer confirmation -> a receipt + a snapshot of where they left off,
//      a link back to the payment step, and the "what's next" expectation.
//
// Email-only: no DB row is written (the team email is the record). If email
// is unconfigured the route still returns ok so the UX confirms submission.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getPlanMeta, isCheckoutPlanId, planPriceLine } from '@/components/onboarding/PlanSummaryCard'
import { sendCheckoutQueryTeamEmail, sendCheckoutQueryConfirmation } from '@/lib/email'

export const runtime = 'nodejs'

function asTrimmed(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  let body: { topic?: unknown; message?: unknown; phone?: unknown; bestTime?: unknown; cycle?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const message = asTrimmed(body.message, 2000)
  if (!message) {
    return NextResponse.json({ error: 'Please tell us what you would like to chat about.' }, { status: 400 })
  }
  const topic = asTrimmed(body.topic, 80) || null
  const phone = asTrimmed(body.phone, 40) || null
  const bestTime = asTrimmed(body.bestTime, 120) || null
  const cycle = body.cycle === 'annual' ? 'annual' : 'monthly'

  // Recall the buyer's context so the form can stay short. The business row
  // carries the onboarding answers; the profile carries the display name.
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, businesses(name, plan, industry, headcount, state)')
    .eq('id', user.id)
    .maybeSingle()

  const biz = (profile?.businesses as unknown as {
    name?: string; plan?: string; industry?: string; headcount?: string; state?: string
  } | null) ?? null

  const userName = (profile?.full_name as string) || ''
  const userEmail = user.email || ''
  const businessName = biz?.name || 'their business'

  // Plan label ("HQ Business (up to 150) - $269 a month") from the recalled
  // plan id, falling back to the default checkout plan when unset/legacy.
  const planId = isCheckoutPlanId(biz?.plan) ? biz!.plan! : 'business'
  const meta = getPlanMeta(planId)
  const planLabel = `${meta.name} (${meta.band}) - ${planPriceLine(planId, cycle)}`

  // Snapshot lines recalled from onboarding for the team email.
  const snapshotLines = [
    biz?.industry ? `Industry: ${biz.industry}` : null,
    biz?.headcount ? `Team size: ${biz.headcount}` : null,
    biz?.state ? `State(s): ${biz.state}` : null,
  ].filter(Boolean) as string[]

  const origin = req.headers.get('origin')
    || process.env.NEXT_PUBLIC_BASE_URL
    || 'https://humanistiqs.ai'
  // Onboarding resume-guards an unpaid business straight to the payment step.
  const resumeUrl = `${origin}/onboarding`

  await Promise.allSettled([
    sendCheckoutQueryTeamEmail({
      userName,
      userEmail,
      businessName,
      planLabel,
      topic,
      message,
      phone,
      bestTime,
      snapshotLines,
    }),
    sendCheckoutQueryConfirmation({
      toEmail: userEmail,
      firstName: userName.split(' ')[0] || '',
      businessName,
      planLabel,
      resumeUrl,
    }),
  ])

  return NextResponse.json({ ok: true })
}
