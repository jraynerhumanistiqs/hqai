// LLM rubric judge — Claude Haiku scores narrative answers against
// mustInclude / mustNotInclude. Cached on disk by sha256 of inputs to
// avoid duplicate billable calls on reruns.

import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import Anthropic from '@anthropic-ai/sdk'
import type { GoldenQuestion, JudgeResult } from '../types'

const JUDGE_MODEL = 'claude-haiku-4-20250514'
const CACHE_DIR = path.join(__dirname, '..', '.cache')

export async function judgeNarrative(question: GoldenQuestion, answer: string): Promise<JudgeResult> {
  if (question.expectedType !== 'narrative' || !question.expectedRubric) {
    return { passed: true, score: 1, notes: 'Not a narrative question — skipped.' }
  }

  const rubric = question.expectedRubric
  const inputHash = sha256(JSON.stringify({ q: question.question, a: answer, r: rubric }))
  const cached = readCache(inputHash)
  if (cached) return cached

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return { passed: false, score: 0, notes: 'ANTHROPIC_API_KEY not set — judge skipped.' }
  }
  const client = new Anthropic({ apiKey })

  const prompt = `You are an evaluator scoring an AI HR advisor's answer.

QUESTION:
${question.question}

ANSWER:
${answer}

SCORING RUBRIC:
- mustInclude (answer must convey these facts/phrases — semantic match OK, not literal):
${rubric.mustInclude.map(s => `  - ${s}`).join('\n')}
${rubric.mustNotInclude?.length ? `- mustNotInclude (MUST be absent — wrong-jurisdiction or dangerous):\n${rubric.mustNotInclude.map(s => `  - ${s}`).join('\n')}` : ''}

Return ONLY compact JSON: {"passed": boolean, "score": number between 0 and 1, "notes": "one-line explanation"}`

  try {
    const res = await client.messages.create({
      model: JUDGE_MODEL,
      max_tokens: 400,
      messages: [{ role: 'user', content: prompt }],
    })
    const text = res.content.filter(b => b.type === 'text').map(b => (b as { type: 'text'; text: string }).text).join('')
    const json = extractJson(text)
    const parsed = JSON.parse(json) as JudgeResult
    const normalised: JudgeResult = {
      passed: !!parsed.passed,
      score: clamp01(Number(parsed.score)),
      notes: String(parsed.notes ?? '').slice(0, 500),
    }
    writeCache(inputHash, normalised)
    return normalised
  } catch (err) {
    return {
      passed: false,
      score: 0,
      notes: `LLM judge error: ${(err as Error).message}`,
    }
  }
}

function sha256(s: string) {
  return crypto.createHash('sha256').update(s).digest('hex')
}

function readCache(hash: string): JudgeResult | null {
  try {
    const file = path.join(CACHE_DIR, `${hash}.json`)
    if (!fs.existsSync(file)) return null
    return JSON.parse(fs.readFileSync(file, 'utf8')) as JudgeResult
  } catch { return null }
}

function writeCache(hash: string, result: JudgeResult) {
  try {
    fs.mkdirSync(CACHE_DIR, { recursive: true })
    fs.writeFileSync(path.join(CACHE_DIR, `${hash}.json`), JSON.stringify(result))
  } catch { /* ignore cache write failure */ }
}

function extractJson(text: string): string {
  const m = text.match(/\{[\s\S]*\}/)
  return m ? m[0] : text
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.min(1, n))
}
