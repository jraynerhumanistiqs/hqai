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
import { CLAUDE_MODEL } from '@/lib/ai-models'
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
  Header,
  ImageRun,
  TabStopType,
  TabStopPosition,
  VerticalAlign,
  ShadingType,
} from 'docx'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 90

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

type Mode = 'score' | 'formatted' | 'combined'
// Final document body font. Was Calibri; switched to Arial per founder
// request (May 2026) so exports render with the same typeface across
// Word, Pages, and Google Docs without font substitution.
const FONT = 'Arial'

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
    model: CLAUDE_MODEL,
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

function h(text: string, level: 1 | 2 | 3, size?: number, color: string = '111111'): Paragraph {
  const headingLevel = level === 1 ? HeadingLevel.HEADING_1 : level === 2 ? HeadingLevel.HEADING_2 : HeadingLevel.HEADING_3
  const s = size ?? (level === 1 ? 32 : level === 2 ? 26 : 22)
  return new Paragraph({
    heading: headingLevel,
    spacing: { before: 280, after: 120 },
    // Default heading colour is black (charcoal 111111). Word's
    // default heading style otherwise pulls a theme colour (often
    // dark blue) which clashes with the brand.
    children: [new TextRun({ text, bold: true, size: s, color, font: FONT })],
  })
}

function bullet(text: string): Paragraph {
  return new Paragraph({
    bullet: { level: 0 },
    spacing: { before: 20, after: 40 },
    children: [new TextRun({ text, size: 22, font: FONT })],
  })
}

// Score summary section. Visual target: mirror the in-product
// CandidateScorecardPanel (CV Scoring Agent). Founder feedback
// (May 2026) applied in this version:
//
//   - Logo is the issuer attribution (no "Humanistiqs" text line).
//   - H1 forced black (was inheriting Word's default heading colour).
//   - "Role:" + "Next action:" labels rendered bold (value plain).
//   - Big overall score number is colour-tinted to match the band
//     (green/amber/red) per the same score thresholds used on the
//     criterion cards: >=4 green, >=3 amber, <3 red.
//   - Band label moved BELOW the score (was beside) and rendered in
//     a pill matching the site BAND_COLOURS mapping (strong_yes/yes
//     green, maybe amber, likely_no neutral grey, reject red).
//   - Each criterion card's background is score-tinted using the
//     same green/amber/red palette so the reader can spot weak /
//     strong areas at a glance.

const MUTED_INK = '4D4D4D'     // text-mid
const NEUTRAL_FILL = 'F5F5F4'  // bg-light - fallback only

// Score-band palette. The three buckets match the site's
// success/warning/danger semantic tokens, with light fills paired
// to darker text inks so contrast stays readable.
const SCORE_GREEN  = { fill: 'DCFCE7', ink: '15803D' } // >=4
const SCORE_AMBER  = { fill: 'FEF3C7', ink: 'B45309' } // 3 to <4
const SCORE_RED    = { fill: 'FEE2E2', ink: 'B91C1C' } // <3
const BAND_NEUTRAL = { fill: 'F4F4F5', ink: '3F3F46' } // likely_no

function colourForScore(score: number): { fill: string; ink: string } {
  if (score >= 4) return SCORE_GREEN
  if (score >= 3) return SCORE_AMBER
  return SCORE_RED
}

// Band -> palette. Mirrors the site's BAND_COLOURS mapping in
// lib/cv-screening-types.ts (strong_yes + yes are success-green;
// maybe is warning-amber; likely_no is neutral grey; reject is
// danger-red).
function colourForBand(band: string): { fill: string; ink: string } {
  switch (band) {
    case 'strong_yes':
    case 'yes':       return SCORE_GREEN
    case 'maybe':     return SCORE_AMBER
    case 'likely_no': return BAND_NEUTRAL
    case 'reject':    return SCORE_RED
    default:          return { fill: NEUTRAL_FILL, ink: MUTED_INK }
  }
}

function noBorders() {
  return {
    top:    { style: BorderStyle.NONE, size: 0, color: 'auto' },
    bottom: { style: BorderStyle.NONE, size: 0, color: 'auto' },
    left:   { style: BorderStyle.NONE, size: 0, color: 'auto' },
    right:  { style: BorderStyle.NONE, size: 0, color: 'auto' },
    insideHorizontal: { style: BorderStyle.NONE, size: 0, color: 'auto' },
    insideVertical:   { style: BorderStyle.NONE, size: 0, color: 'auto' },
  }
}

