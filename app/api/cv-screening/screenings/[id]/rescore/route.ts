// Rescore an existing CV screening against a newer rubric version.
// Triggered from the UI after the user saves an edited rubric (which
// creates a new version row).
//
// Design decision (May 2026 founder direction): we INSERT a new
// cv_screenings row attached to the new rubric_id instead of
// overwriting the existing row. The source row (v1) is left
// completely untouched - its scores, rationale, override fields,
// comments and audit timestamps remain intact. The new row becomes
// the v2 score-card for the same candidate.
//
// Visible effect: a single candidate scored under v1 and then
// rescored against v2 appears in BOTH version tabs in the UI, each
// with the score that version's criteria produced. Recruiters can
// compare v1 vs v2 outcomes; v1 stays as a historical record.

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

    // INSERT a new row pegged to the target rubric. The source row
    // (id = `id`) stays untouched. We carry forward the candidate
    // identity columns (label, email, cv_text, cv_filename, fairness
    // checks, bias signals) so the v2 card has full context without
    // a re-upload. New scores + cleared overrides replace v1's.
    const insertPayload: Record<string, unknown> = {
      business_id: screening.business_id,
      user_id: screening.user_id,
      rubric_id: targetRubricId,
      candidate_label: screening.candidate_label,
      candidate_email: screening.candidate_email,
      cv_text: screening.cv_text,
      cv_filename: screening.cv_filename,
      overall_score: overall,
      band,
      next_action,
      rationale_short: result.rationale_short,
      criteria_scores: result.criteria_scores,
      fairness_checks: screening.fairness_checks,
      bias_signals: screening.bias_signals,
      status: 'scored',
      rescored_from: id,  // breadcrumb to the source row (optional column)
    }

    const tryInsert = await supabaseAdmin
      .from('cv_screenings')
      .insert(insertPayload)
      .select('*')
      .single()

    let inserted = tryInsert.data
    if (tryInsert.error) {
      // If the optional `rescored_from` column isn't migrated yet,
      // retry without it so the pilot stays unblocked. Same belt-and-
      // braces pattern the previous version used for `rescored_at`.
      if (tryInsert.error.message?.toLowerCase().includes('rescored_from')) {
        delete insertPayload.rescored_from
        const retry = await supabaseAdmin
          .from('cv_screenings')
          .insert(insertPayload)
          .select('*')
          .single()
        if (retry.error) {
          console.error('[cv-screening/rescore] insert retry failed:', retry.error.message)
          return NextResponse.json({ error: retry.error.message }, { status: 500 })
        }
        inserted = retry.data
      } else {
        console.error('[cv-screening/rescore] insert failed:', tryInsert.error.message)
        return NextResponse.json({ error: tryInsert.error.message }, { status: 500 })
      }
    }

    return NextResponse.json({
      source_screening_id: id,
      screening: inserted,
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
