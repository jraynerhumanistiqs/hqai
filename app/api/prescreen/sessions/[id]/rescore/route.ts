// POST /api/prescreen/sessions/[id]/rescore
// Staff-only. Re-runs scoring on every response in the session that already has a transcript.
// Used after editing the session rubric so existing AI Suggestion cards reflect the new dimensions.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const maxDuration = 300

const CONCURRENCY = 4
const SCORABLE_STATUSES = ['transcribed', 'scored', 'staff_reviewed', 'shared', 'reviewed', 'evaluating']

async function runWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length) as R[]
  let cursor = 0
  const workers = new Array(Math.min(limit, items.length)).fill(0).map(async () => {
    while (true) {
      const idx = cursor++
      if (idx >= items.length) return
      results[idx] = await fn(items[idx])
    }
  })
  await Promise.all(workers)
  return results
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { id: sessionId } = await params

  const { data: session, error: sessErr } = await supabaseAdmin
    .from('prescreen_sessions')
    .select('id')
    .eq('id', sessionId)
    .is('deleted_at', null)
    .maybeSingle()
  if (sessErr || !session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }

  const { data: respRows, error: respErr } = await supabaseAdmin
    .from('prescreen_responses')
    .select('id, status')
    .eq('session_id', sessionId)
    .in('status', SCORABLE_STATUSES)
  if (respErr) {
    console.error('[POST /api/prescreen/sessions/:id/rescore] responses', respErr)
    return NextResponse.json({ error: 'Failed to load responses' }, { status: 500 })
  }
  const candidates = respRows ?? []
  if (!candidates.length) {
    return NextResponse.json({ ok: true, queued: 0, errors: [] })
  }

  const { data: txRows } = await supabaseAdmin
    .from('prescreen_transcripts')
    .select('response_id')
    .in('response_id', candidates.map(r => r.id))
  const haveTranscript = new Set((txRows ?? []).map(t => t.response_id as string))
  const targets = candidates.filter(r => haveTranscript.has(r.id))

  if (!targets.length) {
    return NextResponse.json({ ok: true, queued: 0, errors: [] })
  }

  const proto = req.headers.get('x-forwarded-proto') ?? 'https'
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host')
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || (host ? `${proto}://${host}` : '')
  if (!baseUrl) {
    return NextResponse.json({ error: 'No base URL available' }, { status: 500 })
  }

  const errors: Array<{ response_id: string; error: string }> = []
  await runWithConcurrency(targets, CONCURRENCY, async (r) => {
    try {
      const res = await fetch(`${baseUrl}/api/prescreen/responses/${r.id}/score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      if (!res.ok) {
        const body = await res.text().catch(() => '')
        errors.push({ response_id: r.id, error: `HTTP ${res.status}: ${body.slice(0, 200)}` })
      }
    } catch (e) {
      errors.push({ response_id: r.id, error: (e as Error).message })
    }
  })

  return NextResponse.json({
    ok: errors.length === 0,
    queued: targets.length,
    errors,
  })
}