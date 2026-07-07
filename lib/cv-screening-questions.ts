// Shared per-candidate screening-question generation.
//
// Used by both the single-candidate handoff
// (app/api/cv-screening/handoff/route.ts) and the bulk batch-handoff
// (app/api/cv-screening/batch-handoff/route.ts) so a candidate gets the
// same "probe their weakest CV criteria" treatment regardless of which
// flow sent them to the Shortlist Agent. Extracted here so both routes
// call one implementation instead of drifting apart.

import Anthropic from '@anthropic-ai/sdk'
import { CLAUDE_MODEL } from '@/lib/ai-models'
import type { CandidateScreening, CriterionScore, Rubric } from '@/lib/cv-screening-types'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const MODEL = CLAUDE_MODEL

/**
 * Generate 5 pre-screen questions targeted at a single candidate's
 * weakest scoring criteria, so their video/phone answers fill in what the
 * CV did not show.
 */
export async function generateTargetedQuestions(
  s: CandidateScreening,
  role: string,
  criteria: Rubric['criteria'],
): Promise<string[]> {
  // Find the 3-4 weakest criteria - these are the candidate's gaps and the
  // questions should probe them so the video answers fill in what the CV
  // didn't show. Skip hard-gate binary criteria (location etc) since those
  // are yes/no, not interview material.
  const gaps = (s.criteria_scores as CriterionScore[])
    .filter(cs => {
      const c = criteria.find(x => x.id === cs.id)
      return c && c.type === 'ordinal_5' && cs.score <= 3
    })
    .sort((a, b) => a.score - b.score)
    .slice(0, 4)

  const strengths = (s.criteria_scores as CriterionScore[])
    .filter(cs => {
      const c = criteria.find(x => x.id === cs.id)
      return c && c.type === 'ordinal_5' && cs.score >= 4
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)

  const labelFor = (id: string) => criteria.find(c => c.id === id)?.label ?? id

  const gapLines = gaps.map(g => `- ${labelFor(g.id)} (scored ${g.score}/5)`).join('\n')
  const strengthLines = strengths.map(g => `- ${labelFor(g.id)} (scored ${g.score}/5)`).join('\n')

  const tool = {
    name: 'submit_questions',
    description: 'Return 5 video pre-screen questions targeting the candidate\'s gaps.',
    input_schema: {
      type: 'object' as const,
      properties: {
        questions: {
          type: 'array',
          items: { type: 'string' },
          description: 'Exactly 5 questions, each answerable in 60-120 seconds.',
        },
      },
      required: ['questions'],
    },
  }

  const res = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: `You are a senior Australian recruiter writing video pre-screen questions for a ${role} candidate. The CV scorer flagged specific gaps - your questions must directly probe those gaps so the video answer can fill in what the CV could not show.

Rules:
- 5 questions only.
- Each answerable in 60-120 seconds.
- Conversational, warm but professional, plain English.
- Mix: 2 questions on the weakest criteria (probe directly with situational prompts), 2 on the next-weakest (probe with examples), 1 on motivation/working style.
- Australian English (organise, behaviour). No em-dashes or en-dashes.
- Do not repeat what's already on the CV. Ask for things the CV did not show.`,
    tools: [tool],
    tool_choice: { type: 'tool', name: 'submit_questions' },
    messages: [{
      role: 'user',
      content: `Candidate: ${s.candidate_label}
Role: ${role}
Overall score: ${s.overall_score}
Recommended next step: ${s.next_action}

Gaps to probe (lowest-scoring criteria):
${gapLines || '(none flagged)'}

Strengths to confirm (don't re-test, just lightly verify):
${strengthLines || '(none flagged)'}

Coach summary: ${s.rationale_short}`,
    }],
  })

  const toolBlock = res.content.find(b => b.type === 'tool_use')
  if (!toolBlock || toolBlock.type !== 'tool_use') {
    throw new Error('Question generator did not return tool_use')
  }
  const input = toolBlock.input as { questions?: string[] }
  return Array.isArray(input.questions) ? input.questions.map(q => String(q).trim()).filter(Boolean) : []
}
