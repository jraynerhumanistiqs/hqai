// POST /api/prescreen/responses/bulk/share
// Creates a share link per response in one request.
// Body: { ids: string[], expiresInDays?: number, labelPrefix?: string, emailTo?: string }
// If emailTo is set, emails the list of links to that recipient via Resend.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { randomBytes } from 'crypto'
import { Resend } from 'resend'

export const runtime = 'nodejs'

async function filterOwned(userId: string, ids: string[]): Promise<string[]> {
  if (!ids.length) return []
  const { data: profile } = await supabaseAdmin
    .from('profiles').select('business_id').eq('id', userId).single()
  const businessId = profile?.business_id
  if (!businessId) return []

  const { data: responses } = await supabaseAdmin
    .from('prescreen_responses').select('id, session_id').in('id', ids)
  const sessionIds = Array.from(new Set((responses ?? []).map(r => r.session_id)))
  const { data: sessions } = sessionIds.length
    ? await supabaseAdmin.from('prescreen_sessions').select('id, created_by').in('id', sessionIds)
    : { data: [] as Array<{ id: string; created_by: string }> }
  const creatorIds = Array.from(new Set((sessions ?? []).map(s => s.created_by)))
  const { data: creators } = creatorIds.length
    ? await supabaseAdmin.from('profiles').select('id, business_id').in('id', creatorIds)
    : { data: [] as Array<{ id: string; business_id: string | null }> }

  const bizByCreator: Record<string, string | null> = {}
  for (const c of creators ?? []) bizByCreator[c.id] = c.business_id ?? null
  const ok: Record<string, boolean> = {}
  for (const s of sessions ?? []) ok[s.id] = bizByCreator[s.created_by] === businessId

  return (responses ?? []).filter(r => ok[r.session_id]).map(r => r.id)
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  try {
    const body = await req.json()
    const ids: string[] = Array.isArray(body.ids) ? body.ids.filter((x: unknown) => typeof x === 'string') : []
    if (!ids.length) return NextResponse.json({ error: 'No ids supplied' }, { status: 400 })

    const days = Math.max(1, Math.min(90, Number(body.expiresInDays ?? 14)))
    const prefix: string = (typeof body.labelPrefix === 'string' ? body.labelPrefix : '').trim()
    const emailTo: string | null = typeof body.emailTo === 'string' && body.emailTo.trim() ? body.emailTo.trim() : null

    const allowed = await filterOwned(user.id, ids)
    if (!allowed.length) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://hqai.vercel.app'

    const rows = allowed.map((id, i) => ({
      response_id: id,
      token: randomBytes(18).toString('base64url'),
      created_by: user.id,
      expires_at: expiresAt,
      label: prefix ? `${prefix} ${i + 1}` : null,
    }))

    const { data: inserted, error } = await supabaseAdmin
      .from('prescreen_share_links')
      .insert(rows)
      .select('id, response_id, token, label, expires_at')
    if (error) throw error

    const links = (inserted ?? []).map(l => ({
      id: l.id,
      response_id: l.response_id,
      label: l.label,
      expires_at: l.expires_at,
      url: `${baseUrl}/review/${l.token}`,
    }))

    let emailed = false
    if (emailTo && process.env.RESEND_API_KEY && links.length) {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY)
        const list = links.map((l, i) =>
          `<li style="margin-bottom:6px;"><a href="${l.url}" style="color:#000000; text-decoration:underline;">${l.label ?? 'Candidate ' + (i + 1)}</a></li>`
        ).join('')
        await resend.emails.send({
          from: 'HQ.ai <noreply@hq.humanistiqs.ai>',
          to: emailTo,
          subject: `Candidate review links (${links.length})`,
          html: `
            <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; color: #0A0A0A;">
              <h2 style="font-size: 18px; font-weight: 700;">Candidate review links</h2>
              <p style="color: #4b4b4b;">${links.length} candidate review link${links.length === 1 ? '' : 's'}:</p>
              <ol style="color: #0A0A0A; font-size: 14px;">${list}</ol>
              <p style="color: #afafaf; font-size: 12px; border-top: 1px solid #E4E4E2; padding-top: 16px; margin-top: 24px;">Humanistiqs - humanistiqs.com.au</p>
            </div>
          `,
        })
        emailed = true
      } catch (e) {
        console.error('[bulk/share] email failed', e)
      }
    }

    return NextResponse.json({ links, emailed })
  } catch (err) {
    console.error('[POST /bulk/share]', err)
    return NextResponse.json({ error: 'Failed to bulk create share links' }, { status: 500 })
  }
}
