// Extract the plain text of an uploaded position description (PD) /
// job description so the New Scoring Criteria modal can populate its
// textarea from a drag-and-drop upload instead of forcing the user to
// copy-paste. Supports .txt, .docx (via mammoth), and .pdf (Claude
// vision pass, same approach as cv-screening/score).
//
// Returns { text } on success. Caller still owns the textarea state
// and can let the user edit before submitting to suggest-rubric.

import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import mammoth from 'mammoth'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 60

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const MODEL = 'claude-sonnet-4-6'

const MAX_BYTES = 8 * 1024 * 1024 // 8 MB safety net for serverless

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const form = await req.formData()
    const file = form.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })

    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'File too large - keep PDs under 8 MB' }, { status: 413 })
    }

    const filename = file.name || 'pd'
    const ext = filename.split('.').pop()?.toLowerCase() ?? ''
    if (!['txt', 'docx', 'pdf', ''].includes(ext)) {
      return NextResponse.json({
        error: 'Unsupported file type. Use PDF, DOCX, or plain text.',
      }, { status: 415 })
    }

    const arrayBuf = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuf)
    const text = await extractText(buffer, ext)
    if (!text || text.trim().length < 30) {
      return NextResponse.json({
        error: 'Could not read enough text from this file. Try copy-pasting the PD instead.',
      }, { status: 422 })
    }
    return NextResponse.json({ text: text.trim() })
  } catch (err) {
    console.error('[cv-screening/parse-pd]', err)
    const detail = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: 'PD parse failed', detail }, { status: 500 })
  }
}

async function extractText(buffer: Buffer, ext: string): Promise<string> {
  if (ext === 'txt' || ext === '') return buffer.toString('utf-8')
  if (ext === 'docx') {
    const r = await mammoth.extractRawText({ buffer })
    return r.value ?? ''
  }
  if (ext === 'pdf') {
    const base64 = buffer.toString('base64')
    const res = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 4096,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'document',
            source: { type: 'base64', media_type: 'application/pdf', data: base64 },
          // Cast to any: the SDK's published type for content blocks
          // does not yet expose the document block param, even though
          // the API accepts it. Same cast used in score/route.ts for
          // the same reason.
          } as any,
          {
            type: 'text',
            text: 'Extract the entire text of this position description / job ad exactly as written. Preserve headings, bullet points, and section order. Do not summarise. Output plain text only with line breaks - no markdown wrappers.',
          },
        ],
      }],
    })
    return res.content
      .filter(b => b.type === 'text')
      .map(b => (b as { type: 'text'; text: string }).text)
      .join('\n')
      .trim()
  }
  throw new Error(`Unsupported file type: .${ext}`)
}
