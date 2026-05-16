// Batch handoff: take N selected CVs from CV Scoring Agent and create ONE
// Shortlist Agent role with all of them invited, carrying their CV scoring
// through as starting context. Replaces the per-candidate handoff loop when
// the user wants to ship the shortlist as a single Shortlist Agent campaign.

import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { getRubric as getStandardRubric } from '@/lib/cv-screening-rubrics'
import type { CandidateScreening, CriterionScore, Rubric } from '@/lib/cv-screening-types'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 120

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const MODEL = 'claude-sonnet-4-20250514'

interface BatchBody {
  screening_ids: string[]
  role_title?: string
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('businesses(id, name)')
      .eq('id', user.id)
      .single()
    const business = profile?.businesses as unknown as { id: string; name: string } | null
    if (!business?.id) return NextResponse.json({ error: 'No business profile' }, { status: 400 })

    const body = await req.json() as BatchBody
    if (!Array.isArray(body.screening_ids) || body.screening_ids.length === 0) {
      return NextResponse.json({ error: 'screening_ids required' }, { status: 400 })
    }

    const { data: screenings, error: sErr } = await supabase
      .from('cv_screenings')
      .select('*')
      .in('id', body.screening_ids)
      .eq('business_id', business.id)
    if (sErr) return NextResponse.json({ error: sErr.message }, { status: 500 })
    if (!screenings || screenings.length === 0) {
      return NextResponse.json({ error: 'No matching screenings' }, { status: 404 })
    }

    // All selected screenings must share the same rubric so the resulting
    // Shortlist role has a single scoring axis. If they don't, error out.
    const rubricIds = new Set((screenings as CandidateScreening[]).map(s => s.rubric_id))
    if (rubricIds.size > 1) {
      return NextResponse.json({
        error: 'Selected CVs use different rubrics. Pick CVs from one rubric at a time.',
      }, { status: 400 })
    }
    const rubricId = [...rubricIds][0]
    const rubric = await resolveRubric(rubricId)
    if (!rubric) return NextResponse.json({ error: `Rubric ${rubricId} not found` }, { status: 400 })

    // Generate a single set of probe questions for the role using the
    // population's weakest criteria (averaged across selected candidates).
    const questions = await generatePopulationQuestions(screenings as CandidateScreening[], rubric)

    const customRubric = rubric.criteria
      .filter(c => c.type === 'ordinal_5')
      .slice(0, 6)
      .map(c => ({
        name: c.label,
        description: c.anchors?.['3'] ? `${c.label} - benchmark: ${c.anchors['3']}` : c.label,
      }))

    const { data: session, error: sessionErr } = await supabaseAdmin
      .from('prescreen_sessions')
      .insert({
        company: business.name,
        role_title: body.role_title || rubric.role,
        questions,
        time_limit_seconds: 90,
        status: 'active',
        created_by: user.id,
        rubric_mode: 'custom',
        custom_rubric: customRubric,
      })
      .select()
      .single()
    if (sessionErr || !session) {
      console.error('[batch-handoff] session insert', sessionErr)
      return NextResponse.json({ error: 'Failed to create Shortlist role' }, { status: 500 })
    }

    // Persist link from CV screenings to the new Shortlist session so the
    // Candidate Summary report can later join the CV scoring back in. The
    // prescreen_session_id column is added by migration
    // cv_screenings_link_prescreen.sql - if it's not applied yet, swallow
    // the resulting "column does not exist" error so the rest of the flow
    // still works.
    try {
      await supabaseAdmin
        .from('cv_screenings')
        .update({ prescreen_session_id: session.id })
        .in('id', screenings.map(s => s.id))
    } catch (linkErr) {
      console.warn('[batch-handoff] could not persist CV<>session link:', linkErr)
    }

    // Create a prescreen_response row per CV so the candidates appear
    // immediately in the Shortlist Agent role detail with their CV scoring
    // pre-loaded. video_ids stays empty until they record. Status uses the
    // existing 'submitted' value so the rows surface under the default
    // filters; the cv_screening_id link distinguishes them from videos.
    //
    // Insert is progressively-degrading: we try the full row shape first,
    // then strip any column that the production schema is missing and
    // retry. This means the flow-through works even when some of the
    // recent migrations (cv_screening_id link, recommendation_action,
    // rubric_scores) haven't been applied to a particular env.
    let attached = 0
    let lastInsertError: string | null = null

