// DELETE /api/prescreen/sessions/[id]/purge - permanently delete a session row
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { resolveBusinessScope } from '@/lib/supabase/scope'

export const runtime = 'nodejs'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { id } = await params
  try {
    // Multi-tenant gate: hard-delete only if the soft-deleted session
    // belongs to the caller's business. Confirm by loading the row
    // (including soft-deleted) and checking created_by membership.
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

    const { error } = await supabaseAdmin
      .from('prescreen_sessions')
      .delete()
      .eq('id', id)

    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[DELETE /api/prescreen/sessions/:id/purge]', err)
    return NextResponse.json({ error: 'Failed to purge session' }, { status: 500 })
  }
}
