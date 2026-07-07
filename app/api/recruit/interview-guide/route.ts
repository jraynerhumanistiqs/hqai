// POST /api/recruit/interview-guide
//
// Generates a short, structured interview guide for a shortlisted
// candidate: 5-8 tailored questions plus what a good answer looks like,
// grounded in the role and the candidate's CV/pre-screen gaps. Reuses
// the forced-tool Claude pattern from app/api/cv-screening/handoff/route.ts
// (generateTargetedQuestions).
//
// The guide is returned to the caller but NOT persisted here - the
// client saves it via PATCH /api/prescreen/responses/[id] with
// { interview_guide }, the same way every other Step 3/4 field is
// written. That keeps a single source of truth for persistence
// (including its graceful fallback if the migration hasn't landed yet).
//
// Structured-interview best practice: the same core questions are
// generated from the role + this candidate's specific gaps so a hiring
// manager who isn't a trained recruiter can run a fair, consistent
// interview. Australian English throughout.

import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { resolveBusinessScope, assertResponseInScope } from '@/lib/supabase/scope'
import { CLAUDE_MODEL } from '@/lib/ai-models'
import type { RubricDimensionScore } from '@/lib/recruit-types'
import type { CriterionScore } from '@/lib/cv-screening-types'

export const runtime = 'nodejs'
export const maxDuration = 60

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

interface Body {
  response_id?: string
}

export interface InterviewGuideQuestion {
  question: string
  good_answer: string
}

export interface InterviewGuide {
  role_title: string
  candidate_name: string
  generated_at: string
  questions: InterviewGuideQuestion[]
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const body = await req.json() as Body
    const responseId = body.response_id
    if (!responseId) return NextResponse.json({ error: 'Missing response_id' }, { status: 400 })

    // Multi-tenant gate: caller must own the response (via session ->
    // business) before we spend a Claude call or read its data.
    const scope = await resolveBusinessScope(user.id)
    if (!(await assertResponseInScope(scope, responseId))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data: response, error: responseErr } = await supabaseAdmin
      .from('prescreen_responses')
      .select('id, session_id, candidate_name, rating, cv_screening_id')
      .eq('id', responseId)
      .single()
    if (responseErr || !response) {
      return NextResponse.json({ error: 'Candidate response not found' }, { status: 404 })
    }

