// POST /api/prescreen/share/email - email a review link to a recipient.
// Body: { to, reviewUrl, candidateName, roleTitle, company, expiresAt? }

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { sendCandidateReviewLinkEmail } from '@/lib/email'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Bad JSON' }, { status: 400 }) }
  const to = String(body?.to ?? '').trim()
  if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
  }
  const reviewUrl = String(body?.reviewUrl ?? '')
  if (!reviewUrl) return NextResponse.json({ error: 'Missing reviewUrl' }, { status: 400 })

  const { data: profile } = await supabaseAdmin
    .from('profiles').select('full_name, email').eq('id', user.id).single()
  const senderName = profile?.full_name ?? profile?.email ?? 'A teammate'

  await sendCandidateReviewLinkEmail({
    to,
    senderName,
    candidateName: String(body?.candidateName ?? 'a candidate'),
    roleTitle: String(body?.roleTitle ?? ''),
    company: String(body?.company ?? ''),
    reviewUrl,
    expiresAt: body?.expiresAt ?? null,
  })
  return NextResponse.json({ ok: true })
}
