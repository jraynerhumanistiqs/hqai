// Deterministic integrity check for the adapted AU industry rubric library.
// Run: node_modules/.bin/tsx scripts/validate-au-rubrics.ts
import { INDUSTRY_RUBRICS, INDUSTRY_TO_RUBRIC_IDS } from '../lib/rubrics-au'
import { ALL_RUBRICS } from '../lib/cv-screening-rubrics'

const DASHBOARD_INDUSTRIES = [
  'Retail', 'Hospitality & Food Service', 'Healthcare & Aged Care', 'Pharmacy',
  'Construction & Trades', 'Professional Services', 'Education & Childcare',
  'Community Services & NFP', 'Technology',
]

let failures = 0
const fail = (m: string) => { console.error('  FAIL: ' + m); failures++ }

// 1. Every dashboard industry (except "Other") is covered by >=1 rubric.
for (const ind of DASHBOARD_INDUSTRIES) {
  const ids = INDUSTRY_TO_RUBRIC_IDS[ind]
  if (!ids || !ids.length) fail(`no rubric for industry "${ind}"`)
}

// 2. Every industry rubric is served live via ALL_RUBRICS.
for (const r of INDUSTRY_RUBRICS) {
  if (!ALL_RUBRICS.find(x => x.rubric_id === r.rubric_id)) fail(`${r.rubric_id} missing from ALL_RUBRICS`)
}

// 3. No duplicate rubric ids.
const ids = INDUSTRY_RUBRICS.map(r => r.rubric_id)
if (new Set(ids).size !== ids.length) fail('duplicate rubric_id(s) present')

// 4. Per-rubric structural checks.
for (const r of INDUSTRY_RUBRICS) {
  const gateCrit = r.criteria.filter(c => c.hard_gate).map(c => c.id).sort()
  const gateDecl = [...r.hard_gates].sort()
  if (JSON.stringify(gateCrit) !== JSON.stringify(gateDecl)) fail(`${r.rubric_id}: hard_gates ${JSON.stringify(gateDecl)} != flagged ${JSON.stringify(gateCrit)}`)

  for (const c of r.criteria.filter(c => c.hard_gate)) {
    if (c.type !== 'binary') fail(`${r.rubric_id}: gate ${c.id} not binary`)
    if (c.id !== 'work_eligibility' && (!c.gate_tokens || !c.gate_tokens.length)) fail(`${r.rubric_id}: gate ${c.id} has no gate_tokens`)
  }
  if (!r.criteria.find(c => c.id === 'work_eligibility' && c.hard_gate)) fail(`${r.rubric_id}: no work_eligibility gate`)

  if (!r.industry || !DASHBOARD_INDUSTRIES.includes(r.industry)) fail(`${r.rubric_id}: industry not a dashboard label`)

  // Merit criteria weights should sum to ~1.0 (max_points/100).
  const nonGate = r.criteria.filter(c => !c.hard_gate)
  const sum = nonGate.reduce((a, c) => a + c.weight, 0)
  if (nonGate.length === 0) fail(`${r.rubric_id}: no merit criteria`)
  if (Math.abs(sum - 1) > 0.02) fail(`${r.rubric_id}: merit weight sum ${sum.toFixed(3)} (expected ~1.0)`)

  // Anti-spoofing narrative present.
  const g = r.execution_guard
  if (!g || !(g.executed_within || g.supervised_within)) fail(`${r.rubric_id}: no execution_guard narrative`)

  if (r.minimum_score_to_advance < 2 || r.minimum_score_to_advance > 4) fail(`${r.rubric_id}: advance threshold ${r.minimum_score_to_advance} out of 0-5 range`)
}

// 5. Report a per-industry summary.
console.log('Adapted AU rubric library:\n')
for (const ind of DASHBOARD_INDUSTRIES) {
  const rs = INDUSTRY_RUBRICS.filter(r => r.industry === ind)
  console.log(`${ind} (${rs.length}):`)
  for (const r of rs) {
    const gates = r.criteria.filter(c => c.hard_gate).map(c => c.id)
    const merit = r.criteria.filter(c => !c.hard_gate)
    const awards = (r.governing_awards ?? []).map(a => a.code).join('/')
    console.log(`  - ${r.role}  [${r.rubric_id}]  award=${awards} merit=${merit.length} gates=[${gates.join(',')}] advance=${r.minimum_score_to_advance}`)
  }
}

console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : failures + ' CHECK(S) FAILED'} across ${INDUSTRY_RUBRICS.length} rubrics / ${DASHBOARD_INDUSTRIES.length} industries.`)
process.exit(failures === 0 ? 0 : 1)
