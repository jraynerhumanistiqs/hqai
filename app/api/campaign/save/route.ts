// POST /api/campaign/save - record a Campaign Coach campaign without creating
// a prescreen session. The real Step 5 flow hands the approved ad off to the
// CV Scoring Agent (which creates the prescreen session later, via
// batch-handoff), so /api/campaign/launch - which creates a session AND a
// campaign together - is never hit. That left the `campaigns` table empty, so
// "Recent Campaigns" on Step 1 never populated. This endpoint persists just
// the campaign artifacts (role_profile / job_ad_draft / distribution_plan) at
// handoff time so the recruiter can reuse a recent brief. prescreen_session_id
// stays null - it's nullable, and the reuse feature only needs role_profile.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import type { RoleProfile, JobAdDraft, DistributionPlan, CoachScore } from '@/lib/campaign-types'

export const runtime = 'nodejs'

type SaveBody = {
  role_profile?: RoleProfile
  job_ad_draft?: JobAdDraft
  distribution_plan?: DistributionPlan
  coach_score?: CoachScore | null
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  try {
    const body = (await req.json()) as SaveBody
    // role_profile + job_ad_draft are the campaign's substance. Without a
    // title there's nothing meaningful to reuse, so skip silently rather
    // than persist an empty shell.
    if (!body?.role_profile?.title || !body?.job_ad_draft) {
      return NextResponse.json({ ok: false, skipped: 'role_profile.title and job_ad_draft required' })
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id, business_id, businesses(id)')
      .eq('id', user.id)
      .single()
    const businessId =
      (profile as { business_id?: string } | null)?.business_id ??
      ((profile as { businesses?: { id?: string } } | null)?.businesses?.id ?? null)
    if (!businessId) {
      return NextResponse.json({ ok: false, skipped: 'no business' })
    }

    const { data: campaign, error } = await supabaseAdmin
      .from('campaigns')
      .insert({
        business_id: businessId,
        created_by: user.id,
        // Session is created later by the CV Scoring Agent handoff; the
        // column is nullable and the reuse feature doesn't need it.
        prescreen_session_id: null,
        role_profile: body.role_profile,
        job_ad_draft: body.job_ad_draft,
        // distribution_plan is NOT NULL on the table; default to an empty
        // plan if the recruiter skipped Step 4.
        distribution_plan: body.distribution_plan ?? { boards: [], total_estimated_cost_aud: 0 },
        coach_score: body.coach_score ?? null,
        status: 'launched',
        launched_at: new Date().toISOString(),
      })
      .select('id')
      .single()

    if (error) {
      // Non-fatal: the handoff to the CV Scoring Agent must still proceed
      // even if the campaigns table is missing on this env. Recent
      // Campaigns just won't show this one until the migration is applied.
      console.error('[campaign/save] insert failed:', error.message)
      return NextResponse.json({ ok: false, error: error.message })
    }

    return NextResponse.json({ ok: true, campaign_id: campaign.id })
  } catch (err) {
    console.error('[campaign/save] error:', err)
    return NextResponse.json({ ok: false, error: 'Failed to save campaign' })
  }
}
