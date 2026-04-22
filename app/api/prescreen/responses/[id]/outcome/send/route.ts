// POST /api/prescreen/responses/[id]/outcome/send
// Manual trigger for the candidate outcome email (shortlisted / rejected).
// Body: { outcome: 'shortlisted'|'rejected', subjectOverride?, bodyOverride? }
// Always attempts to send (force=true) regardless of auto_send_outcomes.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { processOutcomeForResponse } from '@/lib/outcome-service'

export const runtime = 'nodejs'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { id } = await params
  try {
    const body = await req.json().catch(() => ({}))
    const outcome = body.outcome
    if (outcome !== 'shortlisted' && outcome !== 'rejected') {
      return NextResponse.json({ error: 'Invalid outcome' }, { status: 400 })
    }
    const result = await processOutcomeForResponse({
      responseId: id,
      outcome,
      triggeredBy: user.id,
      staffEmail: user.email ?? null,
      subjectOverride: typeof body.subjectOverride === 'string' ? body.subjectOverride : null,
      bodyOverride: typeof body.bodyOverride === 'string' ? body.bodyOverride : null,
      force: true,
    })
    return NextResponse.json(result)
  } catch (err) {
    console.error('[POST outcome/send]', err)
    return NextResponse.json({ error: 'Failed to send outcome' }, { status: 500 })
  }
}
