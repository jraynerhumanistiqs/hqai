// B9 - file ingestion (resume + contract).
// POST /api/administrator/ingest  multipart/form-data file= + kind=(resume|contract)
//
// Extracts plain text from a PDF or .docx upload using pdf-parse /
// mammoth, then runs a Claude tool-use call to produce a structured
// payload appropriate to the kind. For resumes we emit a
// CandidateProfile shape; for contracts an issue/award-check report.
//
// Keeps the existing video-only candidate ingestion path untouched -
// that pipeline (HQ Recruit / Shortlist Agent) is unaffected.

import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { resolveModel, withPromptCache } from '@/lib/router'

export const runtime = 'nodejs'
export const maxDuration = 120

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

type IngestKind = 'resume' | 'contract'

async function extractText(file: File): Promise<string> {
  const name = (file.name || '').toLowerCase()
  const buf = Buffer.from(await file.arrayBuffer())
  if (name.endsWith('.pdf') || file.type === 'application/pdf') {
    const pdf = (await import('pdf-parse')).default
    const data = await pdf(buf)
    return (data.text || '').trim()
  }
  if (name.endsWith('.docx') || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    const mammoth = await import('mammoth')
    const r = await mammoth.extractRawText({ buffer: buf })
    return (r.value || '').trim()
  }
  if (name.endsWith('.txt') || file.type === 'text/plain') {
    return buf.toString('utf-8')
  }
  throw new Error(`Unsupported file type: ${file.type || name}`)
}

const RESUME_TOOL = {
  name: 'emit_candidate_profile',
  description: 'Emit the structured candidate profile extracted from the resume text.',
  input_schema: {
    type: 'object' as const,
    required: ['full_name', 'summary', 'experience'],
    properties: {
      full_name:   { type: 'string' },
      email:       { type: 'string' },
      phone:       { type: 'string' },
      location:    { type: 'string' },
      summary:     { type: 'string' },
      skills:      { type: 'array', items: { type: 'string' } },
      experience: {
        type: 'array',
        items: {
          type: 'object',
          required: ['role', 'company'],
          properties: {
            role:        { type: 'string' },
            company:     { type: 'string' },
            start_date:  { type: 'string' },
            end_date:    { type: 'string' },
            description: { type: 'string' },
          },
        },
      },
      education: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            qualification: { type: 'string' },
            institution:   { type: 'string' },
            year:          { type: 'string' },
          },
        },
      },
    },
  },
} as const

const CONTRACT_TOOL = {
  name: 'emit_contract_review',
  description: 'Emit a structured review of the contract against Australian employment law.',
  input_schema: {
    type: 'object' as const,
    required: ['summary', 'findings'],
    properties: {
      summary: { type: 'string' },
      role:    { type: 'string' },
      employer:{ type: 'string' },
      employment_type: { type: 'string' },
      award_inferred:  { type: 'string' },
      findings: {
        type: 'array',
        items: {
          type: 'object',
          required: ['severity', 'topic', 'detail'],
          properties: {
            severity: { type: 'string', enum: ['info', 'caution', 'risk'] },
            topic:    { type: 'string' },
            detail:   { type: 'string' },
            citation: { type: 'string' },
          },
        },
      },
    },
  },
} as const

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('business_id').eq('id', user.id).single()
  if (!profile?.business_id) return NextResponse.json({ error: 'No business profile' }, { status: 400 })

  const form = await req.formData().catch(() => null)
  const file = form?.get('file')
  const kindParam = String(form?.get('kind') ?? 'resume').toLowerCase() as IngestKind
  if (!(file instanceof File)) return NextResponse.json({ error: 'file is required' }, { status: 400 })
  if (kindParam !== 'resume' && kindParam !== 'contract') {
    return NextResponse.json({ error: `kind must be resume|contract, received ${kindParam}` }, { status: 400 })
  }
  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: 'File exceeds 10 MB limit.' }, { status: 413 })
  }

  let text: string
  try {
    text = await extractText(file)
  } catch (err) {
    return NextResponse.json({ error: 'Could not extract text', detail: (err as Error).message }, { status: 415 })
  }
  if (!text || text.length < 40) {
    return NextResponse.json({ error: 'Could not read meaningful text from this file.' }, { status: 422 })
  }
  // Cap at ~50k chars so prompts stay reasonable. Most resumes are
  // well under 10k; longer contracts are sampled at head + tail.
  const MAX = 50_000
  const capped = text.length > MAX
    ? text.slice(0, MAX * 0.7) + '\n\n[... truncated ...]\n\n' + text.slice(-MAX * 0.3)
    : text

  const tool = kindParam === 'resume' ? RESUME_TOOL : CONTRACT_TOOL
  const intent: 'administrator-template-fill' | 'administrator-complex-contract' =
    kindParam === 'resume' ? 'administrator-template-fill' : 'administrator-complex-contract'
  const model = resolveModel({ tool: 'administrator', intent })

  const systemText = kindParam === 'resume'
    ? 'You parse Australian resumes into structured candidate profiles. Australian English, plain hyphens only. Extract verbatim - do not editorialise.'
    : 'You review Australian employment contracts against the Fair Work Act, NES, and the inferred Modern Award. Australian English, plain hyphens only. Flag each clause with severity (info/caution/risk) and the relevant statutory citation.'

  const res = await anthropic.messages.create({
    model,
    max_tokens: 4000,
    system: withPromptCache(systemText),
    tools: [tool as unknown as Anthropic.Messages.Tool],
    tool_choice: { type: 'tool', name: tool.name },
    messages: [{
      role: 'user',
      content: `Extract from the following ${kindParam} text:\n\n${capped}`,
    }],
  })
  const block = res.content.find(b => b.type === 'tool_use') as Anthropic.Messages.ToolUseBlock | undefined
  if (!block) return NextResponse.json({ error: 'Model produced no structured output' }, { status: 502 })

  // Persist a row in administrator_ingests so the UI can list past
  // ingests and link them to candidates / contract reviews.
  const { data: row } = await supabaseAdmin
    .from('administrator_ingests')
    .insert({
      business_id: profile.business_id,
      created_by:  user.id,
      kind:        kindParam,
      filename:    file.name,
      mime_type:   file.type || null,
      raw_text:    capped,
      payload:     block.input,
    })
    .select('id')
    .maybeSingle()

  return NextResponse.json({
    id: row?.id ?? null,
    kind: kindParam,
    payload: block.input,
  })
}
