// Numeric judge: extracts the first plausible number from the assistant's
// answer and compares to expectedValue within tolerance. Also supports
// string exact-match (case-insensitive, trimmed) when expectedValue is a string.

import type { GoldenQuestion, JudgeResult } from '../types'

export function judgeNumeric(question: GoldenQuestion, answer: string): JudgeResult {
  if (question.expectedType !== 'numeric') {
    return { passed: true, score: 1, notes: 'Not a numeric question — skipped.' }
  }
  const expected = question.expectedValue
  if (expected == null) {
    return { passed: false, score: 0, notes: 'Numeric question has no expectedValue.' }
  }

  if (typeof expected === 'string') {
    const ok = answer.toLowerCase().includes(expected.toLowerCase().trim())
    return {
      passed: ok,
      score: ok ? 1 : 0,
      notes: ok ? 'Expected string found.' : `Expected "${expected}" not found in answer.`,
    }
  }

  const extracted = extractFirstNumber(answer)
  if (extracted == null) {
    return { passed: false, score: 0, notes: 'No number found in answer.' }
  }
  const tol = question.numericTolerance ?? (Number.isInteger(expected) ? 0 : 0.01)
  const delta = Math.abs(extracted - expected)
  const passed = delta <= tol
  return {
    passed,
    score: passed ? 1 : Math.max(0, 1 - delta / Math.max(1, Math.abs(expected))),
    notes: `Extracted ${extracted}, expected ${expected}, Δ=${delta}, tolerance ${tol}.`,
  }
}

function extractFirstNumber(text: string): number | null {
  // Strip obvious non-value context like years in parentheses.
  const match = text.replace(/\((?:19|20)\d{2}\)/g, '').match(/-?\$?\d{1,3}(?:,\d{3})*(?:\.\d+)?|-?\d+(?:\.\d+)?/)
  if (!match) return null
  const cleaned = match[0].replace(/[$,]/g, '')
  const n = parseFloat(cleaned)
  return Number.isFinite(n) ? n : null
}
