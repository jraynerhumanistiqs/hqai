// Generate the CLIENT-SAFE rubric summaries file.
//
// Run: node_modules/.bin/tsx scripts/gen-rubric-summaries.ts
//
// Why: the full library (data/rubrics/au-industry-role-rubrics.json via
// lib/rubrics-au) plus the taxonomy carry heavy, server-only metadata
// (anchors, gate_tokens, execution_tokens, execution guards, sources,
// governing_awards, mandatory_gatekeepers, penalty_overrides, hard_caps,
// software_ecosystem). The CV-screening client only renders each rubric's
// role + criteria {id,label,weight,type,hard_gate}. Bundling the whole
// library into the browser was pure bloat.
//
// This script emits data/rubrics/rubric-summaries.json - a valid Rubric[]
// stripped to exactly what the client needs - so client components import the
// small summaries file and the full library stays server-side (adapter +
// scorer + API routes only). Re-run this whenever the rubric library changes.
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { ALL_RUBRICS } from '../lib/cv-screening-rubrics'
import type { Rubric } from '../lib/cv-screening-types'

const summaries: Rubric[] = ALL_RUBRICS.map(r => ({
  rubric_id: r.rubric_id,
  role: r.role,
  country: r.country,
  version: r.version,
  minimum_score_to_advance: r.minimum_score_to_advance,
  hard_gates: r.hard_gates,
  // industry is a lightweight label the client can group by; keep it.
  ...(r.industry ? { industry: r.industry } : {}),
  // Criteria stripped to what the client renders (weighting bars + gate
  // labels + consideration derivation). Drops anchors, gate_tokens,
  // execution_tokens/cap, oversight_signals, fairness_flag, evidence_required.
  criteria: r.criteria.map(c => ({
    id: c.id,
    label: c.label,
    weight: c.weight,
    type: c.type,
    ...(c.hard_gate ? { hard_gate: true } : {}),
  })),
}))

const outPath = join(process.cwd(), 'data', 'rubrics', 'rubric-summaries.json')
writeFileSync(outPath, JSON.stringify(summaries, null, 2) + '\n', 'utf8')
console.log(`Wrote ${summaries.length} rubric summaries to ${outPath}`)