function buildScoreSummarySection(opts: {
  screening: any
  rubric: Rubric | null
  businessName: string
}): Array<Paragraph | Table> {
  const { screening, rubric } = opts
  const out: Array<Paragraph | Table> = []

  // H1 - forced black so it doesn't inherit Word's default heading
  // theme colour. businessName text removed: the logo Header on every
  // page is the issuer attribution.
  out.push(h(`Candidate Score Summary - ${screening.candidate_label ?? 'Candidate'}`, 1, 30, '111111'))

  // Role / rubric eyebrow line - label bold, value regular.
  const roleValue = rubric?.role ? rubric.role : (screening.rubric_id ?? '-')
  const roleLabel = rubric?.role ? 'Role: ' : 'Rubric: '
  out.push(new Paragraph({
    spacing: { before: 0, after: 240 },
    children: [
      new TextRun({ text: roleLabel, bold: true, size: 22, font: FONT, color: '111111' }),
      new TextRun({ text: roleValue, size: 22, font: FONT, color: '111111' }),
    ],
  }))

  // BIG overall score - tinted by score band (green/amber/red).
  const overall = Number(screening.overall_score)
  const overallColour = colourForScore(overall)
  out.push(new Paragraph({
    spacing: { before: 0, after: 120 },
    children: [
      new TextRun({
        text: overall.toFixed(2),
        bold: true,
        size: 56,            // ~28pt - prominent without dominating an A4 page
        font: FONT,
        color: overallColour.ink,
      }),
      new TextRun({ text: '  / 5', size: 22, color: '6B6B66', font: FONT }),
    ],
  }))

  // Band label - placed UNDER the score number, with palette per band.
  // The shaded TextRun gives an inline-pill effect; not a true rounded
  // pill (docx limitation) but reads cleanly as a coloured chip.
  const bandKey = String(screening.band ?? '')
  const bandLabel = BAND_LABELS[bandKey as keyof typeof BAND_LABELS] ?? bandKey
  const bandColour = colourForBand(bandKey)
  out.push(new Paragraph({
    spacing: { before: 0, after: 240 },
    children: [new TextRun({
      text: ` ${bandLabel} `,
      bold: true,
      size: 22,
      font: FONT,
      color: bandColour.ink,
      shading: { type: ShadingType.SOLID, color: bandColour.fill, fill: bandColour.fill },
    })],
  }))

  // Next action body line - label bold, value regular.
  out.push(new Paragraph({
    spacing: { before: 0, after: 240 },
    children: [
      new TextRun({ text: 'Next action: ', bold: true, size: 22, font: FONT, color: '111111' }),
      new TextRun({
        text: ACTION_LABELS[screening.next_action as keyof typeof ACTION_LABELS] ?? screening.next_action,
        size: 22, font: FONT, color: '111111',
      }),
    ],
  }))

  // Rationale - plain paragraph, no heading (matches site UI).
  if (screening.rationale_short) {
    out.push(p(screening.rationale_short, { size: 22, spacing: { before: 0, after: 280 } }))
  }

  // Criteria section
  if (Array.isArray(screening.criteria_scores) && screening.criteria_scores.length > 0) {
    // Small-caps muted "Criteria" label (mirrors site's
    // text-[11px] uppercase tracking-wider muted styling).
    out.push(new Paragraph({
      spacing: { before: 120, after: 160 },
      children: [new TextRun({
        text: 'CRITERIA',
        bold: true,
        size: 18,
        color: '6B6B66',
        characterSpacing: 30,
        font: FONT,
      })],
    }))

    const criteriaById: Record<string, string> = {}
    rubric?.criteria.forEach(c => { criteriaById[c.id] = c.label })

    for (const cs of screening.criteria_scores as Array<{ id: string; score: number; rationale?: string; evidence?: Array<{ text: string }> }>) {
      const labelText = criteriaById[cs.id] ?? cs.id
      const cardChildren: Paragraph[] = []
      const cardColour = colourForScore(cs.score)

      // Top row of card: label (left) + score (right) via right-aligned tab.
      cardChildren.push(new Paragraph({
        spacing: { before: 0, after: 100 },
        tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
        children: [
          new TextRun({ text: labelText, bold: true, size: 22, font: FONT, color: '111111' }),
          new TextRun({ text: '\t', font: FONT }),
          new TextRun({ text: `${cs.score}/5`, bold: true, size: 22, font: FONT, color: cardColour.ink }),
        ],
      }))

      // Rationale paragraph - small, muted.
      if (cs.rationale) {
        cardChildren.push(new Paragraph({
          spacing: { before: 0, after: 100 },
          children: [new TextRun({ text: cs.rationale, size: 20, color: MUTED_INK, font: FONT })],
        }))
      }

      // Italic indented blockquote with a soft left rule.
      if (cs.evidence?.[0]?.text) {
        cardChildren.push(new Paragraph({
          spacing: { before: 0, after: 0 },
          indent: { left: 200 },
          border: {
            left: { style: BorderStyle.SINGLE, size: 6, color: 'D9D9D6', space: 8 },
          },
          children: [new TextRun({
            text: `"${cs.evidence[0].text}"`,
            italics: true,
            size: 20,
            font: FONT,
            color: '2C2C2C',
          })],
        }))
      }

      // Neutral light-grey card background. Score-band tinting was
      // tried and rejected as too intense (May 2026 founder note);
      // only the N/5 score number itself carries the colour now.
      out.push(new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: noBorders(),
        rows: [new TableRow({
          children: [new TableCell({
            shading: { type: ShadingType.SOLID, color: NEUTRAL_FILL, fill: NEUTRAL_FILL },
            margins: { top: 200, bottom: 200, left: 280, right: 280 },
            borders: noBorders(),
            children: cardChildren,
          })],
        })],
      }))

      // Small spacer between cards (the site uses space-y-3).
      out.push(new Paragraph({ spacing: { before: 100, after: 0 }, children: [new TextRun({ text: '', font: FONT })] }))
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

// ── client logo header ─────────────────────────────────────────────
// Fetches the customer's uploaded brand logo (businesses.logo_url) and
// returns a docx Header that places it top-right of every page in the
// final downloads. The image-size probe reads the natural dimensions
// of the uploaded image so we can scale it to fit a bounding box
// without stretching (fix: tall or square logos previously came out
// squashed because the transformation hard-coded 120x40).
//
// Fails gracefully: missing URL, fetch error, undecodable image, or
// natural dimensions unavailable -> no header rather than failing
// the export.
async function buildLogoHeader(logoUrl: string | null): Promise<Header | null> {
  if (!logoUrl) return null
  try {
    const res = await fetch(logoUrl, { cache: 'no-store' })
    if (!res.ok) {
      console.warn(`[cv-screening/export] logo fetch failed (${res.status}) for ${logoUrl}`)
      return null
    }
    const buf = Buffer.from(await res.arrayBuffer())
    const ct = (res.headers.get('content-type') ?? '').toLowerCase()
    const type: 'png' | 'jpg' | 'gif' | 'bmp' =
        ct.includes('png')  ? 'png'
      : ct.includes('jpeg') ? 'jpg'
      : ct.includes('jpg')  ? 'jpg'
      : ct.includes('gif')  ? 'gif'
      : ct.includes('bmp')  ? 'bmp'
      : 'png'

    // Probe natural dimensions so we can scale proportionally inside
    // a bounding box. image-size is already in node_modules (transitive
    // dep). If the probe fails, fall back to the previous hard-coded
    // 120x40 so the header still renders, just slightly squashed.
    const BOX_W = 160
    const BOX_H = 56
    let drawW = 120
    let drawH = 40
    try {
      const probe = (await import('image-size')).default(buf) as { width?: number; height?: number }
      if (probe?.width && probe?.height) {
        const scale = Math.min(BOX_W / probe.width, BOX_H / probe.height)
        drawW = Math.max(1, Math.round(probe.width * scale))
        drawH = Math.max(1, Math.round(probe.height * scale))
      }
    } catch (err) {
      console.warn('[cv-screening/export] image-size probe failed, using default 120x40:', (err as Error).message)
    }

    return new Header({
      children: [
        new Paragraph({
          alignment: AlignmentType.RIGHT,
          children: [
            new ImageRun({
              data: buf,
              transformation: { width: drawW, height: drawH },
              type,
            } as ConstructorParameters<typeof ImageRun>[0]),
          ],
        }),
      ],
    })
  } catch (err) {
    console.warn('[cv-screening/export] logo embed failed:', (err as Error).message)
    return null
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
    .select('name, logo_url')
    .eq('id', businessId)
    .maybeSingle()
  const businessName = (bizRow?.name as string | undefined) ?? 'Your business'
  const businessLogoUrl = (bizRow?.logo_url as string | undefined) ?? null

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

  // Embed the client's uploaded brand logo top-right of every page if
  // one is set on the business profile. Falls back to no header if no
  // logo - the rest of the document still renders with the issuer
  // name line in the body so the brand attribution stays intact.
  const logoHeader = await buildLogoHeader(businessLogoUrl)

  const doc = new Document({
    creator: 'HQ.ai CV Scoring Agent',
    title: `${screening.candidate_label ?? 'Candidate'} - ${mode}`,
    sections: [{
      properties: {},
      headers: logoHeader ? { default: logoHeader } : undefined,
      children,
    }],
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
