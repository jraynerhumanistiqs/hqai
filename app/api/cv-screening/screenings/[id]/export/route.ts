// CV export endpoint - powers the three CV Scoring Agent download options:
//
//   mode=score      → Score summary docx (per-candidate scorecard).
//   mode=formatted  → Formatted & branded CV docx (Humanistiqs CV layout).
//   mode=combined   → A single docx with the score summary on page one,
//                     then the formatted CV from page two onwards.
//
// The CV formatter logic mirrors app/api/administrator/ingest/route.ts
// but reads cv_text off the existing cv_screenings row (so there's no
// new upload step - we already have the CV text from when the candidate
// was scored).

import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { getRubric as getStandardRubric } from '@/lib/cv-screening-rubrics'
import {
  type Rubric,
  BAND_LABELS,
  ACTION_LABELS,
} from '@/lib/cv-screening-types'
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  PageBreak,
} from 'docx'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 90

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

type Mode = 'score' | 'formatted' | 'combined'
const FONT = 'Calibri'

// ── CV formatter tool (mirrors administrator/ingest) ────────────────
interface CvPayload {
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
      role_title:       { type: 'string' },
      notice_period:    { type: 'string' },
      availability:     { type: 'string' },
      professional_summary: { type: 'string' },
      qualifications: {
        type: 'array',
        items: { type: 'object', properties: { qualification: { type: 'string' }, institution: { type: 'string' }, year: { type: 'string' } } },
      },
      memberships:  { type: 'array', items: { type: 'string' } },
      certificates: { type: 'array', items: { type: 'string' } },
      systems:      { type: 'array', items: { type: 'string' } },
      skills:       { type: 'array', items: { type: 'string' } },
      experience: {
        type: 'array',
        items: {
          type: 'object',
          required: ['role', 'employer'],
          properties: {
            role: { type: 'string' }, employer: { type: 'string' },
            start_date: { type: 'string' }, end_date: { type: 'string' },
            location: { type: 'string' }, description: { type: 'string' },
            bullets: { type: 'array', items: { type: 'string' } },
          },
        },
      },
    },
  },
} as const

async function formatCvWithClaude(cvText: string): Promise<CvPayload> {
  const res = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    system: 'You reformat Australian candidate CVs into the Humanistiqs CV layout. Preserve every claim from the source CV verbatim. Australian English (organise, behaviour, optimise). Plain hyphens only - never em-dashes.',
    tools: [CV_FORMATTER_TOOL as unknown as Anthropic.Messages.Tool],
    tool_choice: { type: 'tool', name: CV_FORMATTER_TOOL.name },
    messages: [{ role: 'user', content: `Reformat this CV.\n\nCV text:\n${cvText}` }],
  })
  const block = res.content.find(b => b.type === 'tool_use') as Anthropic.Messages.ToolUseBlock | undefined
  if (!block) throw new Error('CV formatter did not return a tool result')
  return block.input as CvPayload
}

// ── docx builders ───────────────────────────────────────────────────
function p(text: string, opts: { bold?: boolean; italics?: boolean; size?: number; spacing?: { before?: number; after?: number } } = {}): Paragraph {
  return new Paragraph({
    spacing: opts.spacing ?? { before: 60, after: 80 },
    children: [new TextRun({ text, bold: opts.bold, italics: opts.italics, size: opts.size ?? 22, font: FONT })],
  })
}

function h(text: string, level: 1 | 2 | 3, size?: number): Paragraph {
  const headingLevel = level === 1 ? HeadingLevel.HEADING_1 : level === 2 ? HeadingLevel.HEADING_2 : HeadingLevel.HEADING_3
  const s = size ?? (level === 1 ? 32 : level === 2 ? 26 : 22)
  return new Paragraph({
    heading: headingLevel,
    spacing: { before: 280, after: 120 },
    children: [new TextRun({ text, bold: true, size: s, font: FONT })],
  })
}

function bullet(text: string): Paragraph {
  return new Paragraph({
    bullet: { level: 0 },
    spacing: { before: 20, after: 40 },
    children: [new TextRun({ text, size: 22, font: FONT })],
  })
}

