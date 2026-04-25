#!/usr/bin/env node
// HQ.ai evaluation CLI runner.
// Usage:
//   npx tsx tests/eval/run-eval.ts [--set all|nes|award|termination_redundancy|edge]
//                                  [--limit N] [--model NAME]
//                                  [--out eval-report.json]
//                                  [--include-unreviewed]
//                                  [--previous previous-report.json]

import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'

// Load .env.local with override semantics — needed because the runner's parent
// shell may export empty placeholder values (e.g. ANTHROPIC_API_KEY=) which
// otherwise shadow the real keys in .env.local. Node's --env-file flag will
// not override existing process.env entries, so we do it ourselves.
function loadEnvLocal() {
  const envPath = path.resolve(process.cwd(), '.env.local')
  if (!fs.existsSync(envPath)) return
  const raw = fs.readFileSync(envPath, 'utf8')
  for (const line of raw.split(/\r?\n/)) {
    if (!line || /^\s*#/.test(line)) continue
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/)
    if (!m) continue
    let value = m[2]
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    process.env[m[1]] = value
  }
}
loadEnvLocal()

import { SEED_QUESTIONS } from './golden-set.seed'
import { judgeNumeric } from './judges/numeric-judge'
import { judgeNarrative } from './judges/llm-judge'
import { judgeCitation } from './judges/citation-judge'
import { buildMarkdownReport } from './report'
import type { Category, EvalRun, GoldenQuestion, RunQuestionResult } from './types'

const BASE_URL = process.env.HQAI_EVAL_BASE_URL ?? 'http://localhost:3000'
if (BASE_URL.includes('hqai.vercel.app') || BASE_URL.includes('production')) {
  console.error('Refusing to run evaluation against what looks like production. Unset HQAI_EVAL_BASE_URL or point it at a preview.')
  process.exit(1)
}

interface Args {
  set: 'all' | Category
  limit?: number
  model: string
  out: string
  includeUnreviewed: boolean
  previous?: string
}

function parseArgs(argv: string[]): Args {
  const args: Args = {
    set: 'all',
    model: 'claude-sonnet-4-20250514',
    out: 'eval-report.json',
    includeUnreviewed: false,
  }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--set') args.set = argv[++i] as Args['set']
    else if (a === '--limit') args.limit = parseInt(argv[++i], 10)
    else if (a === '--model') args.model = argv[++i]
    else if (a === '--out') args.out = argv[++i]
    else if (a === '--include-unreviewed') args.includeUnreviewed = true
    else if (a === '--previous') args.previous = argv[++i]
  }
  return args
}

