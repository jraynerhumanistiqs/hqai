// Shared CV scoring core. Used by both:
//   POST /api/cv-screening/score        - first-pass score on upload
//   POST /api/cv-screening/screenings/[id]/rescore - re-score an
//        existing screening against a newer rubric version
// Extracted from app/api/cv-screening/score/route.ts so both callers
// run the identical Claude tool-call + computeOverall pipeline. Keep
// the route handler as the only place that does file extraction and
// DB persistence; this module is pure: cvText + rubric -> ScoreResult.

import Anthropic from '@anthropic-ai/sdk'
import type {
  CriterionScore,
  Rubric,
} from '@/lib/cv-screening-types'
import { CLAUDE_MODEL } from '@/lib/ai-models'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const MODEL = CLAUDE_MODEL

export interface ScoreResult {
  candidate_label: string
  candidate_email?: string | null
  criteria_scores: CriterionScore[]
  rationale_short: string
  tenure_note?: string | null
}

// Heuristic email pull from raw CV text. Run BEFORE blindPII so we
// capture the candidate's real email before the masker rewrites it
// to [EMAIL]. Used by score/route.ts to persist candidate_email on
// the cv_screenings row so video-interview invites can be addressed
// without the recruiter retyping the email.
export function extractEmail(rawCvText: string): string | null {
  const match = rawCvText.match(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i)
  return match?.[0] ?? null
}

// Light-touch PII redaction. Pre-empts the obvious leaks before the
// model even sees the CV. Mirrors the scrubber that previously lived
// in score/route.ts so the rescore endpoint applies the same masking.
export function blindPII(text: string): string {
  return text
    .replace(/\b\d{3}\s?\d{3}\s?\d{3,4}\b/g, '[PHONE]')
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[EMAIL]')
    .replace(/\b\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\b/g, '[CARD]')
    .replace(/Date of Birth[:\s]*\S+/gi, 'Date of Birth: [REDACTED]')
    .replace(/DOB[:\s]*\S+/gi, 'DOB: [REDACTED]')
}

export function blindNameInText(text: string, name: string | null): string {
  if (!name) return text
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp(`\\b${escaped}\\b`, 'gi')
  let blinded = text.replace(re, '[NAME]')
  for (const part of name.split(/\s+/)) {
    if (part.length < 3) continue
    const partRe = new RegExp(`\\b${part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g')
    blinded = blinded.replace(partRe, '[NAME]')
  }
  return blinded
}

export async function scoreCv(
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
5. Binary hard-gate criteria (AU work rights and location) are eligibility CONSIDERATIONS, not merit. They do NOT change the candidate's overall score - a recruiter confirms them separately - so judge eligibility generously:
   - Score 5 (eligible) if the CV shows the right to work in Australia (citizenship, permanent residency, or a valid work visa), REGARDLESS of which state they currently live in. Being interstate is not a fail: someone in Victoria with full AU work rights applying for a Brisbane role is eligible - relocation is the candidate's choice to make.
   - Score 3 (unclear) if work rights or willingness to relocate cannot be determined from the CV. Interstate with no stated relocation intent is unclear, not a no.
   - Score 0 (not eligible) only if the CV explicitly states no Australian work rights, or explicitly rules out the location/relocation.
   - Never penalise a candidate's location on its own.
6. Tenure gaps are not penalties unless the candidate had no work history. Note any reason given (caregiving, study, illness) in tenure_note rather than reducing any tenure score.
7. Use Australian English in all rationale text (organise, behaviour, recognise, optimise, minimise).
8. No em-dashes or en-dashes in your output. Plain hyphens only.

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
  const rawScores = Array.isArray(input.criteria_scores) ? input.criteria_scores : []
  const criteria_scores: CriterionScore[] = rawScores.map((c: { id?: unknown; score?: unknown; confidence?: unknown; evidence?: unknown; rationale?: unknown }) => ({
    id: String(c.id),
    score: Number(c.score) || 1,
    confidence: Number(c.confidence) || 0,
    evidence: Array.isArray(c.evidence)
      ? (c.evidence as Array<{ text?: unknown }>).map(e => ({ text: String(e.text ?? '') }))
      : [],
    rationale: c.rationale ? String(c.rationale) : undefined,
  }))

  return {
    candidate_label,
    candidate_email: null,
    criteria_scores,
    rationale_short,
    tenure_note: tenure_note || null,
  }
}

// Weighted merit score. Hard-gate criteria (location / work rights) are
// deliberately EXCLUDED: they are assessed and surfaced post-score as a
// "consideration" the recruiter confirms, not folded into the number.
// This stops an interstate candidate with full work rights and intent to
// relocate from scoring lower on merit than a local one. The remaining
// criteria re-normalise across their own weights (we divide by the sum of
// the weights actually scored), so dropping a gate doesn't deflate scores.
export function computeOverall(
  scores: CriterionScore[],
  criteria: Rubric['criteria'],
): number {
  const cList = criteria as Array<{ id: string; weight: number; hard_gate?: boolean }>
  let weighted = 0
  let totalWeight = 0
  for (const c of cList) {
    if (c.hard_gate) continue
    const found = scores.find(s => s.id === c.id)
    if (!found) continue
    weighted += found.score * c.weight
    totalWeight += c.weight
  }
  if (totalWeight === 0) return 0
  return Number(((weighted / totalWeight)).toFixed(2))
}
