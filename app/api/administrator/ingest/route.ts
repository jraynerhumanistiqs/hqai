// B9 - file ingestion (CV formatter + contract review).
// POST /api/administrator/ingest  multipart/form-data file= + kind=(cv_formatter|contract|resume)
//
// Extracts plain text from a PDF / .docx / .txt upload, then runs a
// Claude tool-use call to produce a structured payload:
//   - cv_formatter: candidate CV reformatted into the Humanistiqs
//     structure (metadata table + summary + qualifications + skills
//     + experience). The wording is preserved verbatim from the
//     source CV; only the structure / section ordering changes. The
//     response includes a `document_id` the caller can hit at
//     /api/administrator/documents/<id>/render?format=docx to download
//     the reformatted .docx.
//   - contract: AU Fair Work review with severity-tagged findings.
//   - resume: kept as an alias for cv_formatter for backward compat.

import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { resolveModel, withPromptCache } from '@/lib/router'
import { assertStructuredDocument, type StructuredDocument } from '@/lib/doc-model'

export const runtime = 'nodejs'
export const maxDuration = 120

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

type IngestKind = 'cv_formatter' | 'contract' | 'resume'

async function extractText(file: File): Promise<string> {
  const name = (file.name || '').toLowerCase()
  const buf = Buffer.from(await file.arrayBuffer())
  if (name.endsWith('.pdf') || file.type === 'application/pdf') {
    // pdf-parse@1 - stable Node-only API. Default export is a function
    // that takes a Buffer and returns { text, info, metadata, numpages }.
    // Battle-tested on Vercel serverless; pdf-parse@2 spawns a worker
    // that doesn't reliably resolve under serverless bundling.
    type PdfParseFn = (buf: Buffer) => Promise<{ text?: string }>
    const mod = (await import('pdf-parse')) as unknown as { default?: PdfParseFn } & PdfParseFn
    const pdf: PdfParseFn = typeof mod === 'function' ? (mod as PdfParseFn) : (mod.default as PdfParseFn)
    const data = await pdf(buf)
    return (data?.text ?? '').trim()
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

// Humanistiqs CV schema. Mirrors the shape of the founder's reference
// CVs in OneDrive (metadata table -> Professional Summary ->
// Qualifications -> Memberships -> Certificates -> Systems -> Skills
// -> Professional Experience). The model is instructed to preserve
// the source CV's wording verbatim; only the SECTION ORDERING and
// LABELS change.
const CV_FORMATTER_TOOL = {
  name: 'emit_humanistiqs_cv',
  description: 'Reformat the source CV text into the Humanistiqs CV structure. Preserve every claim and wording from the source verbatim - do not paraphrase, summarise, or add new content. Just restructure into the required sections.',
  input_schema: {
    type: 'object' as const,
    required: ['full_name', 'professional_summary', 'experience'],
    properties: {
      full_name:        { type: 'string' },
      candidate_email:  { type: 'string' },
      candidate_phone:  { type: 'string' },
      candidate_suburb: { type: 'string' },
      work_rights:      { type: 'string' },
      role_title:       { type: 'string', description: 'The role the candidate is being put forward for, if mentioned in the source.' },
      notice_period:    { type: 'string' },
      availability:     { type: 'string' },
      professional_summary: { type: 'string', description: 'Verbatim or near-verbatim from the source CV summary. Do not invent.' },
      qualifications: {
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
      memberships:  { type: 'array', items: { type: 'string' } },
      certificates: { type: 'array', items: { type: 'string' } },
      systems:      { type: 'array', items: { type: 'string' } },
      skills:       { type: 'array', items: { type: 'string' } },
      experience: {
        type: 'array',
        description: 'Professional experience in reverse-chronological order. Each entry preserves the source CV bullet points verbatim.',
        items: {
          type: 'object',
          required: ['role', 'employer'],
          properties: {
            role:        { type: 'string' },
            employer:    { type: 'string' },
            start_date:  { type: 'string' },
            end_date:    { type: 'string' },
            location:    { type: 'string' },
            description: { type: 'string', description: 'Plain prose, kept verbatim from the source.' },
            bullets:     { type: 'array', items: { type: 'string' } },
          },
        },
      },
    },
  },
} as const

// Backwards-compatibility alias - external callers using kind=resume
// land here too.
const RESUME_TOOL = CV_FORMATTER_TOOL

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
  const rawKind = String(form?.get('kind') ?? 'cv_formatter').toLowerCase()
  // Resume is a legacy alias for CV formatter.
  const kindParam: IngestKind = rawKind === 'resume' ? 'cv_formatter' : (rawKind as IngestKind)
  if (!(file instanceof File)) return NextResponse.json({ error: 'file is required' }, { status: 400 })
  if (kindParam !== 'cv_formatter' && kindParam !== 'contract') {
    return NextResponse.json({ error: `kind must be cv_formatter|contract, received ${rawKind}` }, { status: 400 })
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
  // Cap at ~50k chars so prompts stay reasonable. Most CVs are well
  // under 10k; longer contracts are sampled at head + tail.
  const MAX = 50_000
  const capped = text.length > MAX
    ? text.slice(0, MAX * 0.7) + '\n\n[... truncated ...]\n\n' + text.slice(-MAX * 0.3)
    : text

  const tool = kindParam === 'cv_formatter' ? CV_FORMATTER_TOOL : CONTRACT_TOOL
  const intent: 'administrator-template-fill' | 'administrator-complex-contract' =
    kindParam === 'cv_formatter' ? 'administrator-template-fill' : 'administrator-complex-contract'
  const model = resolveModel({ tool: 'administrator', intent })

  const systemText = kindParam === 'cv_formatter'
    ? `You restructure Australian CVs into the Humanistiqs CV format. You PRESERVE the candidate's wording verbatim - do not paraphrase, summarise, embellish or invent. If a field is not in the source, leave it blank. Australian English, plain hyphens only.

Humanistiqs CV sections, in order:
  1. Candidate full name (banner)
  2. Metadata table - role_title, candidate_suburb, work_rights, notice_period, availability, candidate_email, candidate_phone
  3. Professional Summary (1 paragraph, verbatim from source)
  4. Qualifications (one entry per degree / diploma)
  5. Memberships & Licences (list)
  6. Certificates (list)
  7. Systems (tech / software names)
  8. Skills (short capability list)
  9. Professional Experience (reverse-chronological, role + employer + dates + bullets, all wording verbatim from source)

Output via the emit_humanistiqs_cv tool exactly once.`
    : 'You review Australian employment contracts against the Fair Work Act, NES, and the inferred Modern Award. Australian English, plain hyphens only. Flag each clause with severity (info/caution/risk) and the relevant statutory citation.'

  const res = await anthropic.messages.create({
    model,
    max_tokens: 6000,
    system: withPromptCache(systemText),
    tools: [tool as unknown as Anthropic.Messages.Tool],
    tool_choice: { type: 'tool', name: tool.name },
    messages: [{
      role: 'user',
      content: `${kindParam === 'cv_formatter' ? 'Restructure the following CV verbatim. Preserve every sentence from the source.' : 'Review the following contract text.'}\n\n${capped}`,
    }],
  })
  const block = res.content.find(b => b.type === 'tool_use') as Anthropic.Messages.ToolUseBlock | undefined
  if (!block) return NextResponse.json({ error: 'Model produced no structured output' }, { status: 502 })

  // CV formatter: also build a StructuredDocument and persist it to
  // the documents table so the front end can hit
  // /api/administrator/documents/<id>/render?format=docx to download
  // the reformatted CV as a Word file. Contract review skips this -
  // the findings are reviewed in-product, not downloaded.
  let document_id: string | null = null
  if (kindParam === 'cv_formatter') {
    const doc = buildHumanistiqsCvDocument(block.input as HumanistiqsCvPayload)
    try {
      const safe = assertStructuredDocument(doc)
      // documents.user_id is NOT NULL on the live schema; we pass the
      // signed-in user as the owner. Earlier 'created_by' was a guess
      // that doesn't exist - the real required column is user_id.
      const { data: docRow, error: docErr } = await supabaseAdmin
        .from('documents')
        .insert({
          business_id: profile.business_id,
          user_id:     user.id,
          title:       `${safe.title}`,
          content:     safe.sections.map(s => (s.title ? `## ${s.title}\n` : '') + s.blocks.map(b => 'text' in b ? b.text : '').filter(Boolean).join('\n\n')).join('\n\n'),
          structured_payload: safe,
          template_id: 'humanistiqs_cv',
        })
        .select('id')
        .single()
      if (docErr) {
        console.warn('[ingest] cv_formatter doc insert error:', docErr.message)
      }
      document_id = docRow?.id ?? null
    } catch (err) {
      console.warn('[ingest] cv_formatter doc persist failed:', (err as Error).message)
    }
  }

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
    document_id,
  })
}

// ─── Humanistiqs CV builder ────────────────────────────────────────
// Maps the model's structured CV payload into a StructuredDocument
// that the existing renderers (docx, html, pdf, pptx) already know
// how to print. This is what makes the "download reformatted .docx"
// step on /dashboard/people/administrator/ingest work without any
// new renderer code.

interface HumanistiqsCvPayload {
  full_name?: string
  candidate_email?: string
  candidate_phone?: string
  candidate_suburb?: string
  work_rights?: string
  role_title?: string
  notice_period?: string
  availability?: string
  professional_summary?: string
  qualifications?: Array<{ qualification?: string; institution?: string; year?: string }>
  memberships?: string[]
  certificates?: string[]
  systems?: string[]
  skills?: string[]
  experience?: Array<{
    role?: string
    employer?: string
    start_date?: string
    end_date?: string
    location?: string
    description?: string
    bullets?: string[]
  }>
}

function buildHumanistiqsCvDocument(p: HumanistiqsCvPayload): StructuredDocument {
  const name = (p.full_name ?? 'Candidate').trim()
  const sections: StructuredDocument['sections'] = []

  // Header / metadata table.
  const metaItems: Array<{ label: string; value: string }> = []
  if (p.role_title)       metaItems.push({ label: 'Role title',            value: p.role_title })
  if (p.notice_period)    metaItems.push({ label: 'Notice period',         value: p.notice_period })
  if (p.candidate_suburb) metaItems.push({ label: 'Suburb',                value: p.candidate_suburb })
  if (p.work_rights)      metaItems.push({ label: 'Work rights',           value: p.work_rights })
  if (p.availability)     metaItems.push({ label: 'Availability',          value: p.availability })
  if (p.candidate_email)  metaItems.push({ label: 'Email',                 value: p.candidate_email })
  if (p.candidate_phone)  metaItems.push({ label: 'Phone',                 value: p.candidate_phone })
  if (metaItems.length) {
    sections.push({
      title: 'Candidate details',
      blocks: [{ type: 'kv', items: metaItems }],
    })
  }

  if (p.professional_summary) {
    sections.push({
      title: 'Professional Summary',
      blocks: [{ type: 'paragraph', text: p.professional_summary }],
    })
  }

  if (p.qualifications && p.qualifications.length) {
    sections.push({
      title: 'Qualifications',
      blocks: [{
        type: 'list',
        ordered: false,
        items: p.qualifications.map(q => [q.qualification, q.institution, q.year].filter(Boolean).join(' - ')),
      }],
    })
  }

  if (p.memberships && p.memberships.length) {
    sections.push({
      title: 'Memberships & Licences',
      blocks: [{ type: 'list', ordered: false, items: p.memberships }],
    })
  }

  if (p.certificates && p.certificates.length) {
    sections.push({
      title: 'Certificates',
      blocks: [{ type: 'list', ordered: false, items: p.certificates }],
    })
  }

  if (p.systems && p.systems.length) {
    sections.push({
      title: 'Systems',
      blocks: [{ type: 'list', ordered: false, items: p.systems }],
    })
  }

  if (p.skills && p.skills.length) {
    sections.push({
      title: 'Skills and Abilities',
      blocks: [{ type: 'list', ordered: false, items: p.skills }],
    })
  }

  if (p.experience && p.experience.length) {
    const blocks: StructuredDocument['sections'][number]['blocks'] = []
    for (const e of p.experience) {
      const headerBits = [e.role, e.employer].filter(Boolean).join(' - ')
      const dateBits   = [e.start_date, e.end_date].filter(Boolean).join(' - ')
      blocks.push({ type: 'heading', level: 3, text: headerBits || 'Role' })
      if (dateBits || e.location) {
        blocks.push({ type: 'paragraph', text: [dateBits, e.location].filter(Boolean).join(' - ') })
      }
      if (e.description) blocks.push({ type: 'paragraph', text: e.description })
      if (e.bullets && e.bullets.length) {
        blocks.push({ type: 'list', ordered: false, items: e.bullets })
      }
      blocks.push({ type: 'spacer', size: 'sm' })
    }
    sections.push({ title: 'Professional Experience', blocks })
  }

  return {
    title: name,
    subtitle: p.role_title ? `Candidate - ${p.role_title}` : 'Candidate CV',
    locale: 'en-AU',
    sections,
  }
}
