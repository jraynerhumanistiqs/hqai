import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { getRubric } from '@/lib/cv-screening-rubrics'
import type { CandidateScreening, CriterionScore } from '@/lib/cv-screening-types'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 60

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const MODEL = 'claude-sonnet-4-20250514'

interface HandoffBody {
  screening_id: string
  candidate_email?: string
  questions_override?: string[]
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
    const business = (profile?.businesses as unknown as { id: string; name: string } | null)
    if (!business?.id) {
      return NextResponse.json({ error: 'No business profile found' }, { status: 400 })
    }

    const body = await req.json() as HandoffBody
    if (!body.screening_id) return NextResponse.json({ error: 'Missing screening_id' }, { status: 400 })

    const { data: screening, error: screeningErr } = await supabase
      .from('cv_screenings')
      .select('*')
      .eq('id', body.screening_id)
      .eq('business_id', business.id)
      .single()
    if (screeningErr || !screening) {
      return NextResponse.json({ error: 'Screening not found' }, { status: 404 })
    }
    const s = screening as CandidateScreening

    const rubric = getRubric(s.rubric_id)
    if (!rubric) return NextResponse.json({ error: `Rubric ${s.rubric_id} not found` }, { status: 400 })

    // Generate questions targeted at the candidate's lowest-scoring criteria,
    // unless the caller already supplied an override list (e.g. user edited
    // the auto-generated questions in the scorecard before sending).
    let questions = body.questions_override ?? []
    if (!questions.length) {
      questions = await generateTargetedQuestions(s, rubric.role, rubric.criteria)
    }
    if (questions.length < 3) {
      return NextResponse.json({ error: 'Could not generate enough questions' }, { status: 500 })
    }

    // Custom rubric for the prescreen session uses the same criteria so the
    // video answers get scored against the same axes as the CV did.
    const customRubric = rubric.criteria
      .filter(c => c.type === 'ordinal_5')
      .slice(0, 6)
      .map(c => ({
        name: c.label,
        description: c.anchors?.['3']
          ? `${c.label} - benchmark: ${c.anchors['3']}`
          : c.label,
      }))

    const { data: session, error: sessionErr } = await supabaseAdmin
      .from('prescreen_sessions')
      .insert({
        company: business.name,
        role_title: rubric.role,
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
      console.error('[cv-screening/handoff] session insert', sessionErr)
      return NextResponse.json({ error: 'Failed to create prescreen session' }, { status: 500 })
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://hqai.vercel.app'
    const pathSegment = (session.slug as string | null) ?? session.id
    const candidateUrl = `${baseUrl}/prescreen/${pathSegment}`

    return NextResponse.json({
      session_id: session.id,
      candidate_url: candidateUrl,
      questions,
    })
  } catch (err) {
    console.error('[cv-screening/handoff]', err)
    const detail = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: 'Handoff failed', detail }, { status: 500 })
  }
}

async function generateTargetedQuestions(
  s: CandidateScreening,
  role: string,
  criteria: NonNullable<ReturnType<typeof getRubric>>['criteria'],
): Promise<string[]> {
  // Find the 3-4 weakest criteria - these are the candidate's gaps and the
  // questions should probe them so the video answers fill in what the CV
  // didn't show. Skip hard-gate binary criteria (location etc) since those
  // are yes/no, not interview material.
  const gaps = (s.criteria_scores as CriterionScore[])
    .filter(cs => {
      const c = criteria.find(x => x.id === cs.id)
      return c && c.type === 'ordinal_5' && cs.score <= 3
    })
    .sort((a, b) => a.score - b.score)
    .slice(0, 4)

  const strengths = (s.criteria_scores as CriterionScore[])
    .filter(cs => {
      const c = criteria.find(x => x.id === cs.id)
      return c && c.type === 'ordinal_5' && cs.score >= 4
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)

  const labelFor = (id: string) => criteria.find(c => c.id === id)?.label ?? id

  const gapLines = gaps.map(g => `- ${labelFor(g.id)} (scored ${g.score}/5)`).join('\n')
  const strengthLines = strengths.map(g => `- ${labelFor(g.id)} (scored ${g.score}/5)`).join('\n')

  const tool = {
    name: 'submit_questions',
    description: 'Return 5 video pre-screen questions targeting the candidate\'s gaps.',
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

  const res = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: `You are a senior Australian recruiter writing video pre-screen questions for a ${role} candidate. The CV scorer flagged specific gaps - your questions must directly probe those gaps so the video answer can fill in what the CV could not show.

Rules:
- 5 questions only.
- Each answerable in 60-120 seconds.
- Conversational, warm but professional, plain English.
- Mix: 2 questions on the weakest criteria (probe directly with situational prompts), 2 on the next-weakest (probe with examples), 1 on motivation/working style.
- Australian English (organise, behaviour). No em-dashes or en-dashes.
- Do not repeat what's already on the CV. Ask for things the CV did not show.`,
    tools: [tool],
    tool_choice: { type: 'tool', name: 'submit_questions' },
    messages: [{
      role: 'user',
      content: `Candidate: ${s.candidate_label}
Role: ${role}
Overall score: ${s.overall_score}
Recommended next step: ${s.next_action}

Gaps to probe (lowest-scoring criteria):
${gapLines || '(none flagged)'}

Strengths to confirm (don't re-test, just lightly verify):
${strengthLines || '(none flagged)'}

Coach summary: ${s.rationale_short}`,
    }],
  })

  const toolBlock = res.content.find(b => b.type === 'tool_use')
  if (!toolBlock || toolBlock.type !== 'tool_use') {
    throw new Error('Question generator did not return tool_use')
  }
  const input = toolBlock.input as { questions?: string[] }
  return Array.isArray(input.questions) ? input.questions.map(q => String(q).trim()).filter(Boolean) : []
}
