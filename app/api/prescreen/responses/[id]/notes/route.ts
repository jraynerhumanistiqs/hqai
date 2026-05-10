// GET  /api/prescreen/responses/[id]/notes  - list notes for a response (auth)
// POST /api/prescreen/responses/[id]/notes  - create note, fire @mention emails

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { sendMentionNotification } from '@/lib/email'

export const runtime = 'nodejs'

async function ensureOwnership(userId: string, responseId: string) {
  const { data: profile } = await supabaseAdmin
    .from('profiles').select('business_id').eq('id', userId).single()
  const businessId = profile?.business_id
  if (!businessId) return { ok: false, businessId: null as string | null, response: null as any, session: null as any }

  const { data: response } = await supabaseAdmin
    .from('prescreen_responses').select('id, session_id, candidate_name').eq('id', responseId).single()
  if (!response) return { ok: false, businessId, response: null, session: null }

  const { data: session } = await supabaseAdmin
    .from('prescreen_sessions')
    .select('id, role_title, company, created_by')
    .eq('id', response.session_id).single()
  if (!session) return { ok: false, businessId, response, session: null }

  const { data: creator } = await supabaseAdmin
    .from('profiles').select('business_id').eq('id', session.created_by).single()
  if (creator?.business_id !== businessId) return { ok: false, businessId, response, session }
  return { ok: true, businessId, response, session }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const own = await ensureOwnership(user.id, id)
  if (!own.ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data: notes, error } = await supabaseAdmin
    .from('prescreen_notes')
    .select('id, response_id, author_id, body, mentions, created_at, edited_at')
    .eq('response_id', id)
    .order('created_at', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const authorIds = Array.from(new Set((notes ?? []).map(n => n.author_id)))
  const { data: authors } = authorIds.length
    ? await supabaseAdmin.from('profiles').select('id, full_name, email').in('id', authorIds)
    : { data: [] as any[] }
  const authorMap = Object.fromEntries((authors ?? []).map(a => [a.id, a]))

  const hydrated = (notes ?? []).map(n => ({
    ...n,
    mentions: Array.isArray(n.mentions) ? n.mentions : [],
    author_name: authorMap[n.author_id]?.full_name ?? null,
    author_email: authorMap[n.author_id]?.email ?? null,
  }))

  return NextResponse.json({ notes: hydrated })
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const own = await ensureOwnership(user.id, id)
  if (!own.ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let body: { body?: string; mentions?: string[] }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Bad JSON' }, { status: 400 }) }
  const text = (body.body ?? '').toString().trim()
  if (!text) return NextResponse.json({ error: 'Empty note' }, { status: 400 })
  const mentions = Array.isArray(body.mentions) ? body.mentions.filter(m => typeof m === 'string') : []

  const { data: note, error } = await supabaseAdmin
    .from('prescreen_notes')
    .insert({ response_id: id, author_id: user.id, body: text, mentions })
    .select()
    .single()
  if (error || !note) return NextResponse.json({ error: error?.message ?? 'Insert failed' }, { status: 500 })

  if (mentions.length > 0) {
    void (async () => {
      try {
        const { data: mentioner } = await supabaseAdmin
          .from('profiles').select('full_name, email').eq('id', user.id).single()
        const { data: targets } = await supabaseAdmin
          .from('profiles').select('id, full_name, email').in('id', mentions)
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://www.humanistiqs.ai'
        const deepLink = `${baseUrl}/dashboard/recruit?role=${own.session.id}&candidate=${id}`
        const excerpt = text.length > 140 ? text.slice(0, 140) + '...' : text
        for (const t of targets ?? []) {
          if (!t.email || t.id === user.id) continue
          await sendMentionNotification({
            to: t.email,
            mentionerName: mentioner?.full_name ?? 'A teammate',
            candidateName: own.response.candidate_name,
            roleTitle: own.session.role_title,
            company: own.session.company,
            deepLink,
            bodyExcerpt: excerpt,
          })
        }
      } catch (err) {
        console.error('[notes POST] mention mail error:', err)
      }
    })()
  }

  return NextResponse.json({ note })
}
