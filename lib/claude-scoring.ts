// Humanistiqs - Claude scoring helper for HQ Recruit pre-screen videos.
// Phase 1 AI scoring. Model: claude-sonnet-4-20250514. Strict JSON output.
// Australian-compliance guardrails enforced in the system prompt.

import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export const SCORING_MODEL = 'claude-sonnet-4-20250514'

export interface RubricDimensionDef {
  name: string
  description: string
}

export interface RubricDimensionScore {
  name: string
  score: number // 1-5
  confidence: number // 0-1
  evidence_quote: string
  evidence_timestamp_sec: number
  insufficient_evidence?: boolean
}

export type RecommendationAction = 'progress_to_shortlist' | 'consider_with_caution' | 'reject'

export interface ScoreResult {
  rubric: RubricDimensionScore[]
  overall_summary: string
  recommendation_action: RecommendationAction
  recommendation_rationale: string
  raw: any
}

export const STANDARD_RUBRIC: RubricDimensionDef[] = [
  { name: 'clarity',     description: 'How clearly and coherently the candidate expresses their ideas, free of filler and rambling.' },
  { name: 'relevance',   description: 'How directly the answer addresses the specific question asked.' },
  { name: 'specificity', description: 'Level of concrete, verifiable detail (names, numbers, dates, outcomes) versus generic statements.' },
  { name: 'structure',   description: 'Logical organisation of the answer (e.g. situation-task-action-result or similar).' },
  { name: 'role_fit',    description: 'Evidence of task-relevant experience, skills or behaviour aligned with the advertised role.' },
]

export const SYSTEM_PROMPT = `You are an evidence-only scoring assistant for one-way video pre-screen interviews in Australia. Score ONLY the candidate's own transcript.

You MUST NOT infer or reference protected attributes (age, gender, ethnicity, accent, national origin, religion, disability, health, sexual orientation, family status). You MUST NOT score emotion, personality, confidence-as-a-trait, or culture fit. Score only task-relevant behaviour as evidenced by the candidate's own words in the transcript. Every score must cite a verbatim quote from the transcript and its start-second timestamp. If evidence is insufficient, return confidence < 0.5 and mark the dimension insufficient_evidence=true.

Scoring scale for every dimension: integer 1-5 where 1 = no evidence / off-topic, 3 = adequate, 5 = strong and specific evidence. Confidence is a float 0-1 reflecting how well the transcript supports the score. Evidence quotes must be VERBATIM substrings of the transcript. Timestamps must be the start-second (float, seconds from beginning) of the utterance containing the quote.

The overall_summary is 2-3 sentences, evidence-based, neutral in tone, describing observed behaviour only (no recommendations, no protected attributes, no personality inferences).

Return STRICT JSON matching the requested schema. No markdown, no preamble, no trailing commentary.`

/**
 * Score a candidate response transcript against a rubric.
 */
export async function scoreResponse(args: {
  transcript: string
  utterances: Array<{ start: number; end: number; speaker: number; transcript: string }>
  rubric: RubricDimensionDef[]
  roleTitle: string
  company: string
  questionText: string
}): Promise<ScoreResult> {
  const { transcript, utterances, rubric, roleTitle, company, questionText } = args

  const rubricDescription = rubric.map((d, i) =>
    `${i + 1}. ${d.name} - ${d.description}`
  ).join('\n')

  const schema = {
    rubric: rubric.map(d => ({
      name: d.name,
      score: 'integer 1-5',
      confidence: 'float 0-1',
      evidence_quote: 'verbatim substring of the transcript',
      evidence_timestamp_sec: 'float, start second of the utterance',
      insufficient_evidence: 'boolean, true if confidence < 0.5',
    })),
    overall_summary: 'string, 2-3 sentences, neutral, evidence-based',
    recommendation_action: 'one of: progress_to_shortlist | consider_with_caution | reject',
    recommendation_rationale: 'string, 1-2 sentences explaining the recommendation strictly from rubric scores and transcript evidence. No protected attributes, no personality inference.',
  }

  const userContent = [
    `Role: ${roleTitle} at ${company}`,
    `Question asked to candidate:\n"${questionText}"`,
    '',
    'Rubric dimensions to score (each 1-5):',
    rubricDescription,
    '',
    'Utterances (JSON) - use these timestamps for evidence_timestamp_sec:',
    JSON.stringify(utterances.slice(0, 200), null, 2),
    '',
    'Full transcript:',
    '"""',
    transcript,
    '"""',
    '',
    'Return JSON matching exactly this shape:',
    JSON.stringify(schema, null, 2),
  ].join('\n')

  const message = await anthropic.messages.create({
    model: SCORING_MODEL,
    max_tokens: 1500,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userContent }],
  })

  const text = message.content
    .filter(b => b.type === 'text')
    .map(b => (b as any).text)
    .join('')

  const clean = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()

  let parsed: any
  try {
    parsed = JSON.parse(clean)
  } catch {
    // Fallback: try to locate the first { ... } block
    const m = clean.match(/\{[\s\S]*\}/)
    if (!m) throw new Error('Claude scoring: non-JSON response')
    parsed = JSON.parse(m[0])
  }

  const rubricOut: RubricDimensionScore[] = (parsed.rubric ?? []).map((r: any) => ({
    name: String(r.name ?? ''),
    score: Math.max(1, Math.min(5, Math.round(Number(r.score) || 0))),
    confidence: Math.max(0, Math.min(1, Number(r.confidence) || 0)),
    evidence_quote: String(r.evidence_quote ?? ''),
    evidence_timestamp_sec: Number(r.evidence_timestamp_sec) || 0,
    insufficient_evidence: Boolean(r.insufficient_evidence) || (Number(r.confidence) || 0) < 0.5,
  }))

  const allowedActions: RecommendationAction[] = ['progress_to_shortlist', 'consider_with_caution', 'reject']
  const rawAction = String(parsed.recommendation_action ?? '').toLowerCase()
  const recommendation_action: RecommendationAction = (allowedActions as string[]).includes(rawAction)
    ? (rawAction as RecommendationAction)
    : (() => {
        // Fallback: derive from average score if model didn't supply.
        const scores = rubricOut.map(r => r.score)
        const avg = scores.reduce((a, b) => a + b, 0) / Math.max(1, scores.length)
        if (avg >= 4) return 'progress_to_shortlist'
        if (avg >= 3) return 'consider_with_caution'
        return 'reject'
      })()

  return {
    rubric: rubricOut,
    overall_summary: String(parsed.overall_summary ?? ''),
    recommendation_action,
    recommendation_rationale: String(parsed.recommendation_rationale ?? ''),
    raw: parsed,
  }
}
