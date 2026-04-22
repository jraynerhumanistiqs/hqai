// POST /api/prescreen/sessions/[id]/restore — un-soft-delete a session
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

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