async function askChat(question: string, model: string): Promise<{ text: string; citations: Array<{ n: number; label: string; url?: string }>; latencyMs: number }> {
  const started = Date.now()
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (process.env.EVAL_BYPASS_TOKEN) headers['X-Eval-Token'] = process.env.EVAL_BYPASS_TOKEN
  const res = await fetch(`${BASE_URL}/api/chat`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      module: 'people',
      messages: [{ role: 'user', content: question }],
      model,
    }),
  })
  if (!res.ok) throw new Error(`Chat API ${res.status}: ${await res.text().catch(() => '')}`)

  // Accept JSON, SSE, or plain streaming text.
  const contentType = res.headers.get('content-type') ?? ''
  let text = ''
  let citations: Array<{ n: number; label: string; url?: string }> = []
  if (contentType.includes('application/json')) {
    const data = await res.json()
    text = data.text ?? data.content ?? ''
    citations = data.citations ?? []
  } else {
    const raw = await res.text()
    // Server-Sent Events: each chunk is a line `data: {"text":"..."}` (or `data: {"citations":[...]}`).
    if (raw.includes('data: ')) {
      for (const line of raw.split(/\r?\n/)) {
        const m = line.match(/^data:\s*(.*)$/)
        if (!m) continue
        const payload = m[1].trim()
        if (!payload || payload === '[DONE]') continue
        let obj: any
        try { obj = JSON.parse(payload) } catch { continue /* non-JSON chunk */ }
        if (typeof obj.error === 'string' && obj.error) {
          const detail = typeof obj.detail === 'string' ? `: ${obj.detail}` : ''
          throw new Error(`Chat stream error: ${obj.error}${detail}`)
        }
        if (typeof obj.text === 'string') text += obj.text
        if (Array.isArray(obj.citations)) citations = obj.citations
      }
    } else {
      text = raw
    }
    // Some responses embed citations inside a fenced ```citations ... ``` block.
    const fenced = text.match(/```citations\s*([\s\S]*?)```/)
    if (fenced) {
      try { citations = JSON.parse(fenced[1]) } catch { /* ignore */ }
      text = text.replace(fenced[0], '').trim()
    }
  }
  return { text, citations, latencyMs: Date.now() - started }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const pool: GoldenQuestion[] = [...SEED_QUESTIONS]

  let candidates = pool.filter(q => args.set === 'all' || q.category === args.set)
  if (!args.includeUnreviewed) {
    const before = candidates.length
    candidates = candidates.filter(q => !!q.reviewedBy)
    const skipped = before - candidates.length
    if (skipped) console.warn(`Skipping ${skipped} unreviewed questions. Pass --include-unreviewed to include them.`)
  }
  if (args.limit) candidates = candidates.slice(0, args.limit)

  const run: EvalRun = {
    id: crypto.randomUUID(),
    startedAt: new Date().toISOString(),
    model: args.model,
    baseUrl: BASE_URL,
    results: [],
    summary: {
      total: candidates.length,
      passed: 0,
      skippedUnreviewed: args.includeUnreviewed ? 0 : (pool.filter(q => !q.reviewedBy).length),
      byCategory: {
        nes: { total: 0, passed: 0 },
        award: { total: 0, passed: 0 },
        termination_redundancy: { total: 0, passed: 0 },
        edge: { total: 0, passed: 0 },
      },
    },
  }

  for (const q of candidates) {
    process.stdout.write(`• ${q.id} ${q.category} ... `)
    let answer = ''
    let citations: Array<{ n: number; label: string; url?: string }> = []
    let latencyMs = 0
    try {
      const res = await askChat(q.question, args.model)
      answer = res.text
      citations = res.citations
      latencyMs = res.latencyMs
    } catch (err) {
      console.log(`ERROR ${(err as Error).message}`)
      run.results.push({
        question: q, answer: '', citations: [],
        judges: { fetch: { passed: false, score: 0, notes: (err as Error).message } },
        passed: false, latencyMs: 0,
      })
      continue
    }

    const judges: RunQuestionResult['judges'] = {}
    if (q.expectedType === 'numeric') judges.numeric = judgeNumeric(q, answer)
    if (q.expectedType === 'narrative') judges.narrative = await judgeNarrative(q, answer)
    judges.citation = judgeCitation(q, answer, citations)

    const passed = Object.values(judges).every(j => j.passed)
    if (passed) run.summary.passed++
    run.summary.byCategory[q.category].total++
    if (passed) run.summary.byCategory[q.category].passed++

    run.results.push({ question: q, answer, citations, judges, passed, latencyMs })
    console.log(passed ? 'PASS' : 'FAIL')
  }

  run.completedAt = new Date().toISOString()
  fs.writeFileSync(args.out, JSON.stringify(run, null, 2), 'utf8')

  const mdPath = args.out.replace(/\.json$/, '.md')
  let previous: EvalRun | undefined
  if (args.previous && fs.existsSync(args.previous)) {
    try { previous = JSON.parse(fs.readFileSync(args.previous, 'utf8')) } catch { /* ignore */ }
  }
  fs.writeFileSync(mdPath, buildMarkdownReport(run, previous), 'utf8')

  const pct = run.summary.total === 0 ? 0 : Math.round(100 * run.summary.passed / run.summary.total)
  console.log(`\nDone. ${run.summary.passed}/${run.summary.total} passed (${pct}%). Wrote ${args.out} and ${path.basename(mdPath)}.`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