    const buildRow = (s: CandidateScreening, includeKeys: Set<string>) => {
      const rubricScores = (s.criteria_scores as Array<{ id?: string; label?: string; score: number; evidence?: string }>)
        .filter(cs => typeof cs.score === 'number')
        .map(cs => ({
          name: cs.label ?? cs.id ?? 'Criterion',
          score: cs.score,
          confidence: 1,
          evidence_quote: cs.evidence ?? '',
          evidence_timestamp_sec: 0,
          insufficient_evidence: false,
        }))
      // candidate_email has a NOT NULL constraint on prescreen_responses
      // (since it was originally built for candidate-submitted videos
      // which always have an email). CV-imported candidates often have
      // no email captured, so we synthesise a placeholder using the
      // CV screening id - that keeps the column populated, makes the
      // origin obvious in the Shortlist UI, and stops the previous
      // silent insert failure. The placeholder pattern uses .local
      // which is reserved by RFC 6762 so it can never collide with a
      // real candidate address.
      const placeholderEmail = `cv-${s.id}@no-email.local`
      const realEmail = (s as unknown as { candidate_email?: string | null }).candidate_email
      const all: Record<string, unknown> = {
        session_id: session.id,
        candidate_name: s.candidate_label || 'Candidate',
        candidate_email: (realEmail && realEmail.trim()) || placeholderEmail,
        consent: true,
        video_ids: [],
        status: 'submitted',
        rubric_scores: rubricScores,
        overall_score: s.overall_score,
        recommendation_action: mapCvActionToRecommendation(s.next_action),
        recommendation_rationale: s.rationale_short ?? null,
        cv_screening_id: s.id,
      }
      const out: Record<string, unknown> = {}
      for (const k of Object.keys(all)) {
        if (includeKeys.has(k)) out[k] = all[k]
      }
      return out
    }

    // Optional columns we'll drop one-by-one if the insert fails on them.
    // session_id, candidate_name, video_ids, status, consent are required
    // for the row to be meaningful and are kept in every attempt.
    const REQUIRED = new Set(['session_id', 'candidate_name', 'video_ids', 'status', 'consent', 'candidate_email'])
    const OPTIONAL_ORDER = ['cv_screening_id', 'rubric_scores', 'recommendation_action', 'recommendation_rationale', 'overall_score']
    let active = new Set<string>([...REQUIRED, ...OPTIONAL_ORDER])

    for (let attempt = 0; attempt < OPTIONAL_ORDER.length + 1; attempt++) {
      const rows = (screenings as CandidateScreening[]).map(s => buildRow(s, active))
      const { data: inserted, error: respErr } = await supabaseAdmin
        .from('prescreen_responses')
        .insert(rows)
        .select('id')
      if (!respErr) {
        attached = inserted?.length ?? 0
        break
      }
      // Log the FULL Postgres error so production traces show the
      // exact column / constraint causing the failure. Previously we
      // only kept .message, which can elide useful context like the
      // constraint name or column hint.
      const fullErr = [
        respErr.message,
        (respErr as { details?: string }).details ? `details: ${(respErr as { details?: string }).details}` : null,
        (respErr as { hint?: string }).hint ? `hint: ${(respErr as { hint?: string }).hint}` : null,
        (respErr as { code?: string }).code ? `code: ${(respErr as { code?: string }).code}` : null,
      ].filter(Boolean).join(' | ')
      lastInsertError = fullErr || 'unknown insert error'
      // Find the offending column from the error message (incl. hint
      // / details) and drop it. Hint/details often name the column
      // when the top-level message is generic.
      const haystack = `${respErr.message ?? ''} ${(respErr as { details?: string }).details ?? ''} ${(respErr as { hint?: string }).hint ?? ''}`.toLowerCase()
      const dropped = OPTIONAL_ORDER.find(col => active.has(col) && haystack.includes(col.toLowerCase()))
      if (dropped) {
        console.warn(`[batch-handoff] insert failed on column ${dropped}, retrying without it. (${fullErr})`)
        active.delete(dropped)
        continue
      }
      // Error doesn't mention an optional column - bail and surface it.
      console.error('[batch-handoff] non-recoverable insert error:', fullErr)
      break
    }

    if (attached === 0) {
      // Don't silently lie about success. Surface the underlying issue so
      // the user knows the session was created but candidates didn't flow.
      console.error('[batch-handoff] zero rows inserted, lastError:', lastInsertError)
      return NextResponse.json({
        error: 'Candidates could not be attached to the Shortlist role',
        detail: lastInsertError ?? 'Unknown error inserting into prescreen_responses',
        session_id: session.id,
        role_title: session.role_title,
      }, { status: 500 })
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://www.humanistiqs.ai'
    const slug = (session.slug as string | null) ?? session.id
    return NextResponse.json({
      session_id: session.id,
      role_title: session.role_title,
      candidate_url: `${baseUrl}/prescreen/${slug}`,
      candidates_attached: attached,
    })
  } catch (err) {
    console.error('[batch-handoff]', err)
    const detail = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: 'Batch handoff failed', detail }, { status: 500 })
  }
}

