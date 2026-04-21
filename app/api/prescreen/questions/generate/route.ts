// POST /api/prescreen/questions/generate
// Generates AI pre-screen questions without creating a session.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'

export const runtime = 'nodejs'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  try {
    const { role_title, description, count = 4 } = await req.json()
    if (!role_title) return NextResponse.json({ error: 'role_title is required' }, { status: 400 })

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{
        role: 'user',
        content: `You are helping a recruitment consultancy create video pre-screen questions for candidates.

Role: ${role_title}
${description ? `Context: ${description}` : ''}
Number of questions: ${count}

Generate exactly ${count} concise, open-ended video interview questions. They should:
- Be specific to the role and seniority level
- Vary in focus: background/motivation, a specific skill or situation, working style or communication, growth/goals
- Be warm but professional in tone
- Be answerable in 60–120 seconds
- NOT be generic filler

Return ONLY a JSON array of strings. No preamble, no markdown, no explanation.
Example: ["Question one","Question two"]`,
      }],
    })

    const text = message.content.filter(b => b.type === 'text').map(b => (b as any).text).join('')
    const clean = text.replace(/```json|```/g, '').trim()
    const questions = JSON.parse(clean) as string[]

    return NextResponse.json({ questions })
  } catch (err) {
    console.error('[POST /api/prescreen/questions/generate]', err)
    return NextResponse.json({ error: 'Failed to generate questions' }, { status: 500 })
  }
}
