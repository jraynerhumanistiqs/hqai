// PATCH a single CV screening. Currently used for manual reviewer overrides
// of band, next_action, and an attached free-text comment. The AI's
// original values stay on the row (band, next_action) so drift can be
// measured; the override_* columns hold the human-curated values.

import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

interface ConsiderationIn {
  id?: unknown
  label?: unknown
  status?: unknown
  ai_status?: unknown
  note?: unknown
}

interface Body {
  override_band?: string | null
  override_next_action?: string | null
  override_comment?: string | null
  /** Recruiter-edited candidate display name. Overrides whatever the
   *  AI extracted from the CV. Persisted as candidate_label so the
   *  pipeline + reports + comparison view all read the curated name. */
  candidate_label?: string
  /** Recruiter-confirmed hard-gate eligibility flags (location / work
   *  rights). These are considerations shown post-score, not part of
   *  the merit number, so they live in their own jsonb column. */
  considerations?: ConsiderationIn[] | null
}

const VALID_CONSIDERATION_STATUS = new Set(['met', 'unclear', 'not_met'])

const VALID_BANDS = new Set(['strong_yes', 'yes', 'maybe', 'likely_no', 'reject'])
const VALID_ACTIONS = new Set([
  'schedule_panel',
  'phone_screen',
  'video_interview',
  'reference_check',
  'request_more_info',
  'hold',
  'do_not_progress',
  'reject',
])

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('businesses(id)')
      .eq('id', user.id)
      .single()
    const businessId = (profile?.businesses as unknown as { id: string } | null)?.id ?? null
    if (!businessId) return NextResponse.json({ error: 'No business profile' }, { status: 400 })

    const body = await req.json() as Body
    const patch: Record<string, unknown> = { override_at: new Date().toISOString(), override_by: user.id }

    if ('override_band' in body) {
      if (body.override_band === null) patch.override_band = null
      else if (typeof body.override_band === 'string' && VALID_BANDS.has(body.override_band)) {
        patch.override_band = body.override_band
      } else {
        return NextResponse.json({ error: 'Invalid override_band' }, { status: 400 })
      }
    }
    if ('override_next_action' in body) {
      if (body.override_next_action === null) patch.override_next_action = null
      else if (typeof body.override_next_action === 'string' && VALID_ACTIONS.has(body.override_next_action)) {
        patch.override_next_action = body.override_next_action
      } else {
        return NextResponse.json({ error: 'Invalid override_next_action' }, { status: 400 })
      }
    }
    if ('override_comment' in body) {
      if (body.override_comment === null) patch.override_comment = null
      else if (typeof body.override_comment === 'string') {
        patch.override_comment = body.override_comment.trim().slice(0, 1000) || null
      }
    }
    if ('candidate_label' in body) {
      if (typeof body.candidate_label !== 'string' || !body.candidate_label.trim()) {
        return NextResponse.json({ error: 'candidate_label must be a non-empty string' }, { status: 400 })
      }
      patch.candidate_label = body.candidate_label.trim().slice(0, 200)
    }
    if ('considerations' in body) {
      if (body.considerations === null) {
        patch.considerations = null
      } else if (Array.isArray(body.considerations)) {
        const clean = body.considerations
          .filter(c => c && typeof c.id === 'string' && VALID_CONSIDERATION_STATUS.has(String(c.status)))
          .map(c => ({
            id: String(c.id).slice(0, 80),
            label: typeof c.label === 'string' ? c.label.slice(0, 200) : String(c.id),
            status: String(c.status),
            ai_status: VALID_CONSIDERATION_STATUS.has(String(c.ai_status)) ? String(c.ai_status) : undefined,
            note: typeof c.note === 'string' ? c.note.slice(0, 500) : undefined,
          }))
        patch.considerations = clean
      } else {
        return NextResponse.json({ error: 'considerations must be an array or null' }, { status: 400 })
      }
    }

    // If nothing actually changed besides the audit columns, refuse.
    if (
      !('override_band' in body) &&
      !('override_next_action' in body) &&
      !('override_comment' in body) &&
      !('candidate_label' in body) &&
      !('considerations' in body)
    ) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('cv_screenings')
      .update(patch)
      .eq('id', id)
      .eq('business_id', businessId)
      .select('*')
      .single()

    if (error) {
      // If the considerations column isn't migrated yet, retry the
      // update without it so band/action/name edits still land. The
      // recruiter's eligibility tick just won't persist until the
      // migration (cv_screenings_considerations.sql) is applied.
      if (error.message?.includes('considerations') && 'considerations' in patch) {
        delete patch.considerations
        const retry = await supabaseAdmin
          .from('cv_screenings')
          .update(patch)
          .eq('id', id)
          .eq('business_id', businessId)
          .select('*')
          .single()
        if (!retry.error) {
          return NextResponse.json({
            screening: retry.data,
            considerations_warning: 'Eligibility consideration not saved - apply migration cv_screenings_considerations.sql on Supabase.',
          })
        }
        return NextResponse.json({ error: retry.error.message }, { status: 500 })
      }
      // If the override columns don't exist yet (migration not applied),
      // return a clear message instead of a generic 500.
      if (error.message?.includes('override_band') || error.message?.includes('override_next_action')) {
        return NextResponse.json({
          error: 'Override columns not yet created. Apply migration cv_screenings_manual_override.sql on Supabase.',
        }, { status: 500 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ screening: data })
  } catch (err) {
    console.error('[screenings/PATCH]', err)
    const detail = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: 'Update failed', detail }, { status: 500 })
  }
}

// Hard-delete a CV screening row. Used by the "Delete candidate"
// affordance in CandidateScorecardPanel. Ownership is verified via
// business_id match before the delete fires.
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('businesses(id)')
      .eq('id', user.id)
      .single()
    const businessId = (profile?.businesses as unknown as { id: string } | null)?.id ?? null
    if (!businessId) return NextResponse.json({ error: 'No business profile' }, { status: 400 })

    // Verify ownership before delete; otherwise a 404 leaks existence.
    const { data: existing, error: findErr } = await supabaseAdmin
      .from('cv_screenings')
      .select('id, business_id')
      .eq('id', id)
      .maybeSingle()
    if (findErr) return NextResponse.json({ error: findErr.message }, { status: 500 })
    if (!existing) return NextResponse.json({ error: 'Screening not found' }, { status: 404 })
    if (existing.business_id !== businessId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { error } = await supabaseAdmin
      .from('cv_screenings')
      .delete()
      .eq('id', id)
      .eq('business_id', businessId)
    if (error) {
      console.error('[screenings/DELETE]', error.message)
      return NextResponse.json({ error: 'Delete failed', detail: error.message }, { status: 500 })
    }
    return NextResponse.json({ ok: true, id })
  } catch (err) {
    console.error('[screenings/DELETE]', err)
    const detail = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: 'Delete failed', detail }, { status: 500 })
  }
}
