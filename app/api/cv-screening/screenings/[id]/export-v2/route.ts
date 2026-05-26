// CV export V2 - same three modes as the v1 route, but rendered through
// @turbodocx/html-to-docx (HTML -> docx) instead of hand-rolling docx
// Paragraph/TextRun trees. Proof of concept for the wider doc-generation
// migration: the founder A/B tests this against v1 by hitting
// /api/cv-screening/screenings/<id>/export-v2?mode=<mode> alongside the
// existing buttons. v1 stays untouched until v2 is signed off.
//
// Why HTML-driven:
//   - Author surface is way more flexible than Paragraph/TextRun trees.
//   - Inline CSS controls font, size, spacing, colour, alignment, table
//     borders, page-break rules - all things that were hard to tune in
//     the docx library API.
//   - Logo header is a tiny <img> tag with a base64 data URL, supplied
//     as the separate headerHTMLstring arg to @turbodocx.
//
// Things to verify in the A/B comparison:
//   - Font rendering (Arial throughout, expected).
//   - Logo positioning (top-right of every page).
//   - Page break between score summary and formatted CV (combined mode).
//   - Table-of-criteria rendering shape.
//   - Italic quote blocks for evidence excerpts.
//   - Headings sizing parity vs v1.

import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { getRubric as getStandardRubric } from '@/lib/cv-screening-rubrics'
import {
  type Rubric,
  BAND_LABELS,
  ACTION_LABELS,
} from '@/lib/cv-screening-types'
import HTMLtoDOCX from '@turbodocx/html-to-docx'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 90

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

type Mode = 'score' | 'formatted' | 'combined'
const BODY_FONT = 'Arial'

// ── CV formatter tool (same shape as v1, reused) ───────────────────
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

