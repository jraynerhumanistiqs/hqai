import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { readSeedTips } from '@/lib/campaign-tips-server'

export const runtime = 'nodejs'

// POST /api/campaign/tips/ingest
// Idempotent: mirrors the canonical seed JSON into the recruitment_tips table
// (upsert on id). Run on first deploy and whenever recruitment-tips.json
// changes. Requires an authenticated user.
export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const all = await readSeedTips()
  const now = new Date().toISOString()
  const rows = all.map(t => ({
    id: t.id,
    category: t.category ?? null,
    campaign_stage: t.campaign_stage,
    tip: t.tip,
    why_it_works: t.why_it_works ?? null,
    region: t.region ?? null,
    confidence: t.confidence ?? null,
    evidence: t.evidence ?? null,
    source: t.source ?? null,
    source_url: t.source_url ?? null,
    source_date: t.source_date ?? null,
    updated_at: now,
  }))

  const { error } = await getSupabaseAdmin()
    .from('recruitment_tips')
    .upsert(rows, { onConflict: 'id' })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ingested: rows.length })
}
