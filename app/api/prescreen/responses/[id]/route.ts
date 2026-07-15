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
      // Step 3 + Step 4 of the role workflow stepper. shortlist_action
      // is a verb translated into shortlisted_at + shortlisted_by below;
      // decision lands directly with the constraint-checked enum.
      'shortlist_action', 'decision', 'decision_reason',
      // Step 4 (Interviews) - AI guide, interviewer notes, recording
      // link. Depend on migration prescreen_interview_notes.sql; see the
      // graceful fallback below if it hasn't been applied yet.
      'interview_guide', 'interview_notes', 'interview_recording_url',
      // Shortlist Agent per-candidate editing: tailored screening
      // questions and screening-method opt-ins. Both depend on optional
      // migrations covered by the same graceful fallback below.
      'custom_questions', 'preferred_screen_methods',
    ])
    const patch: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(body ?? {})) {
      if (ALLOWED.has(k)) patch[k] = v
    }
    // Translate the shortlist_action verb into timestamp + actor columns.
    // Recording the actor lets us surface "shortlisted by Jane 5m ago"
    // in the Step 3 view without an extra join.
    if (patch.shortlist_action === 'promote') {
      patch.shortlisted_at = new Date().toISOString()
      patch.shortlisted_by = user.id
    } else if (patch.shortlist_action === 'remove') {
      patch.shortlisted_at = null
      patch.shortlisted_by = null
    }
    delete patch.shortlist_action
    // Stamp the decision actor + time whenever a Step 4 outcome lands.
    // Clearing the decision back to null also clears the audit columns.
    if ('decision' in patch) {
      patch.decision_at = patch.decision === null ? null : new Date().toISOString()
      patch.decision_by = patch.decision === null ? null : user.id
    }
    if (typeof patch.decision_reason === 'string') {
      patch.decision_reason = (patch.decision_reason as string).trim().slice(0, 1000) || null
    }
    if (typeof patch.interview_notes === 'string') {
      patch.interview_notes = (patch.interview_notes as string).trim().slice(0, 5000) || null
    }
    if (typeof patch.interview_recording_url === 'string') {
      patch.interview_recording_url = (patch.interview_recording_url as string).trim().slice(0, 500) || null
    }
    if (typeof patch.candidate_name === 'string') {
      patch.candidate_name = (patch.candidate_name as string).trim().slice(0, 200)
      if (!patch.candidate_name) {
        return NextResponse.json({ error: 'candidate_name must be a non-empty string' }, { status: 400 })
      }
    }
    // Tailored screening questions - an array of non-empty strings, or
    // null to fall back to the session's shared set. Bounded so a
    // hostile payload can't stuff megabytes into the row.
    if ('custom_questions' in patch && patch.custom_questions !== null) {
      if (!Array.isArray(patch.custom_questions)) {
        return NextResponse.json({ error: 'custom_questions must be an array of strings or null' }, { status: 400 })
      }
      const cleaned = (patch.custom_questions as unknown[])
        .filter((q): q is string => typeof q === 'string')
        .map(q => q.trim().slice(0, 500))
        .filter(Boolean)
        .slice(0, 20)
      patch.custom_questions = cleaned.length ? cleaned : null
    }
    // Per-candidate screening-method opt-ins - only 'video' / 'phone'
    // land; an empty array collapses to null (= inherit the role default).
    if ('preferred_screen_methods' in patch && patch.preferred_screen_methods !== null) {
      if (!Array.isArray(patch.preferred_screen_methods)) {
        return NextResponse.json({ error: 'preferred_screen_methods must be an array or null' }, { status: 400 })
      }
      const methods = Array.from(new Set(
        (patch.preferred_screen_methods as unknown[]).filter(m => m === 'video' || m === 'phone'),
      ))
      patch.preferred_screen_methods = methods.length ? methods : null
    }
    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
    }
    // Write to prescreen_responses directly (candidate_responses is a
    // back-compat view created before the newer optional columns existed,
    // so updates through it would fail for custom_questions /
    // preferred_screen_methods even when the migrations ARE applied).
    const { data, error } = await supabaseAdmin
      .from('prescreen_responses')
      .update(patch)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      // Graceful fallback: several columns are added by later, optional
      // migrations and may not exist yet on this environment. If the
      // update failed on one of them, retry without those columns so the
      // rest of the patch (decision, rating, etc.) still lands, and tell
      // the caller which migration to apply. Mirrors the pattern in
      // app/api/cv-screening/screenings/[id]/route.ts.
      const OPTIONAL_COLUMN_MIGRATIONS: Record<string, string> = {
        interview_guide: 'prescreen_interview_notes.sql',
        interview_notes: 'prescreen_interview_notes.sql',
        interview_recording_url: 'prescreen_interview_notes.sql',
        custom_questions: 'prescreen_response_custom_questions.sql',
        preferred_screen_methods: 'prescreen_responses_preferred_screen_methods.sql',
      }
      const offending = Object.keys(OPTIONAL_COLUMN_MIGRATIONS)
        .filter(c => c in patch && error.message?.includes(c))
      if (offending.length > 0) {
        const retryPatch = { ...patch }
        for (const c of offending) delete retryPatch[c]
        const migrations = Array.from(new Set(offending.map(c => OPTIONAL_COLUMN_MIGRATIONS[c])))
        const warning = `Not saved: ${offending.join(', ')} - apply migration${migrations.length === 1 ? '' : 's'} ${migrations.join(', ')} on Supabase.`
        if (Object.keys(retryPatch).length === 0) {
          // Nothing left to persist (the whole patch was optional-only) -
          // don't fail the request, just report the row unchanged.
          return NextResponse.json({ response: null, warning })
        }
        const retry = await supabaseAdmin
          .from('prescreen_responses')
          .update(retryPatch)
          .eq('id', id)
          .select()
          .single()
        if (!retry.error) {
          return NextResponse.json({ response: retry.data, warning })
        }
      }
      throw error
    }
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
