import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { getRubric as getStandardRubric } from '@/lib/cv-screening-rubrics'
import {
  type CandidateScreening,
  type CriterionScore,
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
  ImageRun,
  Header,
} from 'docx'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 60

interface Body {
  screening_ids?: string[]
  screenings?: CandidateScreening[]
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('businesses(id, name, logo_url)')
      .eq('id', user.id)
      .single()
    const business = (profile?.businesses as unknown as { id: string; name: string; logo_url?: string | null } | null)
    if (!business?.id) return NextResponse.json({ error: 'No business profile' }, { status: 400 })

    // Fetch the business logo for letterhead. Failure to fetch falls back to
    // a text-only letterhead so the report still renders.
    let logoBuffer: Buffer | null = null
    if (business.logo_url) {
      try {
        const r = await fetch(business.logo_url)
        if (r.ok) logoBuffer = Buffer.from(await r.arrayBuffer())
      } catch {}
    }

    const body = await req.json() as Body
    const inlineScreenings = Array.isArray(body.screenings) ? body.screenings : []
    const idList = Array.isArray(body.screening_ids) ? body.screening_ids : []

    if (inlineScreenings.length === 0 && idList.length === 0) {
      return NextResponse.json({ error: 'No candidates selected' }, { status: 400 })
    }

    let screenings: CandidateScreening[] = []

    // Prefer inline payloads when supplied - works regardless of whether the
    // cv_screenings migration is applied or whether the rows persisted with
    // matching business_id. Falls back to a DB lookup if only IDs are sent.
    if (inlineScreenings.length > 0) {
      screenings = inlineScreenings
        .slice()
        .sort((a, b) => Number(b.overall_score) - Number(a.overall_score))
    } else {
      const { data: rows, error } = await supabaseAdmin
        .from('cv_screenings')
        .select('*')
        .in('id', idList)
        .eq('business_id', business.id)
        .order('overall_score', { ascending: false })
      if (error) {
        console.error('[cv-screening/report] DB lookup failed:', error)
        return NextResponse.json({
          error: 'Could not load screenings',
          detail: error.message,
        }, { status: 500 })
      }
      if (!rows || rows.length === 0) {
        return NextResponse.json({
          error: 'Could not load screenings',
          detail: `No matching rows for ${idList.length} ID${idList.length === 1 ? '' : 's'}. Send the full screening payload via the 'screenings' field as a fallback.`,
        }, { status: 404 })
      }
      screenings = rows as CandidateScreening[]
    }

    const rubricCache = new Map<string, Rubric | null>()
    const resolveRubric = async (id: string): Promise<Rubric | null> => {
      if (rubricCache.has(id)) return rubricCache.get(id) ?? null
      const standard = getStandardRubric(id)
      if (standard) {
        rubricCache.set(id, standard)
        return standard
      }
      const { data } = await supabaseAdmin
        .from('cv_custom_rubrics')
        .select('rubric')
        .eq('id', id)
        .single()
      const r = (data?.rubric as Rubric | undefined) ?? null
      rubricCache.set(id, r)
      return r
    }

