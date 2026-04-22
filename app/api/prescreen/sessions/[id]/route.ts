// GET    /api/prescreen/sessions/[id] - load session by ID (public, for candidate page)
// PATCH  /api/prescreen/sessions/[id] - staff-only edit of company/role/questions/time
// DELETE /api/prescreen/sessions/[id] - staff-only soft-delete (sets deleted_at)

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const { data, error } = await supabaseAdmin
      .from('prescreen_sessions')
      .select('id, company, role_title, questions, time_limit_seconds, status')
      .eq('id', id)
      .eq('status', 'active')
      .is('deleted_at', null)
      .single()

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
