import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { getRubric as getStandardRubric } from '@/lib/cv-screening-rubrics'
import type { CandidateScreening, Rubric } from '@/lib/cv-screening-types'
import { generateTargetedQuestions } from '@/lib/cv-screening-questions'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 60

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

    const rubric = await resolveRubric(s.rubric_id)
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

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://www.humanistiqs.ai'
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

// generateTargetedQuestions lives in lib/cv-screening-questions.ts so the
// bulk batch-handoff route can reuse the exact same per-candidate logic.
