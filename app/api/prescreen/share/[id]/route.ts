// DELETE /api/prescreen/share/[id] - revoke a share link (sets revoked_at)

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data: link } = await supabaseAdmin
    .from('prescreen_share_links').select('response_id, created_by').eq('id', id).single()
  if (!link) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Ownership: either creator, or same business_id as response session
  const { data: profile } = await supabaseAdmin
    .from('profiles').select('business_id').eq('id', user.id).single()
  const businessId = profile?.business_id
  const { data: resp } = await supabaseAdmin
    .from('prescreen_responses').select('session_id').eq('id', link.response_id).single()
  const { data: session } = resp
    ? await supabaseAdmin.from('prescreen_sessions').select('created_by').eq('id', resp.session_id).single()
    : { data: null as any }
  const { data: creator } = session
    ? await supabaseAdmin.from('profiles').select('business_id').eq('id', session.created_by).single()
    : { data: null as any }

  const allowed = link.created_by === user.id || creator?.business_id === businessId
  if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { error } = await supabaseAdmin
    .from('prescreen_share_links').update({ revoked_at: new Date().toISOString() }).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
