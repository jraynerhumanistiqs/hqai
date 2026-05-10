// POST /api/prescreen/responses/[id]/share - create a share link
// GET  /api/prescreen/responses/[id]/share - list active share links for this response

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { randomBytes } from 'crypto'

export const runtime = 'nodejs'

async function ensureOwnership(userId: string, responseId: string) {
  const { data: profile } = await supabaseAdmin
    .from('profiles').select('business_id').eq('id', userId).single()
  const businessId = profile?.business_id
  if (!businessId) return false
  const { data: response } = await supabaseAdmin
    .from('prescreen_responses').select('session_id').eq('id', responseId).single()
  if (!response) return false
  const { data: session } = await supabaseAdmin
    .from('prescreen_sessions').select('created_by').eq('id', response.session_id).single()
  if (!session) return false
  const { data: creator } = await supabaseAdmin
    .from('profiles').select('business_id').eq('id', session.created_by).single()
  return creator?.business_id === businessId
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  if (!(await ensureOwnership(user.id, id))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: { label?: string; expiresInDays?: number } = {}
  try { body = await req.json() } catch { /* empty body ok */ }

  const days = Math.max(1, Math.min(90, body.expiresInDays ?? 14))
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()
  const token = randomBytes(18).toString('base64url')

  const { data, error } = await supabaseAdmin
    .from('prescreen_share_links')
    .insert({
      response_id: id,
      token,
      created_by: user.id,
      expires_at: expiresAt,
      label: body.label?.toString().trim() || null,
    })
    .select()
    .single()
  if (error || !data) return NextResponse.json({ error: error?.message ?? 'Insert failed' }, { status: 500 })

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://www.humanistiqs.ai'
  return NextResponse.json({ link: data, url: `${baseUrl}/review/${token}` })
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  if (!(await ensureOwnership(user.id, id))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: links } = await supabaseAdmin
    .from('prescreen_share_links')
    .select('id, response_id, token, created_by, created_at, expires_at, revoked_at, label')
    .eq('response_id', id)
    .order('created_at', { ascending: false })

  const linkIds = (links ?? []).map(l => l.id)
  const { data: views } = linkIds.length
    ? await supabaseAdmin.from('prescreen_share_views').select('link_id').in('link_id', linkIds)
    : { data: [] as any[] }
  const counts: Record<string, number> = {}
  for (const v of views ?? []) counts[v.link_id] = (counts[v.link_id] ?? 0) + 1

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://www.humanistiqs.ai'
  const hydrated = (links ?? []).map(l => ({
    ...l,
    view_count: counts[l.id] ?? 0,
    url: `${baseUrl}/review/${l.token}`,
  }))

  return NextResponse.json({ links: hydrated })
}
