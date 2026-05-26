// PATCH /api/prescreen/responses/[id]/stage
// Updates kanban stage for a prescreen response.
// Auth required. Validates stage enum.
// Phase 4: when new stage is 'shortlisted' or 'rejected' we also queue a
// prescreen_outcome_events row (and fire-and-forget the email when the
// session has auto_send_outcomes enabled).

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { resolveBusinessScope, assertResponseInScope } from '@/lib/supabase/scope'
import { processOutcomeForResponse } from '@/lib/outcome-service'

export const runtime = 'nodejs'

const VALID_STAGES = ['new', 'in_review', 'shortlisted', 'rejected'] as const
type Stage = typeof VALID_STAGES[number]

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { id } = await params
  try {
    // Multi-tenant gate: stage transitions fire outcome emails to the
    // candidate, so we MUST confirm the caller owns the response
    // before flipping it to shortlisted/rejected.
    const scope = await resolveBusinessScope(user.id)
    if (!(await assertResponseInScope(scope, id))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const body = await req.json()
    const stage = body?.stage as Stage
    if (!VALID_STAGES.includes(stage)) {
      return NextResponse.json({ error: 'Invalid stage' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('prescreen_responses')
      .update({ stage })
      .eq('id', id)
      .select('id, stage')
      .single()

    if (error) throw error

    // Phase 4 outcome automation (fire-and-forget)
    if (stage === 'shortlisted' || stage === 'rejected') {
      void processOutcomeForResponse({
        responseId: id,
        outcome: stage,
        triggeredBy: user.id,
        staffEmail: user.email ?? null,
      }).catch((e) => console.error('[stage PATCH] outcome processing failed', e))
    }

    return NextResponse.json({ response: data })
  } catch (err) {
    console.error('[PATCH /api/prescreen/responses/:id/stage]', err)
    return NextResponse.json({ error: 'Failed to update stage' }, { status: 500 })
  }
}
