// POST /api/prescreen/evaluations/[id]/decision
// Staff reviews the AI suggestion chip: Accept / Adjust / Reject.
// Updates prescreen_scoring_audit + flips prescreen_responses.status to
// 'staff_reviewed'. Requires an authenticated staff user.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

type Decision = 'accept' | 'adjust' | 'reject'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { id: evaluationId } = await params
  try {
    const body = await req.json()
    const decision = body.decision as Decision
    if (!['accept', 'adjust', 'reject'].includes(decision)) {
      return NextResponse.json({ error: 'Invalid decision' }, { status: 400 })
    }

    const { data: evaluation, error: evalErr } = await supabaseAdmin
      .from('prescreen_evaluations')
      .select('id, response_id, rubric')
      .eq('id', evaluationId)
      .single()
    if (evalErr || !evaluation) {
      return NextResponse.json({ error: 'Evaluation not found' }, { status: 404 })
    }

    const { data: audit } = await supabaseAdmin
      .from('prescreen_scoring_audit')
      .select('id')
      .eq('response_id', evaluation.response_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (audit?.id) {
      await supabaseAdmin
        .from('prescreen_scoring_audit')
        .update({
          staff_decision: decision,
          staff_decision_at: new Date().toISOString(),
          staff_user_id: user.id,
        })
        .eq('id', audit.id)
    }

    if (decision === 'adjust' && Array.isArray(body.adjusted_rubric)) {
      await supabaseAdmin
        .from('prescreen_evaluations')
        .update({ rubric: body.adjusted_rubric })
        .eq('id', evaluationId)
    }

    await supabaseAdmin
      .from('prescreen_responses')
      .update({ status: 'staff_reviewed' })
      .eq('id', evaluation.response_id)

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[POST /api/prescreen/evaluations/:id/decision]', err)
    return NextResponse.json({ error: 'Failed to record decision' }, { status: 500 })
  }
}
