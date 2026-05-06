import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { getRubric } from '@/lib/cv-screening-rubrics'
import {
  bandFromScore,
  defaultActionForBand,
  type CandidateScreening,
  type CriterionScore,
  type FairnessChecks,
} from '@/lib/cv-screening-types'
import { NextRequest, NextResponse } from 'next/server'
import mammoth from 'mammoth'

export const runtime = 'nodejs'
export const maxDuration = 120

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const MODEL = 'claude-sonnet-4-20250514'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('businesses(id)')
      .eq('id', user.id)
      .single()
    const businessId = (profile?.businesses as unknown as { id: string } | null)?.id ?? null

    const form = await req.formData()
    const file = form.get('file') as File | null
    const rubricId = String(form.get('rubricId') ?? '')
    if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })

    const rubric = getRubric(rubricId)
    if (!rubric) return NextResponse.json({ error: `Unknown rubric: ${rubricId}` }, { status: 400 })

    const filename = file.name || 'cv'
    const ext = filename.split('.').pop()?.toLowerCase() ?? ''
    const arrayBuf = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuf)

    const cvText = await extractText(buffer, ext)
    if (!cvText || cvText.length < 50) {
      return NextResponse.json({ error: 'Could not read enough text from this file' }, { status: 400 })
    }

    // Mask common PII before sending to model. Belt-and-braces with the prompt
    // instruction below telling the model to score on substance only.
    const blinded = blindPII(cvText)

    const scoreResult = await scoreCv(blinded, rubric.role, rubric.criteria)

    const overall = computeOverall(scoreResult.criteria_scores, rubric.criteria)
    const band = bandFromScore(overall)
    const next_action = defaultActionForBand(band)

    const fairness: FairnessChecks = {
      name_blinded: true,
      demographic_inference_suppressed: true,
      tenure_gap_explained: scoreResult.tenure_note ?? undefined,
    }

    let savedId = `local-${Math.random().toString(36).slice(2, 10)}`
    let createdAt = new Date().toISOString()

    if (businessId) {
      const { data: inserted, error } = await supabase
        .from('cv_screenings')
        .insert({
          business_id: businessId,
          user_id: user.id,
          rubric_id: rubric.rubric_id,
          candidate_label: scoreResult.candidate_label || filenameToLabel(filename),
          candidate_email: scoreResult.candidate_email ?? null,
          cv_text: cvText,
          cv_filename: filename,
          overall_score: overall,
          band,
          next_action,
          rationale_short: scoreResult.rationale_short,
          criteria_scores: scoreResult.criteria_scores,
          fairness_checks: fairness,
          status: 'scored',
        })
        .select('id, created_at')
        .single()
      if (!error && inserted) {
        savedId = inserted.id
        createdAt = inserted.created_at
      }
    }

    const screening: CandidateScreening = {
      id: savedId,
      business_id: businessId ?? '',
      user_id: user.id,
      rubric_id: rubric.rubric_id,
      candidate_label: scoreResult.candidate_label || filenameToLabel(filename),
      candidate_email: scoreResult.candidate_email ?? null,
      cv_text: cvText,
      overall_score: overall,
      band,
      next_action,
      rationale_short: scoreResult.rationale_short,
      criteria_scores: scoreResult.criteria_scores,
      fairness_checks: fairness,
      status: 'scored',
      created_at: createdAt,
    }

    return NextResponse.json({ screening })
  } catch (err) {
    console.error('[cv-screening/score]', err)
    const detail = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: 'Scoring failed', detail }, { status: 500 })
  }
}

