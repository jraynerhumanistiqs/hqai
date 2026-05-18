// PATCH /api/prescreen/responses/[id] - update rating, status, notes

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  try {
    const body = await req.json()
    // Whitelist updatable columns - the route previously took whatever
    // the caller sent (rating + stage + notes + candidate_name + the
    // outcome flags), which works but means a typo / hostile payload
    // could land in any column. Lock it down to the actual UI-driven
    // fields, including the new candidate_name rename support.
    const ALLOWED = new Set([
      'rating', 'status', 'stage', 'notes', 'outcome', 'outcome_reason',
      'candidate_name', 'candidate_email',
      'recommendation', 'overall_score',
    ])
    const patch: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(body ?? {})) {
      if (ALLOWED.has(k)) patch[k] = v
    }
    if (typeof patch.candidate_name === 'string') {
      patch.candidate_name = (patch.candidate_name as string).trim().slice(0, 200)
      if (!patch.candidate_name) {
        return NextResponse.json({ error: 'candidate_name must be a non-empty string' }, { status: 400 })
      }
    }
    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
    }
    const { data, error } = await supabaseAdmin
      .from('candidate_responses')
      .update(patch)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ response: data })
  } catch (err) {
    console.error('[PATCH /api/prescreen/responses/:id]', err)
    return NextResponse.json({ error: 'Failed to update response' }, { status: 500 })
  }
}
