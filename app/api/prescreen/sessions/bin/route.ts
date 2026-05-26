// GET /api/prescreen/sessions/bin - list soft-deleted sessions within 80-day retention.
// Also cleans up rows past the 80-day window (best-effort).

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { resolveBusinessScope } from '@/lib/supabase/scope'

export const runtime = 'nodejs'

export async function GET(_req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const cutoff = new Date(Date.now() - 80 * 24 * 60 * 60 * 1000).toISOString()

  // Best-effort cleanup of expired rows
  try {
    const { error: purgeErr } = await supabaseAdmin
      .from('prescreen_sessions')
      .delete()
      .lt('deleted_at', cutoff)
      .not('deleted_at', 'is', null)
    if (purgeErr) console.error('[GET bin - purge step]', purgeErr)
  } catch (err) {
    console.error('[GET bin - purge step]', err)
  }

  try {
    // Multi-tenant scoping: only show soft-deleted sessions belonging
    // to the caller's business. Without this the bin view leaks every
    // tenant's deleted sessions to anyone authenticated.
    const scope = await resolveBusinessScope(user.id)
    if (scope.memberIds.length === 0) {
      return NextResponse.json({ sessions: [] })
    }

    const { data, error } = await supabaseAdmin
      .from('prescreen_sessions')
      .select('*')
      .in('created_by', scope.memberIds)
      .not('deleted_at', 'is', null)
      .gte('deleted_at', cutoff)
      .order('deleted_at', { ascending: false })

    if (error) throw error
    return NextResponse.json({ sessions: data ?? [] })
  } catch (err) {
    console.error('[GET /api/prescreen/sessions/bin]', err)
    return NextResponse.json({ error: 'Failed to load bin' }, { status: 500 })
  }
}