// ── HTML helpers ────────────────────────────────────────────────────
// Minimal XSS-safe escape for content that the LLM might emit. CV text
// is from the candidate's CV; rationale text is from the AI. Neither is
// trusted to be safe HTML. We escape for safety even though the output
// is a docx (not browser-rendered) - belt-and-braces.
function esc(s: string | null | undefined): string {
  if (!s) return ''
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function buildScoreSummaryHtml(opts: {
  screening: any
  rubric: Rubric | null
  businessName: string
}): string {
  const { screening, rubric, businessName } = opts
  const candidateLabel = esc(screening.candidate_label ?? 'Candidate')
  const overall = Number(screening.overall_score).toFixed(2)
  const bandLabel = esc(BAND_LABELS[screening.band as keyof typeof BAND_LABELS] ?? screening.band)
  const actionLabel = esc(ACTION_LABELS[screening.next_action as keyof typeof ACTION_LABELS] ?? screening.next_action)
  const rubricLine = rubric?.role
    ? `Role: ${esc(rubric.role)}`
    : `Rubric: ${esc(screening.rubric_id ?? '-')}`

  // Inline styles only - external <style> tags don't survive the
  // HTML -> docx conversion in many converters, and @turbodocx is
  // safer with inline styles per the docs.
  const criteriaById: Record<string, string> = {}
  rubric?.criteria.forEach(c => { criteriaById[c.id] = c.label })

  const criteriaBlocks = Array.isArray(screening.criteria_scores) && screening.criteria_scores.length > 0
    ? screening.criteria_scores.map((cs: { id: string; score: number; rationale?: string; evidence?: Array<{ text: string }> }) => {
        const label = esc(criteriaById[cs.id] ?? cs.id)
        const rationale = cs.rationale ? `<p style="margin:0 0 6pt 0;">${esc(cs.rationale)}</p>` : ''
        const evidence = cs.evidence?.[0]?.text
          ? `<p style="margin:0 0 12pt 18pt;font-style:italic;font-size:10pt;color:#4a4a47;">&ldquo;${esc(cs.evidence[0].text)}&rdquo;</p>`
          : ''
        return `
          <p style="margin:12pt 0 4pt 0;font-weight:bold;font-size:11pt;">${label} - ${cs.score}/5</p>
          ${rationale}
          ${evidence}
        `
      }).join('')
    : ''

  const rationaleBlock = screening.rationale_short
    ? `
        <h2 style="font-size:13pt;margin:20pt 0 6pt 0;">Summary rationale</h2>
        <p style="margin:0 0 12pt 0;font-size:11pt;">${esc(screening.rationale_short)}</p>
      `
    : ''

  const criteriaSection = criteriaBlocks
    ? `<h2 style="font-size:13pt;margin:20pt 0 6pt 0;">Criteria</h2>${criteriaBlocks}`
    : ''

  return `
    <p style="text-align:right;font-size:9pt;color:#6B6B66;margin:0 0 18pt 0;">${esc(businessName)}</p>
    <h1 style="font-size:15pt;margin:0 0 10pt 0;">Candidate Score Summary - ${candidateLabel}</h1>
    <p style="margin:0 0 6pt 0;font-size:11pt;">${rubricLine}</p>
    <p style="margin:0 0 6pt 0;font-size:11pt;font-weight:bold;">Overall score: ${overall} / 5</p>
    <p style="margin:0 0 6pt 0;font-size:11pt;font-weight:bold;">Band: ${bandLabel}</p>
    <p style="margin:0 0 14pt 0;font-size:11pt;">Next action: ${actionLabel}</p>
    ${rationaleBlock}
    ${criteriaSection}
  `
}

function buildFormattedCvHtml(payload: CvPayload): string {
  const meta = [
    payload.candidate_email && `Email: ${esc(payload.candidate_email)}`,
    payload.candidate_phone && `Phone: ${esc(payload.candidate_phone)}`,
    payload.candidate_suburb && `Suburb: ${esc(payload.candidate_suburb)}`,
    payload.work_rights && `Work rights: ${esc(payload.work_rights)}`,
    payload.role_title && `Applied for: ${esc(payload.role_title)}`,
    payload.notice_period && `Notice: ${esc(payload.notice_period)}`,
    payload.availability && `Availability: ${esc(payload.availability)}`,
  ].filter(Boolean) as string[]

  const metaHtml = meta.length
    ? meta.map(line => `<p style="margin:0 0 4pt 0;font-size:11pt;">${line}</p>`).join('')
    : ''

  const summary = payload.professional_summary
    ? `<h2 style="font-size:13pt;margin:18pt 0 6pt 0;">Professional Summary</h2><p style="margin:0 0 12pt 0;font-size:11pt;">${esc(payload.professional_summary)}</p>`
    : ''

  const bulletList = (items: string[]) =>
    items.length
      ? `<ul style="margin:0 0 8pt 0;padding-left:18pt;">${items.map(i => `<li style="font-size:11pt;margin:2pt 0;">${esc(i)}</li>`).join('')}</ul>`
      : ''

  const qualBlock = payload.qualifications?.length
    ? `<h2 style="font-size:13pt;margin:18pt 0 6pt 0;">Qualifications</h2>${bulletList(
        payload.qualifications.map(q => [q.qualification, q.institution, q.year].filter(Boolean).join(' - ')).filter(Boolean) as string[]
      )}`
    : ''

  const membershipsBlock  = payload.memberships?.length  ? `<h2 style="font-size:13pt;margin:18pt 0 6pt 0;">Memberships</h2>${bulletList(payload.memberships)}`   : ''
  const certificatesBlock = payload.certificates?.length ? `<h2 style="font-size:13pt;margin:18pt 0 6pt 0;">Certificates</h2>${bulletList(payload.certificates)}` : ''
  const systemsBlock      = payload.systems?.length      ? `<h2 style="font-size:13pt;margin:18pt 0 6pt 0;">Systems</h2>${bulletList(payload.systems)}`           : ''
  const skillsBlock       = payload.skills?.length       ? `<h2 style="font-size:13pt;margin:18pt 0 6pt 0;">Skills</h2>${bulletList(payload.skills)}`             : ''

  const experienceBlock = payload.experience?.length
    ? `<h2 style="font-size:13pt;margin:18pt 0 6pt 0;">Professional Experience</h2>` + payload.experience.map(e => {
        const header = [e.role, e.employer && `at ${e.employer}`].filter(Boolean).join(' ')
        const sub = [
          [e.start_date, e.end_date].filter(Boolean).join(' to '),
          e.location,
        ].filter(Boolean).join(' - ')
        const description = e.description ? `<p style="margin:0 0 6pt 0;font-size:11pt;">${esc(e.description)}</p>` : ''
        const bullets = e.bullets?.length ? bulletList(e.bullets) : ''
        return `
          <p style="margin:10pt 0 2pt 0;font-weight:bold;font-size:11pt;">${esc(header)}</p>
          ${sub ? `<p style="margin:0 0 6pt 0;font-style:italic;font-size:10pt;">${esc(sub)}</p>` : ''}
          ${description}
          ${bullets}
        `
      }).join('')
    : ''

  return `
    <h1 style="font-size:17pt;margin:0 0 10pt 0;">${esc(payload.full_name || 'Candidate')}</h1>
    ${metaHtml}
    ${summary}
    ${qualBlock}
    ${membershipsBlock}
    ${certificatesBlock}
    ${systemsBlock}
    ${skillsBlock}
    ${experienceBlock}
  `
}

// Fetch the customer's brand logo and return a base64 data URL the
// header HTML can embed inline. Failures degrade to an empty string -
// the header just shows nothing rather than failing the whole export.
async function fetchLogoDataUrl(logoUrl: string | null): Promise<string> {
  if (!logoUrl) return ''
  try {
    const res = await fetch(logoUrl, { cache: 'no-store' })
    if (!res.ok) return ''
    const buf = Buffer.from(await res.arrayBuffer())
    const ct = (res.headers.get('content-type') ?? 'image/png').toLowerCase()
    return `data:${ct};base64,${buf.toString('base64')}`
  } catch {
    return ''
  }
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

  const { data: profile } = await supabase
    .from('profiles')
    .select('business_id')
    .eq('id', user.id)
    .single()
  const businessId = profile?.business_id as string | undefined
  if (!businessId) return NextResponse.json({ error: 'No business profile' }, { status: 400 })

  const { data: screening, error } = await supabaseAdmin
    .from('cv_screenings')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (error) {
    console.error('[cv-screening/export-v2] lookup error:', error.message)
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
    .select('name, logo_url')
    .eq('id', businessId)
    .maybeSingle()
  const businessName = (bizRow?.name as string | undefined) ?? 'Your business'
  const businessLogoUrl = (bizRow?.logo_url as string | undefined) ?? null

  let rubric: Rubric | null = getStandardRubric(screening.rubric_id) ?? null
  if (!rubric) {
    const { data: custom } = await supabaseAdmin
      .from('cv_custom_rubrics')
      .select('rubric')
      .eq('id', screening.rubric_id)
      .maybeSingle()
    rubric = (custom?.rubric as Rubric | undefined) ?? null
  }

  // Assemble the body HTML per mode.
  let bodyHtml = ''
  if (mode === 'score' || mode === 'combined') {
    bodyHtml += buildScoreSummaryHtml({ screening, rubric, businessName })
  }
  if (mode === 'formatted' || mode === 'combined') {
    if (!screening.cv_text) {
      return NextResponse.json({ error: 'No CV text on file for this candidate - re-run scoring with the original CV.' }, { status: 422 })
    }
    if (mode === 'combined') {
      // Page break between summary and formatted CV. CSS page-break
      // is the standard HTML-to-docx convention.
      bodyHtml += `<div style="page-break-before:always;"></div>`
    }
    try {
      const payload = await formatCvWithClaude(screening.cv_text)
      bodyHtml += buildFormattedCvHtml(payload)
    } catch (err) {
      return NextResponse.json({ error: 'CV formatter failed', detail: (err as Error).message }, { status: 502 })
    }
  }

  // Header HTML - logo right-aligned. Empty data URL = no image.
  const logoDataUrl = await fetchLogoDataUrl(businessLogoUrl)
  const headerHtml = logoDataUrl
    ? `<p style="text-align:right;margin:0;"><img src="${logoDataUrl}" width="120" height="40" alt="" /></p>`
    : null

  // Wrap the body in a minimal HTML shell. @turbodocx tolerates either
  // a full document or a fragment; we use a full doc so the html tag's
  // lang stays in the output.
  const fullHtml = `
    <!DOCTYPE html>
    <html lang="en-AU">
      <head><meta charset="utf-8" /></head>
      <body style="font-family:${BODY_FONT}, sans-serif;font-size:11pt;color:#111111;">
        ${bodyHtml}
      </body>
    </html>
  `

  let buffer: Buffer | ArrayBuffer | Blob
  try {
    buffer = await HTMLtoDOCX(fullHtml, headerHtml, {
      title: `${screening.candidate_label ?? 'Candidate'} - ${mode}`,
      creator: 'HQ.ai CV Scoring Agent',
      font: BODY_FONT,
      fontSize: 22, // half-points; 22 = 11pt
      pageNumber: false,
      orientation: 'portrait',
      pageSize: { width: 12240, height: 15840 }, // US Letter; switch to A4 (11906x16838) if AU customers prefer
      margins: { top: 1440, right: 1440, bottom: 1440, left: 1440, header: 720, footer: 720 },
      header: !!headerHtml,
      headerType: 'default',
    })
  } catch (err) {
    console.error('[cv-screening/export-v2] HTMLtoDOCX failed:', err)
    return NextResponse.json({ error: 'docx render failed', detail: (err as Error).message }, { status: 502 })
  }

  // @turbodocx returns Buffer in Node runtime per the index.d.ts union.
  // Normalise to a Node Buffer for the Response body.
  const out = Buffer.isBuffer(buffer)
    ? buffer
    : buffer instanceof ArrayBuffer
      ? Buffer.from(buffer)
      : Buffer.from(await (buffer as Blob).arrayBuffer())

  const filename = `${(screening.candidate_label ?? 'candidate').replace(/[^a-zA-Z0-9]+/g, '_')}_${mode}_v2.docx`
  return new Response(out as unknown as BodyInit, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'private, no-store',
    },
  })
}
