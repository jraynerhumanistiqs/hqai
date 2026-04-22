// POST /api/prescreen/responses/bulk/stage
// Bulk-update kanban stage across many responses in one request.
// Body: { ids: string[], stage: 'new'|'in_review'|'shortlisted'|'rejected' }
// Applies the same outcome-email automation per response as the single PATCH.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { processOutcomeForResponse } from '@/lib/outcome-service'

export const runtime = 'nodejs'

const VALID_STAGES = ['new', 'in_review', 'shortlisted', 'rejected'] as const
type Stage = typeof VALID_STAGES[number]

async function loadOwnershipMap(userId: string, ids: string[]): Promise<Record<string, boolean>> {
  const map: Record<string, boolean> = {}
  if (!ids.length) return map
  const { data: profile } = await supabaseAdmin
    .from('profiles').select('business_id').eq('id', userId).single()
  const businessId = profile?.business_id
  if (!businessId) { ids.forEach(id => { map[id] = false }); return map }

  const { data: responses } = await supabaseAdmin
    .from('prescreen_responses')
    .select('id, session_id')
    .in('id', ids)
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
  const bizBySession: Record<string, string | null> = {}
  for (const s of sessions ?? []) bizBySession[s.id] = bizByCreator[s.created_by] ?? null
  for (const r of responses ?? []) {
    map[r.id] = bizBySession[r.session_id] === businessId
  }
  for (const id of ids) if (!(id in map)) map[id] = false
  return map
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  try {
    const body = await req.json()
    const ids: string[] = Array.isArray(body.ids) ? body.ids.filter((x: unknown) => typeof x === 'string') : []
    const stage = body.stage as Stage
    if (!ids.length) return NextResponse.json({ error: 'No ids supplied' }, { status: 400 })
    if (!VALID_STAGES.includes(stage)) return NextResponse.json({ error: 'Invalid stage' }, { status: 400 })

    const ownership = await loadOwnershipMap(user.id, ids)
    const allowed = ids.filter(id => ownership[id])
    if (!allowed.length) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { error } = await supabaseAdmin
      .from('prescreen_responses')
      .update({ stage })
      .in('id', allowed)
    if (error) throw error

    let emailsSent = 0
    let emailsPending = 0
    if (stage === 'shortlisted' || stage === 'rejected') {
      const results = await Promise.all(allowed.map(id =>
        processOutcomeForResponse({
          responseId: id,
          outcome: stage,
          triggeredBy: user.id,
          staffEmail: user.email ?? null,
        }).catch(e => { console.error('[bulk stage] outcome err', e); return null })
      ))
      for (const r of results) {
        if (!r) continue
        if (r.emailSent) emailsSent++
        else if (r.pendingOnly) emailsPending++
      }
    }

    return NextResponse.json({
      updated: allowed.length,
      skipped: ids.length - allowed.length,
      emailsSent,
      emailsPending,
    })
  } catch (err) {
    console.error('[POST /bulk/stage]', err)
    return NextResponse.json({ error: 'Failed to bulk update stage' }, { status: 500 })
  }
}
