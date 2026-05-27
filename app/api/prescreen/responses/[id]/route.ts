// PATCH /api/prescreen/responses/[id] - update rating, status, notes

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { resolveBusinessScope, assertResponseInScope } from '@/lib/supabase/scope'

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
    // Multi-tenant gate: caller must own the response (via session ->
    // business) before any field is mutated. Without this, any authed
    // user could PATCH ratings / stage / notes on another tenant's
    // candidates.
    const scope = await resolveBusinessScope(user.id)
    if (!(await assertResponseInScope(scope, id))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
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

// Hard-delete a prescreen response row. Scoped via the response's
// parent session -> business; cross-tenant deletes get 403. Derivative
// rows (transcript, evaluation, notes, scoring_audit) cascade or are
// cleaned up by their own FK ON DELETE rules where present.
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  try {
    const scope = await resolveBusinessScope(user.id)
    if (!(await assertResponseInScope(scope, id))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const { error } = await supabaseAdmin
      .from('candidate_responses')
      .delete()
      .eq('id', id)
    if (error) {
      console.error('[DELETE /api/prescreen/responses/:id]', error.message)
      return NextResponse.json({ error: 'Delete failed', detail: error.message }, { status: 500 })
    }
    return NextResponse.json({ ok: true, id })
  } catch (err) {
    console.error('[DELETE /api/prescreen/responses/:id]', err)
    const detail = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: 'Delete failed', detail }, { status: 500 })
  }
}