// Map the CV next_action vocabulary to the prescreen_responses
// recommendation_action enum. Anything below "phone_screen" passes through
// as 'consider_with_caution' so it doesn't auto-reject candidates that
// happened to score lower on CV signal alone.
function mapCvActionToRecommendation(next: string | null | undefined): 'progress_to_shortlist' | 'consider_with_caution' | 'reject' {
  if (!next) return 'consider_with_caution'
  const lower = String(next).toLowerCase()
  if (lower.includes('schedule_panel') || lower.includes('shortlist') || lower.includes('progress')) return 'progress_to_shortlist'
  if (lower.includes('reject') || lower.includes('do_not')) return 'reject'
  return 'consider_with_caution'
}

async function resolveRubric(rubricId: string): Promise<Rubric | null> {
  const standard = getStandardRubric(rubricId)
  if (standard) return standard
  const { data } = await supabaseAdmin
    .from('cv_custom_rubrics')
    .select('rubric')
    .eq('id', rubricId)
    .single()
  return (data?.rubric as Rubric | undefined) ?? null
}

async function generatePopulationQuestions(
  screenings: CandidateScreening[],
  rubric: Rubric,
): Promise<string[]> {
  // Average scores across selected candidates by criterion. Weakest criteria
  // become the focus of the shared probe questions.
  const avgByCriterion = new Map<string, { sum: number; count: number }>()
  for (const s of screenings) {
    for (const cs of s.criteria_scores as CriterionScore[]) {
      const cur = avgByCriterion.get(cs.id) ?? { sum: 0, count: 0 }
      cur.sum += cs.score
      cur.count += 1
      avgByCriterion.set(cs.id, cur)
    }
  }
  const weakest = [...avgByCriterion.entries()]
    .map(([id, v]) => {
      const c = rubric.criteria.find(c => c.id === id)
      return c && c.type === 'ordinal_5' ? { id, label: c.label, avg: v.sum / v.count } : null
    })
    .filter((x): x is { id: string; label: string; avg: number } => !!x)
    .sort((a, b) => a.avg - b.avg)
    .slice(0, 4)

  const tool = {
    name: 'submit_questions',
    description: 'Return 5 video pre-screen questions targeting the role-level criteria gaps.',
    input_schema: {
      type: 'object' as const,
      properties: {
        questions: {
          type: 'array',
          items: { type: 'string' },
          description: 'Exactly 5 questions, each answerable in 60-120 seconds.',
        },
      },
      required: ['questions'],
    },
  }

  try {
    const res = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 800,
      system: `You are a senior Australian recruiter writing 5 standard video pre-screen questions for a ${rubric.role} role. The same 5 questions will be sent to multiple candidates. Australian English, no em-dashes or en-dashes, plain hyphens only. Each question answerable in 60-120 seconds. Probe the criteria below which scored weakest across the CV shortlist.`,
      tools: [tool],
      tool_choice: { type: 'tool', name: 'submit_questions' },
      messages: [{
        role: 'user',
        content: `Role: ${rubric.role}\n\nWeakest criteria across the shortlist (need probing):\n${weakest.map(w => `- ${w.label} (avg ${w.avg.toFixed(2)}/5)`).join('\n')}`,
      }],
    })
    const toolBlock = res.content.find(b => b.type === 'tool_use')
    if (!toolBlock || toolBlock.type !== 'tool_use') return defaultQuestions(rubric.role)
    const input = toolBlock.input as { questions?: string[] }
    const qs = Array.isArray(input.questions) ? input.questions.map(q => String(q).trim()).filter(Boolean) : []
    return qs.length >= 3 ? qs : defaultQuestions(rubric.role)
  } catch {
    return defaultQuestions(rubric.role)
  }
}

function defaultQuestions(role: string): string[] {
  return [
    `Why are you interested in this ${role} position?`,
    `Walk us through a recent project most relevant to this role.`,
    `Tell us about a time you handled a difficult stakeholder or customer.`,
    `What does success in this role look like for you in the first 90 days?`,
    `Anything else you'd like us to know that isn't on your CV?`,
  ]
}
