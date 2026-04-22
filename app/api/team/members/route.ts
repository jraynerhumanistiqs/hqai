// GET /api/team/members - list team members sharing the caller's business_id.
// Used by the @mention autocomplete in NotesPanel.

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data: profile } = await supabaseAdmin
    .from('profiles').select('business_id').eq('id', user.id).single()
  const businessId = profile?.business_id
  if (!businessId) return NextResponse.json({ members: [] })

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, email')
    .eq('business_id', businessId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const members = (data ?? []).map(p => ({
    id: p.id,
    name: p.full_name ?? (p.email ?? '').split('@')[0] ?? 'Teammate',
    email: p.email ?? '',
  }))
  return NextResponse.json({ members })
}