function buildScoreSummarySection(opts: {
  screening: any
  rubric: Rubric | null
  businessName: string
}): Array<Paragraph | Table> {
  const { screening, rubric, businessName } = opts
  const out: Array<Paragraph | Table> = []
  out.push(new Paragraph({
    alignment: AlignmentType.RIGHT,
    spacing: { before: 0, after: 240 },
    children: [new TextRun({ text: businessName, size: 18, color: '6B6B66', font: FONT })],
  }))
  out.push(h(`Candidate Score Summary - ${screening.candidate_label ?? 'Candidate'}`, 1, 30))
  out.push(p(rubric?.role ? `Role: ${rubric.role}` : `Rubric: ${screening.rubric_id ?? '-'}`))
  out.push(p(`Overall score: ${Number(screening.overall_score).toFixed(2)} / 5`, { bold: true }))
  out.push(p(`Band: ${BAND_LABELS[screening.band as keyof typeof BAND_LABELS] ?? screening.band}`, { bold: true }))
  out.push(p(`Next action: ${ACTION_LABELS[screening.next_action as keyof typeof ACTION_LABELS] ?? screening.next_action}`))
  if (screening.rationale_short) {
    out.push(h('Summary rationale', 2))
    out.push(p(screening.rationale_short))
  }

  if (Array.isArray(screening.criteria_scores) && screening.criteria_scores.length > 0) {
    out.push(h('Criteria', 2))
    const criteriaById: Record<string, string> = {}
    rubric?.criteria.forEach(c => { criteriaById[c.id] = c.label })
    for (const cs of screening.criteria_scores as Array<{ id: string; score: number; rationale?: string; evidence?: Array<{ text: string }> }>) {
      out.push(p(`${criteriaById[cs.id] ?? cs.id} - ${cs.score}/5`, { bold: true, spacing: { before: 120, after: 40 } }))
      if (cs.rationale) out.push(p(cs.rationale))
      if (cs.evidence?.[0]?.text) {
        out.push(new Paragraph({
          spacing: { before: 0, after: 80 },
          indent: { left: 360 },
          children: [new TextRun({ text: `"${cs.evidence[0].text}"`, italics: true, size: 20, font: FONT, color: '4a4a47' })],
        }))
      }
    }
  }
  return out
}

function buildFormattedCvSection(payload: CvPayload): Array<Paragraph | Table> {
  const out: Array<Paragraph | Table> = []
  out.push(h(payload.full_name || 'Candidate', 1, 34))

  const meta = [
    payload.candidate_email && `Email: ${payload.candidate_email}`,
    payload.candidate_phone && `Phone: ${payload.candidate_phone}`,
    payload.candidate_suburb && `Suburb: ${payload.candidate_suburb}`,
    payload.work_rights && `Work rights: ${payload.work_rights}`,
    payload.role_title && `Applied for: ${payload.role_title}`,
    payload.notice_period && `Notice: ${payload.notice_period}`,
    payload.availability && `Availability: ${payload.availability}`,
  ].filter(Boolean) as string[]
  for (const line of meta) out.push(p(line, { spacing: { before: 0, after: 40 } }))

  if (payload.professional_summary) {
    out.push(h('Professional Summary', 2))
    out.push(p(payload.professional_summary))
  }

  if (payload.qualifications?.length) {
    out.push(h('Qualifications', 2))
    for (const q of payload.qualifications) {
      const parts = [q.qualification, q.institution, q.year].filter(Boolean)
      if (parts.length) out.push(bullet(parts.join(' - ')))
    }
  }
  if (payload.memberships?.length)  { out.push(h('Memberships', 2));  payload.memberships.forEach(m => out.push(bullet(m))) }
  if (payload.certificates?.length) { out.push(h('Certificates', 2)); payload.certificates.forEach(c => out.push(bullet(c))) }
  if (payload.systems?.length)      { out.push(h('Systems', 2));      payload.systems.forEach(s => out.push(bullet(s))) }
  if (payload.skills?.length)       { out.push(h('Skills', 2));       payload.skills.forEach(s => out.push(bullet(s))) }

  if (payload.experience?.length) {
    out.push(h('Professional Experience', 2))
    for (const e of payload.experience) {
      const header = [e.role, e.employer && `at ${e.employer}`].filter(Boolean).join(' ')
      const sub = [
        [e.start_date, e.end_date].filter(Boolean).join(' to '),
        e.location,
      ].filter(Boolean).join(' - ')
      out.push(p(header, { bold: true, spacing: { before: 200, after: 40 } }))
      if (sub) out.push(p(sub, { italics: true, spacing: { before: 0, after: 60 } }))
      if (e.description) out.push(p(e.description))
      e.bullets?.forEach(b => out.push(bullet(b)))
    }
  }
  return out
}