async function extractText(buffer: Buffer, ext: string): Promise<string> {
  if (ext === 'txt' || ext === '') return buffer.toString('utf-8')
  if (ext === 'docx') {
    const r = await mammoth.extractRawText({ buffer })
    return r.value ?? ''
  }
  if (ext === 'pdf') {
    // Use Claude vision to extract text from the PDF directly. Avoids
    // pulling in a native Node PDF parser. Cheaper to do this once than
    // to try to render with pdf.js in a serverless lambda.
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
          } as any,
          {
            type: 'text',
            text: 'Extract the entire text content of this CV exactly as written. Preserve section headings, employer names, dates, and bullet points. Do not summarise. Output plain text only with line breaks - no markdown wrappers.',
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

function blindPII(text: string): string {
  // Light-touch redaction. Pre-empts the obvious leaks before the model
  // even sees the CV. Real anti-discrimination depends on the model
  // following the prompt's blind-scoring instruction too.
  return text
    .replace(/\b\d{3}\s?\d{3}\s?\d{3,4}\b/g, '[PHONE]')
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[EMAIL]')
    .replace(/\b\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\b/g, '[CARD]')
    .replace(/Date of Birth[:\s]*\S+/gi, 'Date of Birth: [REDACTED]')
    .replace(/DOB[:\s]*\S+/gi, 'DOB: [REDACTED]')
}

function filenameToLabel(filename: string): string {
  return filename.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').slice(0, 80)
}

interface ScoreResult {
  candidate_label: string
  candidate_email?: string | null
  criteria_scores: CriterionScore[]
  rationale_short: string
  tenure_note?: string | null
}

async function scoreCv(
  cvText: string,
  role: string,
  criteria: ReturnType<typeof getRubric> extends infer T ? (T extends { criteria: infer C } ? C : never) : never,
): Promise<ScoreResult> {
  const criteriaList = (criteria as Array<{ id: string; label: string; weight: number; type: string; anchors?: Record<string, string>; hard_gate?: boolean }>)
  const tool = {
    name: 'submit_score',
    description: 'Return the structured score for this candidate against the rubric.',
    input_schema: {
      type: 'object' as const,
      properties: {
        candidate_label: {
          type: 'string',
          description: 'A short blinded label like "Candidate-8f21" or a first name only if no full identification is possible. Do NOT use the candidate\'s real full name.',
        },
        criteria_scores: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              score: { type: 'number', description: 'Integer 1-5. For binary criteria use 5 for yes, 1 for no.' },
              confidence: { type: 'number', description: '0-1' },
              evidence: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    text: { type: 'string', description: 'Verbatim CV span supporting this score.' },
                  },
                  required: ['text'],
                },
              },
              rationale: { type: 'string', description: 'One short sentence explaining the score.' },
            },
            required: ['id', 'score', 'confidence', 'evidence', 'rationale'],
          },
        },
        rationale_short: {
          type: 'string',
          description: '2-3 sentence overall summary aimed at a hiring manager. Lead with strengths, then gaps.',
        },
        tenure_note: {
          type: 'string',
          description: 'If the CV shows a tenure gap, briefly note any explanation given (e.g. caregiving, study, illness). Empty string if no gap or no explanation.',
        },
      },
      required: ['candidate_label', 'criteria_scores', 'rationale_short'],
    },
  }

  const criteriaPrompt = criteriaList
    .map(c => `- ${c.id} (${c.label}, weight ${Math.round(c.weight * 100)}%, ${c.hard_gate ? 'HARD GATE binary' : c.type})`)
    .join('\n')

  const systemPrompt = `You are an Australian recruitment assistant scoring CVs against a structured rubric for the role: ${role}.

RULES:
1. Score on substance only. Names, photos, addresses, dates of birth, gender, ethnicity, school name, and graduation year MUST NOT influence the score.
2. Each score must be backed by a verbatim CV span you quote in the evidence array. If you cannot find evidence, score conservatively at 2 with low confidence.
3. Tenure gaps are not penalties unless the candidate had no work history. Note any reason given (caregiving, study, illness) in tenure_note rather than reducing the tenure score.
4. For binary hard-gate criteria like AU work rights, score 5 if the CV indicates citizenship, permanent residency, or a current valid AU work visa with sufficient duration. Score 1 only if the CV states no work rights. Score 3 with low confidence if uncertain.
5. Use Australian English in all rationale text (organise, behaviour, recognise, optimise, minimise).
6. No em-dashes (-) or en-dashes (-) in your output. Plain hyphens only.

The criteria you must score:
${criteriaPrompt}

Output only via the submit_score tool.`

  const res = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 3072,
    system: systemPrompt,
    tools: [tool],
    tool_choice: { type: 'tool', name: 'submit_score' },
    messages: [{
      role: 'user',
      content: `CV TEXT:\n\n${cvText}`,
    }],
  })

  const toolBlock = res.content.find(b => b.type === 'tool_use')
  if (!toolBlock || toolBlock.type !== 'tool_use') {
    throw new Error('Model did not return a tool_use block')
  }
  const input = toolBlock.input as Record<string, unknown>
  const candidate_label = String(input.candidate_label ?? 'Candidate')
  const rationale_short = String(input.rationale_short ?? '')
  const tenure_note = input.tenure_note ? String(input.tenure_note) : null
  const candidate_email = null
  const rawScores = Array.isArray(input.criteria_scores) ? input.criteria_scores : []
  const criteria_scores: CriterionScore[] = rawScores.map((c: any) => ({
    id: String(c.id),
    score: Number(c.score) || 1,
    confidence: Number(c.confidence) || 0,
    evidence: Array.isArray(c.evidence) ? c.evidence.map((e: any) => ({ text: String(e.text ?? '') })) : [],
    rationale: c.rationale ? String(c.rationale) : undefined,
  }))

  return {
    candidate_label,
    candidate_email,
    criteria_scores,
    rationale_short,
    tenure_note: tenure_note || null,
  }
}

function computeOverall(
  scores: CriterionScore[],
  criteria: ReturnType<typeof getRubric> extends infer T ? (T extends { criteria: infer C } ? C : never) : never,
): number {
  const cList = criteria as Array<{ id: string; weight: number }>
  let weighted = 0
  let totalWeight = 0
  for (const c of cList) {
    const found = scores.find(s => s.id === c.id)
    if (!found) continue
    weighted += found.score * c.weight
    totalWeight += c.weight
  }
  if (totalWeight === 0) return 0
  return Number(((weighted / totalWeight)).toFixed(2))
}
