// POST /api/marketplace/reserve
//
// Captures an email for the marketplace pre-launch waitlist. Backs the
// "Reserve your spot - first 100 get $10 off" CTA on the landing page
// (section 5 of docs/research/landing-page-research-brief.md).
//
// Inserts into public.marketplace_reservations via supabaseAdmin so the
// public form doesn't need any RLS policy that grants anon write.

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

// Basic RFC 5322-ish email check. Intentionally lenient - we only want
// to block obviously broken inputs, not philosophise about valid TLDs.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(req: Request) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 })
  }

  const email = typeof (body as { email?: unknown })?.email === 'string'
    ? ((body as { email: string }).email).trim().toLowerCase()
    : ''

  if (!email || !EMAIL_RE.test(email) || email.length > 320) {
    return NextResponse.json({ ok: false, error: 'Please enter a valid email.' }, { status: 400 })
  }

  try {
    const { error } = await supabaseAdmin
      .from('marketplace_reservations')
      .insert({ email, source: 'landing' })

    if (error) {
      // Unique-violation isn't fatal for our purposes; treat as success.
      if (error.code === '23505') {
        return NextResponse.json({ ok: true })
      }
      console.error('[marketplace/reserve] insert error:', error)
      return NextResponse.json({ ok: false, error: 'Could not save your spot. Try again in a moment.' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[marketplace/reserve] unexpected:', e)
    return NextResponse.json({ ok: false, error: 'Server error.' }, { status: 500 })
  }
}
