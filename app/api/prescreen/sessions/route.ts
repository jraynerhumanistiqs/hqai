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

    const { data, error } = await supabaseAdmin
      .from('prescreen_sessions')
      .insert({
        company: body.company,
        role_title: body.role_title,
        questions,
        time_limit_seconds: body.time_limit_seconds ?? 90,
        status: 'active',
        created_by: user.id,
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

export async function GET(req: NextRequest) {
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
