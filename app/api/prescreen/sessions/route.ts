// POST /api/prescreen/sessions - create a new pre-screen session
// GET  /api/prescreen/sessions - list all sessions (staff only)

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import Anthropic from '@anthropic-ai/sdk'

export const runtime = 'nodejs'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

async function generateQuestions(roleTitle: string, description: string, count: number): Promise<string[]> {
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1000,
    messages: [{
      role: 'user',
      content: `You are helping a recruitment consultancy create video pre-screen questions for candidates.

Role: ${roleTitle}
${description ? `Context: ${description}` : ''}
Number of questions: ${count}

Generate exactly ${count} concise, open-ended video interview questions. They should:
- Be specific to the role and seniority level
- Vary in focus: background/motivation, a specific skill or situation, working style or communication, growth/goals
- Be warm but professional in tone
- Be answerable in 60-120 seconds
- NOT be generic filler

Return ONLY a JSON array of strings. No preamble, no markdown, no explanation.
Example: ["Question one","Question two"]`,
    }],
  })

  const text = message.content.filter(b => b.type === 'text').map(b => (b as any).text).join('')
  const clean = text.replace(/```json|```/g, '').trim()
  return JSON.parse(clean) as string[]
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  try {
    const body = await req.json()
    let questions: string[] = body.questions ?? []

    if (body.ai_generate && body.role_title) {
      questions = await generateQuestions(body.role_title, body.role_description ?? '', questions.length || 4)
    }

    // Rubric mode + optional custom rubric (3-6 items)
    const rubric_mode: 'standard' | 'custom' = body.rubric_mode === 'custom' ? 'custom' : 'standard'
    let custom_rubric: Array<{ name: string; description: string }> | null = null
    if (rubric_mode === 'custom') {
      const arr = Array.isArray(body.custom_rubric) ? body.custom_rubric : []
      const cleaned = arr
        .map((r: any) => ({
          name: String(r?.name ?? '').trim(),
          description: String(r?.description ?? '').trim(),
        }))
        .filter((r: { name: string; description: string }) => r.name && r.description)
      if (cleaned.length < 3 || cleaned.length > 6) {
        return NextResponse.json(
          { error: 'Custom rubric must have 3-6 dimensions, each with name and description' },
          { status: 400 },
        )
      }
      custom_rubric = cleaned
    }

    // Phase 4 outcome-email config (optional)
    const auto_send_outcomes = typeof body.auto_send_outcomes === 'boolean' ? body.auto_send_outcomes : false
    const outcome_email_shortlisted = typeof body.outcome_email_shortlisted === 'string' && body.outcome_email_shortlisted.trim()
      ? body.outcome_email_shortlisted
      : null
    const outcome_email_rejected = typeof body.outcome_email_rejected === 'string' && body.outcome_email_rejected.trim()
      ? body.outcome_email_rejected
      : null
    let calendly_url_override: string | null = null
    if (typeof body.calendly_url_override === 'string' && body.calendly_url_override.trim()) {
      const raw = body.calendly_url_override.trim()
      if (!/^https:\/\/(www\.)?calendly\.com\//.test(raw)) {
        return NextResponse.json({ error: 'Calendly URL must start with https://calendly.com/' }, { status: 400 })
      }
      calendly_url_override = raw
    }

    const status: 'active' | 'draft' = body.status === 'draft' ? 'draft' : 'active'

    const { data, error } = await supabaseAdmin
      .from('prescreen_sessions')
      .insert({
        company: body.company,
        role_title: body.role_title,
        questions,
        time_limit_seconds: body.time_limit_seconds ?? 90,
        status,
        created_by: user.id,
        rubric_mode,
        custom_rubric,
        auto_send_outcomes,
        outcome_email_shortlisted,
        outcome_email_rejected,
        calendly_url_override,
      })
      .select()
      .single()

    if (error) throw error

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://hqai.vercel.app'
    const pathSegment = data.slug || data.id
    return NextResponse.json({
      session: data,
      candidateUrl: `${baseUrl}/prescreen/${pathSegment}`,
    })
  } catch (err) {
    console.error('[POST /api/prescreen/sessions]', err)
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 })
  }
}

export async function GET(_req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  try {
    const { data, error } = await supabaseAdmin
      .from('prescreen_sessions')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (error) throw error
    return NextResponse.json({ sessions: data })
  } catch (err) {
    console.error('[GET /api/prescreen/sessions]', err)
    return NextResponse.json({ error: 'Failed to load sessions' }, { status: 500 })
  }
}
