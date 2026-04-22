// GET /api/prescreen/compare?ids=a,b,c,d
// Returns a payload per response for the side-by-side compare view.
// Requires auth; all response ids must belong to sessions in the caller's business_id.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const raw = req.nextUrl.searchParams.get('ids') ?? ''
  const ids = raw.split(',').map(s => s.trim()).filter(Boolean)
  if (ids.length < 1 || ids.length > 4) {
    return NextResponse.json({ error: 'Provide 1-4 response ids' }, { status: 400 })
  }

  try {
    const { data: profile } = await supabaseAdmin
      .from('profiles').select('business_id').eq('id', user.id).single()
    const businessId = profile?.business_id
    if (!businessId) return NextResponse.json({ error: 'No business' }, { status: 403 })

    const { data: responses, error } = await supabaseAdmin
      .from('prescreen_responses')
      .select('id, session_id, candidate_name, candidate_email, submitted_at, status, rating, video_ids, stage, notes')
      .in('id', ids)
    if (error) throw error
    if (!responses || responses.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const sessionIds = Array.from(new Set(responses.map(r => r.session_id)))
    const { data: sessions } = await supabaseAdmin
      .from('prescreen_sessions')
      .select('id, role_title, company, questions, time_limit_seconds, created_by')
      .in('id', sessionIds)
    const sessionById = Object.fromEntries((sessions ?? []).map(s => [s.id, s]))

    // Verify ownership: each session.created_by must belong to a profile in our business.
    const creatorIds = Array.from(new Set((sessions ?? []).map(s => s.created_by)))
    const { data: creatorProfiles } = await supabaseAdmin
      .from('profiles').select('id, business_id').in('id', creatorIds)
    const ok = (creatorProfiles ?? []).every(p => p.business_id === businessId)
    if (!ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { data: evals } = await supabaseAdmin
      .from('prescreen_evaluations')
      .select('id, response_id, rubric, overall_summary, model, created_at')
      .in('response_id', ids)
      .order('created_at', { ascending: false })
    const evalByResponse: Record<string, any> = {}
    for (const e of evals ?? []) {
      if (!evalByResponse[e.response_id]) evalByResponse[e.response_id] = e
    }

    const { data: transcripts } = await supabaseAdmin
      .from('prescreen_transcripts')
      .select('response_id, text, created_at')
      .in('response_id', ids)
      .order('created_at', { ascending: false })
    const transcriptByResponse: Record<string, string> = {}
    for (const t of transcripts ?? []) {
      if (!transcriptByResponse[t.response_id] && t.text) {
        transcriptByResponse[t.response_id] = t.text.slice(0, 600)
      }
    }

    // Keep caller's id order
    const byId = Object.fromEntries(responses.map(r => [r.id, r]))
    const payload = ids.map(id => {
      const r = byId[id]
      if (!r) return null
      const s = sessionById[r.session_id]
      return {
        id: r.id,
        session_id: r.session_id,
        candidate_name: r.candidate_name,
        candidate_email: r.candidate_email,
        submitted_at: r.submitted_at,
        status: r.status,
        staff_rating: r.rating ?? null,
        stage: r.stage ?? 'new',
        notes: r.notes ?? null,
        video_ids: r.video_ids ?? [],
        role_title: s?.role_title ?? '',
        company: s?.company ?? '',
        questions: s?.questions ?? [],
        evaluation: evalByResponse[r.id] ?? null,
        transcript_summary: transcriptByResponse[r.id] ?? null,
      }
    }).filter(Boolean)

    return NextResponse.json({ candidates: payload })
  } catch (err) {
    console.error('[GET /api/prescreen/compare]', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
