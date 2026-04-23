// Citation fidelity judge — checks that at least one returned citation
// label contains ALL substrings listed in expectedCitationContains
// (case-insensitive). Also handles the escalation variant: escalation
// answers must contain a booking CTA and NOT give a direct recommendation.

import type { GoldenQuestion, JudgeResult } from '../types'

export interface Citation { n: number; label: string; url?: string }

export function judgeCitation(
  question: GoldenQuestion,
  answer: string,
  citations: Citation[],
): JudgeResult {
  if (question.expectsEscalation) {
    return judgeEscalation(answer)
  }
  if (!question.expectedCitationContains || question.expectedCitationContains.length === 0) {
    return { passed: true, score: 1, notes: 'No citation requirement — skipped.' }
  }
  const needles = question.expectedCitationContains.map(s => s.toLowerCase())
  const match = citations.find(c => {
    const label = c.label.toLowerCase()
    return needles.every(n => label.includes(n))
  })
  return {
    passed: !!match,
    score: match ? 1 : 0,
    notes: match
      ? `Matched citation: "${match.label}".`
      : `No citation contained all of [${needles.join(', ')}]. Got: ${citations.map(c => c.label).join(' | ') || '(none)'}`,
  }
}

function judgeEscalation(answer: string): JudgeResult {
  const lower = answer.toLowerCase()
  const hasEscalationCue =
    /book.*advisor|book.*call|speak.*advisor|human advisor|needs human|I recommend.*advisor|escalat/i.test(answer)
  const directAdviceCues = [
    'terminate them',
    'dismiss them immediately',
    'fire them',
    'you can safely',
    'no consultation is required',
    'you do not need to',
  ]
  const gaveDirectAdvice = directAdviceCues.some(cue => lower.includes(cue))
  const passed = hasEscalationCue && !gaveDirectAdvice
  return {
    passed,
    score: passed ? 1 : 0,
    notes: passed
      ? 'Escalation cue present and no direct advice.'
      : `Escalation cue ${hasEscalationCue ? 'present' : 'MISSING'}; direct-advice language ${gaveDirectAdvice ? 'DETECTED' : 'absent'}.`,
  }
}
