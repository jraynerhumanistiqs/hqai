import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { CLAUDE_MODEL } from '@/lib/ai-models'
import {
  FILE_NOTE_TOOL,
  NOTE_TYPES,
  buildSystemPrompt,
  buildUserPrompt,
  type FileNoteDraft,
  type NoteType,
} from '@/lib/file-note-kb'

// "I need help writing this" - drafts a file note from either a few guided
// answers or a paste of rough text (a voice transcript, dot points).
//
// Returns structured fields via tool-use so the composer can fill its form for
// the user to review and edit. Nothing is saved here - the user saves.

export const runtime = 'nodejs'
export const maxDuration = 30

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid body' }, { status: 400 })

  const mode = body.mode === 'cleanup' ? 'cleanup' : 'guided'
  const noteType = (Object.keys(NOTE_TYPES).includes(body.note_type) ? body.note_type : 'conversation') as NoteType

  if (mode === 'cleanup' && !String(body.raw_text ?? '').trim()) {
    return NextResponse.json({ error: 'Paste some text to tidy up first' }, { status: 400 })
  }
  if (mode === 'guided') {
    const answered = Object.values(body.answers ?? {}).some(v => String(v ?? '').trim())
    if (!answered) return NextResponse.json({ error: 'Answer at least one question first' }, { status: 400 })
  }

  // Bound the input so a pasted transcript cannot blow the context.
  const rawText = String(body.raw_text ?? '').slice(0, 12_000)

  const userPrompt = buildUserPrompt({
    mode,
    noteType,
    employeeName: String(body.employee_name ?? 'the team member').slice(0, 120),
    conductedBy: String(body.conducted_by ?? '').slice(0, 120),
    discussionDate: String(body.discussion_date ?? '').slice(0, 20),
    answers: body.answers ?? {},
    rawText,
  })

  try {
    const res = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 1200,
      system: buildSystemPrompt(),
      tools: [FILE_NOTE_TOOL],
      tool_choice: { type: 'tool', name: FILE_NOTE_TOOL.name },
      messages: [{ role: 'user', content: userPrompt }],
    })

    const toolUse = res.content.find(b => b.type === 'tool_use') as
      | { type: 'tool_use'; input: Record<string, unknown> }
      | undefined
    if (!toolUse) return NextResponse.json({ error: 'Could not draft the note' }, { status: 502 })

    const i = toolUse.input
    const str = (k: string) => String(i[k] ?? '').replace(/[—–]/g, '-').trim()
    const draft: FileNoteDraft = {
      topic: str('topic'),
      key_points: str('key_points'),
      employee_response: str('employee_response'),
      previous_discussions: str('previous_discussions'),
      policies_referenced: str('policies_referenced'),
      agreed_outcome: str('agreed_outcome'),
      follow_up_date: /^\d{4}-\d{2}-\d{2}$/.test(str('follow_up_date')) ? str('follow_up_date') : '',
    }
    return NextResponse.json({ draft, mode })
  } catch (err) {
    console.error('[file-notes/assist]', (err as Error).message)
    return NextResponse.json({ error: 'The drafting service is unavailable right now' }, { status: 502 })
  }
}