    const { data: session, error: sessionErr } = await supabaseAdmin
      .from('prescreen_sessions')
      .select('role_title, company, questions')
      .eq('id', response.session_id)
      .single()
    if (sessionErr || !session) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 })
    }

    // Gaps to probe - prefer the pre-screen evaluation rubric (video/
    // phone scoring); fall back to the CV screening criteria scores for
    // candidates imported via CV handoff with no video evaluation yet.
    let gapLines = ''
    let strengthLines = ''
    let recommendationSummary = ''

    const { data: evaluation } = await supabaseAdmin
      .from('prescreen_evaluations')
      .select('rubric, overall_summary, recommendation_rationale')
      .eq('response_id', responseId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (evaluation?.rubric) {
      const rubric = evaluation.rubric as RubricDimensionScore[]
      const gaps = rubric.filter(r => r.score <= 3).sort((a, b) => a.score - b.score).slice(0, 4)
      const strengths = rubric.filter(r => r.score >= 4).sort((a, b) => b.score - a.score).slice(0, 2)
      gapLines = gaps.map(g => `- ${g.name} (scored ${g.score}/5)${g.evidence_quote ? `: ${g.evidence_quote}` : ''}`).join('\n')
      strengthLines = strengths.map(g => `- ${g.name} (scored ${g.score}/5)`).join('\n')
      recommendationSummary = evaluation.overall_summary || evaluation.recommendation_rationale || ''
    } else if (response.cv_screening_id) {
      const { data: screening } = await supabaseAdmin
        .from('cv_screenings')
        .select('criteria_scores, rationale_short')
        .eq('id', response.cv_screening_id)
        .maybeSingle()
      if (screening?.criteria_scores) {
        const scores = screening.criteria_scores as CriterionScore[]
        const gaps = scores.filter(s => typeof s.score === 'number' && s.score <= 3).sort((a, b) => a.score - b.score).slice(0, 4)
        gapLines = gaps.map(g => `- ${g.id} (scored ${g.score}/5)`).join('\n')
        recommendationSummary = screening.rationale_short || ''
      }
    }

    const questionsAsked = Array.isArray(session.questions) ? (session.questions as string[]).join('\n') : ''

    const tool = {
      name: 'submit_interview_guide',
      description: 'Return a structured interview guide of 5 to 8 tailored questions, each with what a strong answer looks like.',
      input_schema: {
        type: 'object' as const,
        properties: {
          questions: {
            type: 'array',
            description: 'Between 5 and 8 questions, ordered from most important to least.',
            items: {
              type: 'object',
              properties: {
                question: { type: 'string', description: 'The interview question to ask.' },
                good_answer: { type: 'string', description: 'What a strong, well-evidenced answer covers (2-3 sentences).' },
              },
              required: ['question', 'good_answer'],
            },
          },
        },
        required: ['questions'],
      },
    }

    const res = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 2048,
      system: `You are a senior Australian recruiter preparing a structured interview guide for a hiring manager who is not a trained recruiter. Ground every question in the role and this specific candidate's gaps so the interview fills in what the CV and pre-screen could not show.

Rules:
- 5 to 8 questions only, ordered from most important to least.
- Each answerable in 2-3 minutes.
- Follow structured-interview best practice: behavioural or situational questions with a clear "what a good answer looks like", so the same core questions can be used consistently across candidates for fairness.
- Plain, professional Australian English (organise, behaviour). No em-dashes or en-dashes - use plain hyphens only.
- Do not repeat the pre-screen questions verbatim - go deeper on the gaps.
- Never probe protected attributes (age, family/caring status, disability, etc). Keep every question strictly job-related, consistent with Australian Fair Work and anti-discrimination guidance.`,
      tools: [tool],
      tool_choice: { type: 'tool', name: 'submit_interview_guide' },
      messages: [{
        role: 'user',
        content: `Role: ${session.role_title} at ${session.company}
Candidate: ${response.candidate_name || 'Unnamed candidate'}
Current rating: ${response.rating ? `${response.rating}/5` : 'not rated'}

Pre-screen questions already asked:
${questionsAsked || '(none on file)'}

Gaps to probe (lowest-scoring areas):
${gapLines || '(no scoring data on file - ask well-rounded, role-based questions)'}

Strengths to lightly verify, not re-test:
${strengthLines || '(none flagged)'}

Scoring summary: ${recommendationSummary || '(none on file)'}`,
      }],
    })

    const toolBlock = res.content.find(b => b.type === 'tool_use')
    if (!toolBlock || toolBlock.type !== 'tool_use') {
      throw new Error('Interview guide generator did not return tool_use')
    }
    const input = toolBlock.input as { questions?: Array<{ question?: string; good_answer?: string }> }
    const questions: InterviewGuideQuestion[] = Array.isArray(input.questions)
      ? input.questions
          .map(q => ({ question: String(q?.question ?? '').trim(), good_answer: String(q?.good_answer ?? '').trim() }))
          .filter(q => q.question && q.good_answer)
      : []

    if (questions.length < 3) {
      return NextResponse.json({ error: 'Could not generate an interview guide' }, { status: 500 })
    }

    const guide: InterviewGuide = {
      role_title: session.role_title,
      candidate_name: response.candidate_name || 'Unnamed candidate',
      generated_at: new Date().toISOString(),
      questions,
    }

    return NextResponse.json({ guide })
  } catch (err) {
    console.error('[recruit/interview-guide]', err)
    const detail = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: 'Interview guide generation failed', detail }, { status: 500 })
  }
}
