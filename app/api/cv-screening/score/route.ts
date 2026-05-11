import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { getRubric as getStandardRubric } from '@/lib/cv-screening-rubrics'
import {
  bandFromScore,
  defaultActionForBand,
  type CandidateScreening,
  type CriterionScore,
  type FairnessChecks,
  type Rubric,
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

    const rubric = await resolveRubric(rubricId)
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
    // Extract the candidate's real full name BEFORE we blind the CV. The
    // recruiter sees the full name in the pipeline; the model only sees the
    // blinded version when actually scoring so demographic signals can't
    // influence the score.
    const realName = extractRealName(cvText, filename)
    const blinded = blindNameInText(blindPII(cvText), realName)

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
          rubric_id: rubricId,
          // Prefer the extracted CV name. If extraction failed, prefer the filename
// over Claude's literal "Candidate" placeholder so the user sees something
// meaningful rather than a generic word.
candidate_label: realName || filenameToLabel(filename) || scoreResult.candidate_label,
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
      rubric_id: rubricId,
      // Prefer the extracted CV name. If extraction failed, prefer the filename
// over Claude's literal "Candidate" placeholder so the user sees something
// meaningful rather than a generic word.
candidate_label: realName || filenameToLabel(filename) || scoreResult.candidate_label,
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

async function resolveRubric(rubricId: string): Promise<Rubric | null> {
  const standard = getStandardRubric(rubricId)
  if (standard) return standard
  // Fall through to a custom rubric stored against the business.
  const { data } = await supabaseAdmin
    .from('cv_custom_rubrics')
    .select('rubric')
    .eq('id', rubricId)
    .single()
  return (data?.rubric as Rubric | undefined) ?? null
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

// Pulls the candidate's full name from the top of the CV. CVs almost always
// open with the name on the first non-empty line, sometimes followed by a
// title or contact line. We take the first line that looks like a name
// (2-4 capitalised tokens, no digits, no @). Falls back to filename if the
// first lines look like a header/title.
// Lines we explicitly never treat as a name even if they pass the
// capitalisation heuristic. Covers AU CV headers and work-rights banners
// that are the classic false positives (e.g. "Australian Citizen").
const NON_NAME_HEADERS = /^(curriculum vitae|resume|cv|profile|professional profile|career profile|summary|career summary|professional summary|objective|career objective|contact|contact details|personal details|personal information|address|phone|mobile|email|linkedin|github|portfolio|skills|core skills|key skills|experience|work experience|professional experience|employment|employment history|education|qualifications|certifications|references|australian citizen|permanent resident|new zealand citizen|nz citizen|working holiday|work rights|right to work|visa holder|tfn holder)\b/i

// Title-case a name that may have arrived as ALL CAPS. Keep particles like
// "de", "van", "von", "of" lowercase and recognise common Mc/Mac/O' patterns
// so "JANE MCDONALD" -> "Jane McDonald", not "Jane Mcdonald".
function titleCaseName(input: string): string {
  return input
    .toLowerCase()
    .split(/\s+/)
    .map((tok, i) => {
      if (i > 0 && /^(de|del|della|der|van|von|of|du|da|la|le|al|el|bin|ibn|y)$/.test(tok)) return tok
      // Mc + capitalised tail
      const mc = tok.match(/^(mc)(.+)$/)
      if (mc) return 'Mc' + mc[2].charAt(0).toUpperCase() + mc[2].slice(1)
      // Mac + capitalised tail (>= 5 chars to avoid mangling "Mack")
      const mac = tok.match(/^(mac)(.{3,})$/)
      if (mac) return 'Mac' + mac[2].charAt(0).toUpperCase() + mac[2].slice(1)
      // Hyphen / apostrophe each component
      if (tok.includes('-') || tok.includes("'") || tok.includes('’')) {
        return tok.split(/(['’-])/).map(seg => seg.length > 1 ? seg.charAt(0).toUpperCase() + seg.slice(1) : seg).join('')
      }
      // Single-letter initial - keep upper with trailing dot if any
      if (tok.length <= 2 && /^[a-z]\.?$/.test(tok)) return tok.toUpperCase()
      return tok.charAt(0).toUpperCase() + tok.slice(1)
    })
    .join(' ')
}

// Heuristic name extractor. Looks at the first ~15 non-empty lines and
// accepts the first one that looks like a personal name and doesn't match
// the non-name header denylist. Handles ALL CAPS, middle initials, accented
// chars, hyphens, apostrophes, and Mc/Mac prefixes.
function extractRealName(cvText: string, filename: string): string | null {
  const lines = cvText.split(/\r?\n/).map(l => l.trim()).filter(Boolean).slice(0, 15)
  // 2-4 capitalised tokens (allowing ALL CAPS), optional middle initial
  // ("Jane A. Smith"), Unicode-aware letter class. Trailing punctuation
  // like (she/her) or - Title is stripped before testing in the second pass.
  const namePattern = /^(?:\p{Lu}\.?\p{Ll}*[’'\-]?\p{Lu}*\p{Ll}*|\p{Lu}{2,})(?:\s+(?:\p{Lu}\.?\p{Ll}*[’'\-]?\p{Lu}*\p{Ll}*|\p{Lu}{2,}|\p{Lu}\.))?(?:\s+(?:\p{Lu}\.?\p{Ll}*[’'\-]?\p{Lu}*\p{Ll}*|\p{Lu}{2,}|\p{Lu}\.)){0,2}$/u
  const isLikelyName = (s: string) => {
    if (!s || s.length > 60) return false
    if (NON_NAME_HEADERS.test(s)) return false
    if (s.includes('@') || /\d/.test(s)) return false
    return namePattern.test(s)
  }
  const normalise = (s: string) => {
    const trimmed = s.trim()
    return /^[A-Z\s.'’\-]+$/.test(trimmed) && trimmed === trimmed.toUpperCase() && trimmed.length > 3
      ? titleCaseName(trimmed)
      : trimmed
  }
  for (const line of lines) {
    if (isLikelyName(line)) return normalise(line)
  }
  // Pass 2 - strip parenthetical pronouns / title suffixes, then retry.
  for (const line of lines) {
    if (line.includes('@') || /\d/.test(line)) continue
    const cleaned = line
      .replace(/\([^)]*\)/g, '')
      .split(/\s[-|]\s|,/)[0]
      ?.trim()
    if (cleaned && isLikelyName(cleaned)) return normalise(cleaned)
  }
  // Filename fallback - "James_Williams_CV.pdf" -> "James Williams"
  const fromFile = filename
    .replace(/\.[^.]+$/, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\b(cv|resume|curriculum vitae|final|draft|v\d+|copy|updated)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
  if (isLikelyName(fromFile)) return normalise(fromFile)
  // Final fallback - title-case the filename if it has 2+ word-like tokens
  // even when not strictly matching the name pattern. Better to show
  // "Jane Smith-Doe" from a filename than "Candidate" or "Australian Citizen".
  const fromFileTokens = fromFile.split(/\s+/).filter(t => t.length >= 2)
  if (fromFileTokens.length >= 2 && fromFileTokens.length <= 4 && !NON_NAME_HEADERS.test(fromFile)) {
    return titleCaseName(fromFile)
  }
  return null
}

function blindNameInText(text: string, name: string | null): string {
  if (!name) return text
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp(`\\b${escaped}\\b`, 'gi')
  let blinded = text.replace(re, '[NAME]')
  // Also blind first name and last name individually in case they appear separately.
  for (const part of name.split(/\s+/)) {
    if (part.length < 3) continue
    const partRe = new RegExp(`\\b${part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g')
    blinded = blinded.replace(partRe, '[NAME]')
  }
  return blinded
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
  criteria: Rubric['criteria'],
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
              score: { type: 'number', description: 'Integer 0-5. Use 0 if there is no evidence in the CV at all. Use 2 only if a transferable skill is explicitly named in the rationale. For binary hard-gate criteria use 5 for yes, 0 for clear no.' },
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
1. Score on substance only. The candidate's name has been replaced with [NAME] in the CV. Photos, addresses, dates of birth, gender, ethnicity, school name, and graduation year MUST NOT influence the score.
2. Scoring scale (0-5):
   - 5: Strong, well-evidenced match
   - 4: Solid match, multiple evidence points
   - 3: Adequate, single clear evidence point
   - 2: Marginal evidence OR clear transferable skill identified (must name the transfer, e.g. "BA in finance ops translates to CS ops process work")
   - 1: Weak signal, mostly inferred
   - 0: NO EVIDENCE in the CV. Use 0 by default if the criterion is not addressed at all - do NOT default to 2.
3. Use 0 when the CV is silent on a criterion. Only score 2 if you can explicitly name a transferable skill from another domain that maps to this criterion. Naming the transfer is mandatory in the rationale.
4. Each non-zero score must be backed by a verbatim CV span you quote in the evidence array. A score of 0 must have an empty evidence array and the rationale "No evidence in CV".
5. For binary hard-gate criteria like AU work rights and location: score 5 if the CV indicates AU citizenship, permanent residency, valid work visa, or a current Brisbane/QLD address. Score 0 only if the CV states no work rights or is clearly overseas with no relocation indication. Score 3 with low confidence if uncertain.
6. Tenure gaps are not penalties unless the candidate had no work history. Note any reason given (caregiving, study, illness) in tenure_note rather than reducing any tenure score.
7. Use Australian English in all rationale text (organise, behaviour, recognise, optimise, minimise).
8. No em-dashes (-) or en-dashes (-) in your output. Plain hyphens only.

The criteria you must score:
${criteriaPrompt}

For candidate_label, use a generic placeholder like "Candidate" - the system already has the real name from a separate extraction pass.

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
  criteria: Rubric['criteria'],
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
