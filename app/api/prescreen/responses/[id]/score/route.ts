// POST /api/prescreen/responses/[id]/score
// Server-to-server: sets status=evaluating, loads the latest transcript and
// session rubric, calls Claude, writes prescreen_evaluations +
// prescreen_scoring_audit, sets status=scored.

import { NextRequest, NextResponse } from 'next/server'
import crypto from 'node:crypto'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { scoreResponse, STANDARD_RUBRIC, SCORING_MODEL, SYSTEM_PROMPT } from '@/lib/claude-scoring'
import type { RubricDimension } from '@/lib/recruit-types'

export const runtime = 'nodejs'
export const maxDuration = 300

function sha256(s: string) {
  return crypto.createHash('sha256').update(s).digest('hex')
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    await supabaseAdmin
      .from('prescreen_responses')
      .update({ status: 'evaluating' })
      .eq('id', id)

    const { data: resp, error: respErr } = await supabaseAdmin
      .from('prescreen_responses')
      .select('id, session_id')
      .eq('id', id)
      .single()
    if (respErr || !resp) return NextResponse.json({ error: 'Response not found' }, { status: 404 })

    const { data: session, error: sessErr } = await supabaseAdmin
      .from('prescreen_sessions')
      .select('id, role_title, company, questions, rubric_mode, custom_rubric')
      .eq('id', resp.session_id)
      .single()
    if (sessErr || !session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

    const { data: transcript, error: txErr } = await supabaseAdmin
      .from('prescreen_transcripts')
      .select('text, utterances')
      .eq('response_id', id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    if (txErr || !transcript) return NextResponse.json({ error: 'Transcript not found' }, { status: 409 })

    const rubric: RubricDimension[] =
      session.rubric_mode === 'custom' && Array.isArray(session.custom_rubric) && session.custom_rubric.length > 0
        ? (session.custom_rubric as RubricDimension[])
        : STANDARD_RUBRIC

    const questionText: string = Array.isArray(session.questions) ? (session.questions[0] ?? '') : ''

    const result = await scoreResponse({
      transcript: transcript.text ?? '',
      utterances: (transcript.utterances as any[]) ?? [],
      rubric,
      roleTitle: session.role_title,
      company: session.company,
      questionText,
    })

    const promptHash = sha256(SYSTEM_PROMPT + '\n' + JSON.stringify(rubric))
    const inputHash = sha256((transcript.text ?? '') + '\n' + questionText)

    // Defensive insert: prescreen_evaluations gained `recommendation_action`
    // and `recommendation_rationale` via the optional migration
    // `prescreen_recommendations.sql`. If that migration is not yet
    // applied on this Supabase instance, the full INSERT errors and
    // the whole pipeline silently halts at status='evaluating' (the
    // AI Suggestion card spins forever). Retry without the optional
    // columns so the pipeline completes; founder can apply the
    // migration later to unlock recommendation rendering.
    const fullPayload = {
      response_id: id,
      rubric: result.rubric,
      overall_summary: result.overall_summary,
      recommendation_action: result.recommendation_action,
      recommendation_rationale: result.recommendation_rationale,
      model: SCORING_MODEL,
    }
    const corePayload = {
      response_id: id,
      rubric: result.rubric,
      overall_summary: result.overall_summary,
      model: SCORING_MODEL,
    }
    const tryFull = await supabaseAdmin.from('prescreen_evaluations').insert(fullPayload)
    if (tryFull.error) {
      const msg = tryFull.error.message?.toLowerCase() ?? ''
      const isMissingCol = msg.includes('recommendation_action') || msg.includes('recommendation_rationale') || msg.includes('schema cache')
      if (isMissingCol) {
        console.warn('[score] prescreen_recommendations migration not applied - inserting core payload only:', tryFull.error.message)
        const retry = await supabaseAdmin.from('prescreen_evaluations').insert(corePayload)
        if (retry.error) {
          console.error('[score] evaluations insert (core retry) failed:', retry.error.message)
          throw retry.error
        }
      } else {
        console.error('[score] evaluations insert failed:', tryFull.error.message)
        throw tryFull.error
      }
    }

    const { error: auditErr } = await supabaseAdmin
      .from('prescreen_scoring_audit')
      .insert({
        response_id: id,
        model: SCORING_MODEL,
        prompt_hash: promptHash,
        input_hash: inputHash,
        output_json: result.raw,
      })
    if (auditErr) throw auditErr

    await supabaseAdmin
      .from('prescreen_responses')
      .update({ status: 'scored' })
      .eq('id', id)

    return NextResponse.json({ ok: true })
  } catch (err) {
    // Surface the actual error in the response body so the failure is
    // visible in Vercel logs and the parent triggerScoringPipeline can
    // include it when the after() callback logs the failure.
    const detail = err instanceof Error ? err.message : String(err)
    console.error('[POST /api/prescreen/responses/:id/score]', { responseId: id, detail })
    return NextResponse.json({ error: 'Scoring failed', detail }, { status: 500 })
  }
}
