// PATCH a single CV screening. Currently used for manual reviewer overrides
// of band, next_action, and an attached free-text comment. The AI's
// original values stay on the row (band, next_action) so drift can be
// measured; the override_* columns hold the human-curated values.

import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

interface Body {
  override_band?: string | null
  override_next_action?: string | null
  override_comment?: string | null
}

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

    // If nothing actually changed besides the audit columns, refuse.
    if (!('override_band' in body) && !('override_next_action' in body) && !('override_comment' in body)) {
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