    const sections: Paragraph[] = []
    const today = new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })

    sections.push(coverParagraph('Candidate Score Summary', 36))
    sections.push(meta(`${business.name} - Generated ${today}`))
    sections.push(meta(`${screenings.length} candidate${screenings.length === 1 ? '' : 's'}`))
    sections.push(spacer(300))

    for (let i = 0; i < screenings.length; i++) {
      const s = screenings[i]
      const rubric = await resolveRubric(s.rubric_id)
      const criteriaById: Record<string, { label: string; weight: number }> = {}
      rubric?.criteria.forEach(c => {
        criteriaById[c.id] = { label: c.label, weight: c.weight }
      })

      if (i > 0) {
        sections.push(new Paragraph({ children: [new PageBreak()] }))
      }

      sections.push(coverParagraph(s.candidate_label, 28))
      sections.push(meta(`${rubric?.role ?? 'Custom role'}`))
      sections.push(spacer(120))

      // Headline strip
      sections.push(headlineRow([
        ['Overall score', Number(s.overall_score).toFixed(2)],
        ['Band', BAND_LABELS[s.band as keyof typeof BAND_LABELS] ?? s.band],
        ['Recommended next step', ACTION_LABELS[s.next_action as keyof typeof ACTION_LABELS] ?? s.next_action],
      ]))
      sections.push(spacer(180))

      // Coach summary
      sections.push(sectionHeading('Coach summary'))
      sections.push(bodyPara(s.rationale_short || '(none provided)'))
      sections.push(spacer(180))

      // Criteria table
      sections.push(sectionHeading('Per-criterion scores'))
      const criteriaScores = (s.criteria_scores as CriterionScore[]) ?? []
      sections.push(criteriaTable(criteriaScores, criteriaById))
      sections.push(spacer(180))

      // Evidence
      sections.push(sectionHeading('Evidence'))
      for (const cs of criteriaScores) {
        const label = criteriaById[cs.id]?.label ?? cs.id
        sections.push(evidenceItem(label, cs))
      }
      sections.push(spacer(180))

      // Fairness checks
      sections.push(sectionHeading('Fairness checks'))
      sections.push(bodyPara(`Name blinded from scorer: ${s.fairness_checks?.name_blinded ? 'yes' : 'no'}`))
      sections.push(bodyPara(`Demographic inference suppressed: ${s.fairness_checks?.demographic_inference_suppressed ? 'yes' : 'no'}`))
      if (s.fairness_checks?.tenure_gap_explained) {
        sections.push(bodyPara(`Tenure gap noted: ${s.fairness_checks.tenure_gap_explained}`))
      }
      sections.push(bodyPara('No candidate is auto-rejected. Recommendations require a human click before any adverse action is taken.'))
    }

    // Methodology footer
    sections.push(spacer(400))
    sections.push(sectionHeading('Methodology'))
    sections.push(bodyPara(
      'CVs are scored against a structured rubric of 6-8 weighted criteria. Names, photos, addresses, dates of birth and graduation years are masked from the model so it scores on substance, not signal. Every score is backed by a verbatim CV span quoted in the evidence section. Where a criterion is not addressed in the CV at all, the score defaults to 0 unless a transferable skill from another domain is explicitly identified.',
    ))
    sections.push(bodyPara(
      'This report supports a hiring decision. It does not replace the recruiter\'s judgement, a structured interview, or formal reference checks.',
    ))

    sections.push(spacer(300))
    sections.push(footerLine(`Generated by HQ.ai for ${business.name} - ${today}`))

    // Letterhead - client logo at top of every page if available, otherwise
    // business name in bold as text fallback.
    const headerChildren: Paragraph[] = []
    if (logoBuffer) {
      try {
        headerChildren.push(new Paragraph({
          spacing: { after: 80 },
          children: [new ImageRun({
            data: logoBuffer,
            transformation: { width: 140, height: 56 },
            type: 'png',
          })],
        }))
      } catch {
        headerChildren.push(new Paragraph({
          spacing: { after: 80 },
          children: [new TextRun({ text: business.name, bold: true, size: 24, font: FONT, color: CHARCOAL })],
        }))
      }
    } else {
      headerChildren.push(new Paragraph({
        spacing: { after: 80 },
        children: [new TextRun({ text: business.name, bold: true, size: 24, font: FONT, color: CHARCOAL })],
      }))
    }

    const doc = new Document({
      creator: 'HQ.ai by Humanistiqs',
      title: 'Candidate Score Summary',
      sections: [{
        properties: {
          page: {
            margin: { top: 1440, right: 720, bottom: 720, left: 720 },
          },
        },
        headers: {
          default: new Header({ children: headerChildren }),
        },
        children: sections,
      }],
    })

    const buffer = await Packer.toBuffer(doc)
    const filename = screenings.length === 1
      ? `Candidate_Score_Summary_-_${safeFilename(screenings[0].candidate_label)}.docx`
      : `Candidate_Score_Summary_-_${screenings.length}_candidates_${dateStamp()}.docx`

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (err) {
    console.error('[cv-screening/report]', err)
    const detail = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: 'Report failed', detail }, { status: 500 })
  }
}

// ---- DOCX helpers ----------------------------------------------------------

const CHARCOAL = '1F1F1F'
const MID = '4B4B4B'
const MUTED = 'AFAFAF'
const BORDER = 'E2E2E2'
const LIGHT = 'EFEFEF'
const FONT = 'Calibri'

