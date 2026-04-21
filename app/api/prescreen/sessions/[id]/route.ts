// GET /api/prescreen/sessions/[id] — load session by ID (public, for candidate page)

import { NextRequest, NextResponse } from 'next/server'
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
