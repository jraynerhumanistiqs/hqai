// Turn an EvalRun into a markdown report. Optionally diffs against a
// previous run (by id or timestamp) and highlights regressions.

import type { Category, EvalRun, RunQuestionResult } from './types'

const CATEGORY_LABELS: Record<Category, string> = {
  nes: 'NES',
  award: 'Modern Awards',
  termination_redundancy: 'Termination / Redundancy',
  edge: 'Edge Cases',
}

export function buildMarkdownReport(run: EvalRun, previous?: EvalRun): string {
  const { summary, results, startedAt, completedAt, model } = run
  const pct = summary.total ? Math.round(100 * summary.passed / summary.total) : 0
  const lines: string[] = []

  lines.push(`# HQ.ai Evaluation Report`)
  lines.push('')
  lines.push(`- **Run started:** ${startedAt}`)
  if (completedAt) lines.push(`- **Completed:** ${completedAt}`)
  lines.push(`- **Model:** ${model}`)
  lines.push(`- **Base URL:** ${run.baseUrl}`)
  lines.push(`- **Total:** ${summary.total} | **Passed:** ${summary.passed} (${pct}%) | **Skipped (unreviewed):** ${summary.skippedUnreviewed}`)
  lines.push('')

  lines.push(`## Per-category`)
  lines.push('')
  lines.push('| Category | Passed | Total | Rate |')
  lines.push('|---|---:|---:|---:|')
  for (const cat of Object.keys(CATEGORY_LABELS) as Category[]) {
    const c = summary.byCategory[cat]
    const rate = c.total ? `${Math.round(100 * c.passed / c.total)}%` : '—'
    lines.push(`| ${CATEGORY_LABELS[cat]} | ${c.passed} | ${c.total} | ${rate} |`)
  }
  lines.push('')

  const failing = results.filter(r => !r.passed)
  if (failing.length) {
    lines.push(`## Top failing questions (${failing.length})`)
    lines.push('')
    for (const r of failing.slice(0, 20)) {
      lines.push(renderFailure(r))
      lines.push('')
    }
  }

  if (previous) {
    lines.push(`## Diff vs previous run`)
    lines.push('')
    const prevPct = previous.summary.total ? Math.round(100 * previous.summary.passed / previous.summary.total) : 0
    const delta = pct - prevPct
    const symbol = delta > 0 ? '▲' : delta < 0 ? '▼' : '='
    lines.push(`- Overall: ${prevPct}% → ${pct}% ${symbol} ${delta >= 0 ? '+' : ''}${delta}pp`)
    const prevById = new Map(previous.results.map(r => [r.question.id, r]))
    const regressions = results.filter(r => {
      const p = prevById.get(r.question.id)
      return p?.passed && !r.passed
    })
    if (regressions.length) {
      lines.push(`- **Regressions** (${regressions.length}):`)
      for (const r of regressions) lines.push(`  - \`${r.question.id}\` — ${r.question.question}`)
    }
  }

  return lines.join('\n')
}

function renderFailure(r: RunQuestionResult): string {
  const badges = Object.entries(r.judges)
    .map(([name, j]) => `${name}: ${j.passed ? '✓' : '✗'}`)
    .join(' | ')
  const firstFail = Object.values(r.judges).find(j => !j.passed)
  const excerpt = r.answer.length > 200 ? r.answer.slice(0, 197) + '…' : r.answer
  return [
    `### \`${r.question.id}\` — ${r.question.category}`,
    `**Q:** ${r.question.question}`,
    `**A:** ${excerpt || '(empty)'}`,
    `**Judges:** ${badges}`,
    firstFail ? `**First failure:** ${firstFail.notes}` : '',
  ].filter(Boolean).join('  \n')
}
