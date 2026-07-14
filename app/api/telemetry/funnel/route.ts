// POST /api/telemetry/funnel
//
// Fire-and-forget self-serve funnel telemetry (pricing -> signup ->
// onboarding -> checkout). No auth required - pre-signup events are
// anonymous, stitched by the client-minted anon_id. When a session
// cookie IS present the user id is resolved server-side (never trusted
// from the payload).
//
// Soft-fails by convention: if the funnel_events table has not been
// migrated yet (or any insert error occurs) the route still returns
// 200 with { ok: false } so an unapplied migration can never break the
// signup flow. Mirrors app/api/telemetry/tip/route.ts.

import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { isFunnelEvent } from '@/lib/funnel-events'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

// Generous ceiling for a single analytics event; anything bigger is
// malformed or malicious, not funnel data.
const MAX_BODY_BYTES = 10_000

const clip = (v: unknown, max: number): string | null =>
  typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null

export async function POST(req: NextRequest) {
  try {
    const raw = await req.text()
    if (!raw || raw.length > MAX_BODY_BYTES) {
      return NextResponse.json({ ok: false }, { status: 200 })
    }

    let body: Record<string, unknown>
    try {
      body = JSON.parse(raw)
    } catch {
      return NextResponse.json({ ok: false }, { status: 200 })
    }
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ ok: false }, { status: 200 })
    }

    if (!isFunnelEvent(body.event)) {
      return NextResponse.json({ ok: false }, { status: 200 })
    }

    // Resolve the user from the session cookie when one exists. Optional
    // by design - pricing and signup events fire before any session.
    let userId: string | null = null
    try {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      userId = user?.id ?? null
    } catch {
      userId = null
    }

    // Strip unknown fields - only the whitelisted columns are inserted.
    const stepNum = Number(body.step)
    const props = body.props && typeof body.props === 'object' && !Array.isArray(body.props)
      ? body.props
      : {}

    const { error } = await getSupabaseAdmin().from('funnel_events').insert({
      event: body.event,
      anon_id: clip(body.anon_id, 100),
      user_id: userId,
      plan: clip(body.plan, 40),
      cycle: clip(body.cycle, 20),
      step: Number.isInteger(stepNum) ? stepNum : null,
      source: clip(body.source, 60),
      props,
    })

    if (error) {
      // Table missing (migration not applied) or any other insert issue -
      // log once and move on. Never a non-2xx for analytics.
      console.warn('[telemetry/funnel] insert failed:', error.message)
      return NextResponse.json({ ok: false }, { status: 200 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.warn('[telemetry/funnel]', err)
    return NextResponse.json({ ok: false }, { status: 200 })
  }
}
