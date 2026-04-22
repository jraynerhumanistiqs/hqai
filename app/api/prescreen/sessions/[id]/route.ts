// GET    /api/prescreen/sessions/[id] - load session by ID (public, for candidate page)
// PATCH  /api/prescreen/sessions/[id] - staff-only edit of company/role/questions/time/rubric/outcome-config
// DELETE /api/prescreen/sessions/[id] - staff-only soft-delete (sets deleted_at)

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

const SLUG_REGEX = /^[a-z0-9-]{3,60}$/
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const CALENDLY_URL_REGEX = /^https:\/\/(www\.)?calendly\.com\//

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const isUuid = UUID_REGEX.test(id)
    const query = supabaseAdmin
      .from('prescreen_sessions')
      .select('id, company, role_title, questions, time_limit_seconds, status, slug')
      .eq('status', 'active')
      .is('deleted_at', null)

    const { data, error } = await (isUuid ? query.eq('id', id) : query.eq('slug', id)).single()

    if (error || !data) {
      return NextResponse.json({ error: 'Session not found or no longer active' }, { status: 404 })
    }

    return NextResponse.json({ session: data })
  } catch (err) {
    console.error('[GET /api/prescreen/sessions/:id]', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { id } = await params
  try {
    const body = await req.json()
    const patch: Record<string, unknown> = {}
    if (typeof body.company === 'string') patch.company = body.company
    if (typeof body.role_title === 'string') patch.role_title = body.role_title
    if (Array.isArray(body.questions)) patch.questions = body.questions.filter((q: unknown) => typeof q === 'string')
    if (typeof body.time_limit_seconds === 'number') {
      patch.time_limit_seconds = Math.max(10, Math.min(600, Math.floor(body.time_limit_seconds)))
    }
    if (typeof body.slug === 'string') {
      const slug = body.slug.trim().toLowerCase()
      if (slug === '') {
        patch.slug = null
      } else if (!SLUG_REGEX.test(slug)) {
        return NextResponse.json({ error: 'Slug must be 3-60 characters: lowercase letters, numbers and hyphens only' }, { status: 400 })
      } else {
        patch.slug = slug
      }
    }

    // Rubric mode + custom rubric
    if (body.rubric_mode === 'standard' || body.rubric_mode === 'custom') {
      patch.rubric_mode = body.rubric_mode
    }
    if (body.rubric_mode === 'custom' || Array.isArray(body.custom_rubric)) {
      const arr = Array.isArray(body.custom_rubric) ? body.custom_rubric : []
      const cleaned = arr
        .map((r: any) => ({
          name: String(r?.name ?? '').trim(),
          description: String(r?.description ?? '').trim(),
        }))
        .filter((r: { name: string; description: string }) => r.name && r.description)
      if (patch.rubric_mode === 'custom' && (cleaned.length < 3 || cleaned.length > 6)) {
        return NextResponse.json(
          { error: 'Custom rubric must have 3-6 dimensions, each with name and description' },
          { status: 400 },
        )
      }
      patch.custom_rubric = cleaned.length ? cleaned : null
    }
    if (body.rubric_mode === 'standard') {
      patch.custom_rubric = null
    }

    // Phase 4: outcome-email config + calendly override
    if (typeof body.auto_send_outcomes === 'boolean') {
      patch.auto_send_outcomes = body.auto_send_outcomes
    }
    if (typeof body.outcome_email_shortlisted === 'string' || body.outcome_email_shortlisted === null) {
      patch.outcome_email_shortlisted = body.outcome_email_shortlisted || null
    }
    if (typeof body.outcome_email_rejected === 'string' || body.outcome_email_rejected === null) {
      patch.outcome_email_rejected = body.outcome_email_rejected || null
    }
    if (typeof body.calendly_url_override === 'string' || body.calendly_url_override === null) {
      const raw = typeof body.calendly_url_override === 'string' ? body.calendly_url_override.trim() : ''
      if (!raw) patch.calendly_url_override = null
      else if (!CALENDLY_URL_REGEX.test(raw)) {
        return NextResponse.json({ error: 'Calendly URL must start with https://calendly.com/' }, { status: 400 })
      } else patch.calendly_url_override = raw
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('prescreen_sessions')
      .update(patch)
      .eq('id', id)
      .select()
      .single()

    if (error || !data) {
      if ((error as any)?.code === '23505') {
        return NextResponse.json({ error: 'Slug already in use' }, { status: 409 })
      }
      console.error('[PATCH /api/prescreen/sessions/:id]', error)
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    return NextResponse.json({ session: data })
  } catch (err) {
    console.error('[PATCH /api/prescreen/sessions/:id]', err)
    return NextResponse.json({ error: 'Failed to update session' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { id } = await params
  try {
    const { error } = await supabaseAdmin
      .from('prescreen_sessions')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)

    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[DELETE /api/prescreen/sessions/:id]', err)
    return NextResponse.json({ error: 'Failed to delete session' }, { status: 500 })
  }
}
