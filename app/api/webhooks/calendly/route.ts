// POST /api/webhooks/calendly
// Receives Calendly invitee.created events. Verifies the HMAC signature using
// CALENDLY_WEBHOOK_SIGNING_KEY, then matches the invitee email to a shortlisted
// prescreen_response within the last 60 days and stores a booking row.

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { createHmac, timingSafeEqual } from 'crypto'

export const runtime = 'nodejs'

function verifySignature(rawBody: string, signatureHeader: string | null): boolean {
  if (!signatureHeader) return false
  const key = process.env.CALENDLY_WEBHOOK_SIGNING_KEY
  if (!key) return false
  // Calendly uses "t=<timestamp>,v1=<hash>" style. Accept that or a plain hex hash.
  let provided = signatureHeader
  const v1Match = signatureHeader.match(/v1=([a-f0-9]+)/i)
  const tMatch = signatureHeader.match(/t=(\d+)/i)
  const signedPayload = tMatch ? `${tMatch[1]}.${rawBody}` : rawBody
  if (v1Match) provided = v1Match[1]
  const expected = createHmac('sha256', key).update(signedPayload).digest('hex')
  try {
    const a = Buffer.from(expected, 'hex')
    const b = Buffer.from(provided, 'hex')
    if (a.length !== b.length) return false
    return timingSafeEqual(a, b)
  } catch {
    return false
  }
}

export async function POST(req: NextRequest) {
  const raw = await req.text()
  const sig = req.headers.get('calendly-webhook-signature')
  if (!verifySignature(raw, sig)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let payload: any
  try { payload = JSON.parse(raw) } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  const event = payload?.event
  if (event !== 'invitee.created') return NextResponse.json({ ok: true, ignored: true })

  const p = payload?.payload ?? {}
  const inviteeEmail: string = String(p?.email ?? '').trim().toLowerCase()
  const eventStart: string | null = p?.scheduled_event?.start_time ?? null
  const eventEnd: string | null = p?.scheduled_event?.end_time ?? null
  const calendlyEventUri: string | null = p?.scheduled_event?.uri ?? p?.uri ?? null
  if (!inviteeEmail || !eventStart || !eventEnd || !calendlyEventUri) {
    return NextResponse.json({ ok: false, error: 'Missing required fields' }, { status: 400 })
  }

  const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString()
  const { data: responses } = await supabaseAdmin
    .from('prescreen_responses')
    .select('id, candidate_email, stage, submitted_at')
    .eq('stage', 'shortlisted')
    .ilike('candidate_email', inviteeEmail)
    .gte('submitted_at', sixtyDaysAgo)
    .order('submitted_at', { ascending: false })
    .limit(1)
  const response = (responses ?? [])[0]
  if (!response) return NextResponse.json({ ok: true, matched: false })

  const { data: booking, error } = await supabaseAdmin
    .from('prescreen_interview_bookings')
    .insert({
      response_id: response.id,
      invitee_email: inviteeEmail,
      event_start: eventStart,
      event_end: eventEnd,
      calendly_event_uri: calendlyEventUri,
    })
    .select('id')
    .single()
  if (error) {
    console.error('[calendly webhook] insert err', error)
    return NextResponse.json({ ok: false }, { status: 500 })
  }

  return NextResponse.json({ ok: true, matched: true, booking_id: booking?.id })
}