function coverParagraph(text: string, size: number): Paragraph {
  return new Paragraph({
    spacing: { before: 0, after: 100 },
    children: [new TextRun({ text, bold: true, size: size * 2, font: FONT, color: CHARCOAL })],
  })
}
function meta(text: string): Paragraph {
  return new Paragraph({
    spacing: { before: 0, after: 60 },
    children: [new TextRun({ text, size: 20, font: FONT, color: MID })],
  })
}
function spacer(pt: number): Paragraph {
  return new Paragraph({ spacing: { before: 0, after: pt }, children: [] })
}
function sectionHeading(text: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 200, after: 80 },
    children: [new TextRun({ text: text.toUpperCase(), bold: true, size: 18, font: FONT, color: MID })],
  })
}
function bodyPara(text: string): Paragraph {
  return new Paragraph({
    spacing: { before: 40, after: 60 },
    children: [new TextRun({ text, size: 22, font: FONT, color: CHARCOAL })],
  })
}
function footerLine(text: string): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 200, after: 0 },
    children: [new TextRun({ text, size: 16, italics: true, font: FONT, color: MUTED })],
  })
}

function headlineRow(items: Array<[string, string]>): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [new TableRow({
      children: items.map(([label, value]) => new TableCell({
        borders: noBorders,
        margins: { top: 120, bottom: 120, left: 120, right: 120 },
        shading: { fill: LIGHT, type: 'clear' as any, color: 'auto' },
        children: [
          new Paragraph({
            spacing: { after: 60 },
            children: [new TextRun({ text: label.toUpperCase(), bold: true, size: 14, font: FONT, color: MUTED })],
          }),
          new Paragraph({
            children: [new TextRun({ text: value, bold: true, size: 24, font: FONT, color: CHARCOAL })],
          }),
        ],
      })),
    })],
  })
}

function criteriaTable(
  scores: CriterionScore[],
  meta: Record<string, { label: string; weight: number }>,
): Table {
  const header = new TableRow({
    tableHeader: true,
    children: [
      headerCell('Criterion'),
      headerCell('Weight'),
      headerCell('Score'),
      headerCell('Rationale'),
    ],
  })
  const rows = scores.map(cs => new TableRow({
    children: [
      bodyCell(meta[cs.id]?.label ?? cs.id),
      bodyCell(meta[cs.id] ? `${Math.round(meta[cs.id].weight * 100)}%` : ''),
      bodyCell(`${cs.score} / 5`),
      bodyCell(cs.rationale ?? ''),
    ],
  }))
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [header, ...rows],
  })
}

const cellBorder = { style: BorderStyle.SINGLE, size: 4, color: BORDER }
const allBorders = {
  top: cellBorder, bottom: cellBorder, left: cellBorder, right: cellBorder,
  insideHorizontal: cellBorder, insideVertical: cellBorder,
}
const noBorders = {
  top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
}

function headerCell(text: string): TableCell {
  return new TableCell({
    borders: allBorders,
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    shading: { fill: LIGHT, type: 'clear' as any, color: 'auto' },
    children: [new Paragraph({
      children: [new TextRun({ text: text.toUpperCase(), bold: true, size: 16, font: FONT, color: MID })],
    })],
  })
}
function bodyCell(text: string): TableCell {
  return new TableCell({
    borders: allBorders,
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    children: [new Paragraph({
      children: [new TextRun({ text: text || '-', size: 20, font: FONT, color: CHARCOAL })],
    })],
  })
}

function evidenceItem(label: string, cs: CriterionScore): Paragraph {
  const quote = cs.evidence?.[0]?.text
  if (!quote) {
    return new Paragraph({
      spacing: { before: 40, after: 60 },
      children: [
        new TextRun({ text: `${label}: `, bold: true, size: 20, font: FONT, color: CHARCOAL }),
        new TextRun({ text: 'No evidence in CV.', size: 20, font: FONT, color: MID, italics: true }),
      ],
    })
  }
  return new Paragraph({
    spacing: { before: 40, after: 80 },
    children: [
      new TextRun({ text: `${label}: `, bold: true, size: 20, font: FONT, color: CHARCOAL }),
      new TextRun({ text: `"${quote}"`, size: 20, font: FONT, color: CHARCOAL, italics: true }),
    ],
  })
}

function safeFilename(s: string): string {
  return s.replace(/[^a-zA-Z0-9 ]/g, '').replace(/\s+/g, '_').slice(0, 60) || 'candidate'
}
function dateStamp(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