// ── handler ─────────────────────────────────────────────────────────
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const mode = (new URL(req.url).searchParams.get('mode') ?? 'score').toLowerCase() as Mode
  if (!['score', 'formatted', 'combined'].includes(mode)) {
    return NextResponse.json({ error: `Invalid mode "${mode}". Use score | formatted | combined.` }, { status: 400 })
  }

  // Use the profile.business_id column directly rather than the
  // businesses() relation embed. The embed occasionally returned an
  // array on this route (different to what cv-screening/score sees),
  // and a mis-shaped `business.id` was producing a stale filter on the
  // screening lookup -> "Screening not found" even when the row was
  // there. Fetch the business name separately so the report header
  // still has a friendly issuer line.
  const { data: profile } = await supabase
    .from('profiles')
    .select('business_id')
    .eq('id', user.id)
    .single()
  const businessId = profile?.business_id as string | undefined
  if (!businessId) return NextResponse.json({ error: 'No business profile' }, { status: 400 })

  // Fetch the screening WITHOUT the business filter first, then verify
  // ownership. This separates "row doesn't exist" from "row exists but
  // not yours", which gives us a cleaner error message + lets us
  // surface a 403 instead of silent 404 when a cross-tenant lookup is
  // attempted.
  const { data: screening, error } = await supabaseAdmin
    .from('cv_screenings')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (error) {
    console.error('[cv-screening/export] lookup error:', error.message)
    return NextResponse.json({ error: 'Screening lookup failed', detail: error.message }, { status: 500 })
  }
  if (!screening) {
    return NextResponse.json({ error: 'Screening not found', detail: `No cv_screenings row with id ${id}.` }, { status: 404 })
  }
  if (screening.business_id !== businessId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: bizRow } = await supabaseAdmin
    .from('businesses')
    .select('name')
    .eq('id', businessId)
    .maybeSingle()
  const businessName = (bizRow?.name as string | undefined) ?? 'Your business'

  // Resolve rubric for criterion labels and role title.
  let rubric: Rubric | null = getStandardRubric(screening.rubric_id) ?? null
  if (!rubric) {
    const { data: custom } = await supabaseAdmin
      .from('cv_custom_rubrics')
      .select('rubric')
      .eq('id', screening.rubric_id)
      .maybeSingle()
    rubric = (custom?.rubric as Rubric | undefined) ?? null
  }

  // Body assembly per mode.
  const children: Array<Paragraph | Table> = []
  if (mode === 'score' || mode === 'combined') {
    children.push(...buildScoreSummarySection({ screening, rubric, businessName }))
  }
  if (mode === 'formatted' || mode === 'combined') {
    if (!screening.cv_text) {
      return NextResponse.json({ error: 'No CV text on file for this candidate - re-run scoring with the original CV.' }, { status: 422 })
    }
    if (mode === 'combined') {
      children.push(new Paragraph({ children: [new PageBreak()] }))
    }
    try {
      const payload = await formatCvWithClaude(screening.cv_text)
      children.push(...buildFormattedCvSection(payload))
    } catch (err) {
      return NextResponse.json({ error: 'CV formatter failed', detail: (err as Error).message }, { status: 502 })
    }
  }

  const doc = new Document({
    creator: 'HQ.ai CV Scoring Agent',
    title: `${screening.candidate_label ?? 'Candidate'} - ${mode}`,
    sections: [{ properties: {}, children }],
  })
  const buffer = await Packer.toBuffer(doc)
  const filename = `${(screening.candidate_label ?? 'candidate').replace(/[^a-zA-Z0-9]+/g, '_')}_${mode}.docx`
  return new Response(buffer as unknown as BodyInit, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'private, no-store',
    },
  })
}
