// POST /api/prescreen/sessions/[id]/restore - un-soft-delete a session
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { resolveBusinessScope } from '@/lib/supabase/scope'

export const runtime = 'nodejs'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { id } = await params
  try {
    // Multi-tenant gate: restoring a soft-deleted session requires the
    // caller share business_id with the original creator. The row is
    // soft-deleted so default assertSessionInScope (which filters out
    // deleted) won't see it - check membership directly.
    const scope = await resolveBusinessScope(user.id)
    if (scope.memberIds.length === 0) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const { data: owned } = await supabaseAdmin
      .from('prescreen_sessions')
      .select('id')
      .eq('id', id)
      .in('created_by', scope.memberIds)
      .maybeSingle()
    if (!owned) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data, error } = await supabaseAdmin
      .from('prescreen_sessions')
      .update({ deleted_at: null })
      .eq('id', id)
      .select()
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    return NextResponse.json({ session: data })
  } catch (err) {
    console.error('[POST /api/prescreen/sessions/:id/restore]', err)
    return NextResponse.json({ error: 'Failed to restore session' }, { status: 500 })
  }
}
