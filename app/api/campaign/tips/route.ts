import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import {
  buildTipQueue,
  categoriesForStage,
  TIP_STAGES,
  type RecruitmentTip,
  type TipStage,
} from '@/lib/campaign-tips'
import { readSeedTips } from '@/lib/campaign-tips-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET /api/campaign/tips?stage=<stage>&region=<au|global>&category=<optional>
// Returns { tips: RecruitmentTip[] (ordered queue), categories: string[] }.
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const sp = req.nextUrl.searchParams
  const stage = sp.get('stage') as TipStage | null
  if (!stage || !TIP_STAGES.includes(stage)) {
    return NextResponse.json({ error: 'Invalid or missing stage' }, { status: 400 })
  }
  const category = sp.get('category') || undefined

  // Prefer Supabase; fall back to the bundled seed JSON when the table is
  // empty or unavailable (e.g. ingestion has not run on this environment yet).
  let rows: RecruitmentTip[] | null = null
  try {
    const { data, error } = await getSupabaseAdmin()
      .from('recruitment_tips')
      .select('*')
      .eq('campaign_stage', stage)
    if (!error && data && data.length > 0) rows = data as RecruitmentTip[]
  } catch {
    /* fall through to the JSON seed */
  }
  if (!rows) {
    const all = await readSeedTips()
    rows = all.filter(t => t.campaign_stage === stage)
  }

  const tips = buildTipQueue(rows, { stage, category })
  const categories = categoriesForStage(rows, stage)
  return NextResponse.json({ tips, categories })
}
