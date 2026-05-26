// Rescore an existing CV screening against a newer rubric version.
// Triggered from the UI after the user saves an edited rubric (which
// creates a new version row); for each screening already attached to
// the rubric family we POST here to overwrite the scores in place.
//
// Design decision (pilot scope): we OVERWRITE the existing row rather
// than copy it to a new row keyed on the new rubric_id. This matches
// the founder's mental model ("I edited the criteria, now my scores
// should reflect the new criteria") at the cost of losing the v1
// scores for audit. A per-business audit-trail toggle was discussed
// and parked - revisit if the audit gap becomes a real customer ask.

import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { getRubric as getStandardRubric } from '@/lib/cv-screening-rubrics'
import {
  bandFromScore,
  defaultActionForBand,
  type Rubric,
} from '@/lib/cv-screening-types'
import {
  scoreCv,
  computeOverall,
  blindPII,
  blindNameInText,
} from '@/lib/cv-screening/score'
import { resolveBusinessScope } from '@/lib/supabase/scope'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 120

interface Body {
  /** Defaults to the latest version in the screening's rubric family.
   *  Pass an explicit rubric_id to re-score against a specific version
   *  (e.g. the user picked a non-latest version to rescore against). */
  rubric_id?: string
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    // Wave 1 scoping: confirm the caller has a business + that the
    // target screening belongs to that business. We use the scope
    // helper for the business id, then a direct business_id check on
    // the screening row (CV screenings are scoped by business_id, not
    // by the prescreen-session derived path the scope helper covers).
    const scope = await resolveBusinessScope(user.id)
    if (!scope.businessId) {
      return NextResponse.json({ error: 'No business profile' }, { status: 400 })
    }

    const body = (await req.json().catch(() => ({}))) as Body

    const { data: screening, error: sErr } = await supabaseAdmin
      .from('cv_screenings')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    if (sErr) return NextResponse.json({ error: sErr.message }, { status: 500 })
    if (!screening) return NextResponse.json({ error: 'Screening not found' }, { status: 404 })
    if (screening.business_id !== scope.businessId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (!screening.cv_text || screening.cv_text.length < 50) {
      return NextResponse.json({
        error: 'No CV text on file - cannot rescore. Re-upload the CV instead.',
      }, { status: 422 })
    }

    // Resolve the target rubric. If the caller passed an explicit
    // rubric_id we use that (still must belong to their business);
    // otherwise we pick the newest version in the same family as the
    // screening's current rubric.
    const targetRubricId = body.rubric_id ?? await pickLatestInFamily(screening.rubric_id, scope.businessId)
    if (!targetRubricId) {
      return NextResponse.json({ error: 'Could not resolve a rubric to rescore against' }, { status: 400 })
    }
    const rubric = await resolveRubric(targetRubricId, scope.businessId)
    if (!rubric) {
      return NextResponse.json({ error: `Rubric ${targetRubricId} not found in this business` }, { status: 404 })
    }

    // Re-run the scoring pipeline with the same masking the upload
    // path uses. cv_text on the screening row is the post-extraction
    // raw text (still contains the candidate's name + PII), so we
    // re-apply blindPII + blindNameInText against the persisted name.
    const blinded = blindNameInText(blindPII(screening.cv_text), screening.candidate_label ?? null)
    const result = await scoreCv(blinded, rubric.role, rubric.criteria)
    const overall = computeOverall(result.criteria_scores, rubric.criteria)
    const band = bandFromScore(overall)
    const next_action = defaultActionForBand(band)

    const { data: updated, error: uErr } = await supabaseAdmin
      .from('cv_screenings')
      .update({
        rubric_id: targetRubricId,
        overall_score: overall,
        band,
        next_action,
        rationale_short: result.rationale_short,
        criteria_scores: result.criteria_scores,
        // Clear any human override so the new AI call is the visible
        // result. The recruiter can re-apply an override against the
        // new score from the UI.
        override_band: null,
        override_next_action: null,
        override_comment: null,
        override_at: null,
        override_by: null,
        // Audit stamp so we can tell which rows were rescored vs
        // originally-scored at the listed rubric version. Column is
        // optional - if the migration isn't applied we strip it and
        // retry to keep the pilot unblocked.
        rescored_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('business_id', scope.businessId)
      .select('id, band, overall_score')
      .single()

    if (uErr) {
      // Retry without rescored_at if the column isn't there yet.
      if (uErr.message?.toLowerCase().includes('rescored_at')) {
        const { data: retry, error: rErr } = await supabaseAdmin
          .from('cv_screenings')
          .update({
            rubric_id: targetRubricId,
            overall_score: overall,
            band,
            next_action,
            rationale_short: result.rationale_short,
            criteria_scores: result.criteria_scores,
            override_band: null,
            override_next_action: null,
            override_comment: null,
            override_at: null,
            override_by: null,
          })
          .eq('id', id)
          .eq('business_id', scope.businessId)
          .select('id, band, overall_score')
          .single()
        if (rErr) return NextResponse.json({ error: rErr.message }, { status: 500 })
        return NextResponse.json({
          screening_id: retry.id,
          new_band: retry.band,
          new_overall_score: retry.overall_score,
        })
      }
      return NextResponse.json({ error: uErr.message }, { status: 500 })
    }

    return NextResponse.json({
      screening_id: updated.id,
      new_band: updated.band,
      new_overall_score: updated.overall_score,
    })
  } catch (err) {
    console.error('[cv-screening/rescore]', err)
    const detail = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: 'Rescore failed', detail }, { status: 500 })
  }
}

async function resolveRubric(rubricId: string, businessId: string): Promise<Rubric | null> {
  const standard = getStandardRubric(rubricId)
  if (standard) return standard
  const { data } = await supabaseAdmin
    .from('cv_custom_rubrics')
    .select('rubric, business_id')
    .eq('id', rubricId)
    .maybeSingle()
  if (!data) return null
  if (data.business_id && data.business_id !== businessId) return null
  return (data.rubric as Rubric | undefined) ?? null
}

// Given the screening's current rubric_id, find the highest version
// in the same family (parent_rubric_id) so the rescore lands on the
// latest version by default. Returns null if the rubric isn't a
// custom one (standard rubrics don't version).
async function pickLatestInFamily(currentRubricId: string, businessId: string): Promise<string | null> {
  const { data: current } = await supabaseAdmin
    .from('cv_custom_rubrics')
    .select('id, parent_rubric_id, business_id')
    .eq('id', currentRubricId)
    .maybeSingle()
  if (!current || current.business_id !== businessId) return null
  const familyId = current.parent_rubric_id ?? current.id
  const { data: latest } = await supabaseAdmin
    .from('cv_custom_rubrics')
    .select('id, version_number')
    .eq('business_id', businessId)
    .eq('parent_rubric_id', familyId)
    .order('version_number', { ascending: false })
    .limit(1)
    .maybeSingle()
  return latest?.id ?? currentRubricId
}
