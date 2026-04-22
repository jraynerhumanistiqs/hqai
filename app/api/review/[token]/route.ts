// GET /api/review/[token] - PUBLIC read-only payload for a share link.
// Records a view row in prescreen_share_views.

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

function stripMentions(body: string): string {
  // Replace @word tokens with a reviewer-safe placeholder.
  return body.replace(/@[A-Za-z][\w\-\.]*/g, '[team member]')
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params
  try {
    const { data: link } = await supabaseAdmin
      .from('prescreen_share_links')
      .select('id, response_id, expires_at, revoked_at, label, created_at')
      .eq('token', token)
      .single()

    if (!link) {
      return NextResponse.json({ error: 'Review link not found' }, { status: 404 })
    }
    if (link.revoked_at) {
      return NextResponse.json({ error: 'This review link has been revoked' }, { status: 410 })
    }
    if (link.expires_at && new Date(link.expires_at) < new Date()) {
      return NextResponse.json({ error: 'This review link has expired' }, { status: 410 })
    }

    const { data: response } = await supabaseAdmin
      .from('prescreen_responses')
      .select('id, session_id, candidate_name, video_ids, rating, status')
      .eq('id', link.response_id).single()
    if (!response) return NextResponse.json({ error: 'Response missing' }, { status: 404 })

    const { data: session } = await supabaseAdmin
      .from('prescreen_sessions')
      .select('role_title, company, questions')
      .eq('id', response.session_id).single()

    const { data: evals } = await supabaseAdmin
      .from('prescreen_evaluations')
      .select('rubric, overall_summary, created_at')
      .eq('response_id', response.id)
      .order('created_at', { ascending: false })
      .limit(1)
    const evaluation = evals && evals[0] ? evals[0] : null

    const { data: notes } = await supabaseAdmin
      .from('prescreen_notes')
      .select('body, created_at')
      .eq('response_id', response.id)
      .order('created_at', { ascending: true })

    const safeNotes = (notes ?? []).map(n => ({
      body: stripMentions(n.body ?? ''),
      created_at: n.created_at,
    }))

    // Log the view (fire-and-forget). Use forwarded IP when present.
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null
    const ua = req.headers.get('user-agent') ?? null
    void supabaseAdmin.from('prescreen_share_views').insert({
      link_id: link.id, ip, user_agent: ua,
    })

    return NextResponse.json({
      label: link.label,
      expires_at: link.expires_at,
      candidateName: response.candidate_name,
      role: session?.role_title ?? '',
      company: session?.company ?? '',
      questions: session?.questions ?? [],
      videoIds: response.video_ids ?? [],
      evaluation: evaluation
        ? { rubric: evaluation.rubric ?? [], overall_summary: evaluation.overall_summary ?? null }
        : null,
      staffRating: response.rating ?? null,
      notes: safeNotes,
    })
  } catch (err) {
    console.error('[GET /api/review/:token]', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
