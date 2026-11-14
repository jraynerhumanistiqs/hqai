#!/usr/bin/env node
// Build lib/bmp-register.ts from the Bare Minimum HR Processes register CSV.
//
//   node scripts/build-bmp-register.mjs
//
// The CSV is the authoring source; lib/bmp-register.ts is the typed product
// export. Fields contain commas, quotes and dollar figures (BMP-012 once broke
// on an unescaped "$183,100"), so this uses a real RFC 4180 parser, never
// string splitting. The build fails loudly on any malformed row or any value
// outside its enum domain. tests/bmp-register.test.mjs checks the generated
// file has not drifted from a fresh run of this script.

import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
export const CSV_REL = 'docs/research/au-hr-recruitment-2026/bare-minimum-processes/bare_minimum_processes.csv'
export const OUT_REL = 'lib/bmp-register.ts'
export const CSV_PATH = resolve(ROOT, CSV_REL)
export const OUT_PATH = resolve(ROOT, OUT_REL)

export const COLUMNS = [
  'id', 'process', 'lifecycle_stage', 'bare_minimum_action', 'clock_trigger', 'cadence',
  'common_mistake', 'hot_water_later', 'fair_work_exposure', 'linked_challenge_codes',
  'linked_template_ids', 'prevalence', 'assistant_hook', 'source_tier',
  'trigger_type', 'risk_tier', 'surface',
]

// Fixed domains (CATEGORISATION-ANALYSIS.md section 5).
export const TRIGGER_TYPES = ['per_hire', 'tenure_countdown', 'payroll_cycle', 'calendar', 'event', 'standing']
export const RISK_TIERS = ['critical', 'high', 'moderate']
export const SURFACES = ['checklist', 'countdown', 'recurring', 'calendar', 'playbook', 'status']
export const SOURCE_TIER_RE = /^T[1-3]$/

/**
 * RFC 4180 parser. Returns an array of records (arrays of strings).
 * Handles quoted fields with embedded commas, doubled quotes and newlines,
 * and both CRLF and LF record separators. A trailing newline does not
 * produce an empty record.
 */
export function parseCsv(text) {
  const records = []
  let record = []
  let field = ''
  let inQuotes = false
  let i = text.charCodeAt(0) === 0xfeff ? 1 : 0
  const n = text.length
  while (i < n) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; continue }
        inQuotes = false; i++; continue
      }
      field += c; i++; continue
    }
    if (c === '"') {
      if (field !== '') throw new Error(`CSV: stray quote mid-field at offset ${i}`)
      inQuotes = true; i++; continue
    }
    if (c === ',') { record.push(field); field = ''; i++; continue }
    if (c === '\r' || c === '\n') {
      record.push(field); records.push(record); record = []; field = ''
      i += c === '\r' && text[i + 1] === '\n' ? 2 : 1
      continue
    }
    field += c; i++
  }
  if (inQuotes) throw new Error('CSV: unterminated quoted field')
  if (field !== '' || record.length) { record.push(field); records.push(record) }
  return records
}

const camel = s => s.replace(/_([a-z])/g, (_, ch) => ch.toUpperCase())

/** Parse + validate the CSV text into plain row objects keyed by CSV column. */
export function loadRows(csvText) {
  const [header, ...body] = parseCsv(csvText)
  if (header.join(',') !== COLUMNS.join(',')) {
    throw new Error(`CSV header mismatch:\n  got      ${header.join(',')}\n  expected ${COLUMNS.join(',')}`)
  }
  const rows = body.map((rec, idx) => {
    if (rec.length !== COLUMNS.length) {
      throw new Error(`CSV row ${idx + 2}: ${rec.length} fields, expected ${COLUMNS.length}`)
    }
    return Object.fromEntries(COLUMNS.map((col, j) => [col, rec[j].replace(/\r\n/g, '\n')]))
  })
  rows.forEach((r, idx) => {
    const want = `BMP-${String(idx + 1).padStart(3, '0')}`
    if (r.id !== want) throw new Error(`Row ${idx + 2}: id ${r.id}, expected ${want} (ids must be sequential)`)
    const check = (col, domain) => {
      if (!domain.includes(r[col])) throw new Error(`${r.id}: ${col} "${r[col]}" not in ${domain.join('/')}`)
    }
    check('trigger_type', TRIGGER_TYPES)
    check('risk_tier', RISK_TIERS)
    check('surface', SURFACES)
    if (!SOURCE_TIER_RE.test(r.source_tier)) throw new Error(`${r.id}: source_tier "${r.source_tier}" invalid`)
    if (!r.lifecycle_stage.trim()) throw new Error(`${r.id}: empty lifecycle_stage`)
  })
  return rows
}

const lit = v => (Array.isArray(v) ? `[${v.map(x => JSON.stringify(x)).join(", ")}]` : JSON.stringify(v))
const union = values => [...new Set(values)].sort().map(v => `  | ${lit(v)}`).join('\n')

const FIELD_TYPES = {
  id: 'BmpId',
  lifecycleStage: 'BmpLifecycleStage',
  triggerType: 'BmpTriggerType',
  riskTier: 'BmpRiskTier',
  surface: 'BmpSurface',
  sourceTier: 'BmpSourceTier',
}

/** Render the full lib/bmp-register.ts source (LF line endings). */
export function buildRegisterSource(csvText) {
  const rows = loadRows(csvText)
  const keys = COLUMNS.map(camel)
  const out = [
    `// GENERATED from ${CSV_REL} by scripts/build-bmp-register.mjs - do not hand-edit.`,
    '// Edit the CSV, then run: node scripts/build-bmp-register.mjs',
    '//',
    '// Bare Minimum HR Processes register. triggerType is the primary navigation',
    '// axis, riskTier the sort order and badge, surface the UI treatment - see',
    '// CATEGORISATION-ANALYSIS.md beside the CSV. These are operational reminders',
    '// for the clock, not employment-law advice.',
    '',
    `export const BMP_TRIGGER_TYPES = ${lit(TRIGGER_TYPES)} as const`,
    `export const BMP_RISK_TIERS = ${lit(RISK_TIERS)} as const`,
    `export const BMP_SURFACES = ${lit(SURFACES)} as const`,
    '',
    'export type BmpTriggerType = (typeof BMP_TRIGGER_TYPES)[number]',
    'export type BmpRiskTier = (typeof BMP_RISK_TIERS)[number]',
    'export type BmpSurface = (typeof BMP_SURFACES)[number]',
    '',
    `export type BmpLifecycleStage =\n${union(rows.map(r => r.lifecycle_stage))}`,
    '',
    `export type BmpSourceTier =\n${union(rows.map(r => r.source_tier))}`,
    '',
    `export type BmpId =\n${union(rows.map(r => r.id))}`,
    '',
    'export interface BmpProcess {',
    ...keys.map(k => `  readonly ${k}: ${FIELD_TYPES[k] ?? 'string'}`),
    '}',
    '',
    'export const BMP_REGISTER: readonly BmpProcess[] = [',
  ]
  for (const r of rows) {
    out.push('  {')
    COLUMNS.forEach((col, j) => out.push(`    ${keys[j]}: ${lit(r[col])},`))
    out.push('  },')
  }
  out.push(
    ']',
    '',
    'const BY_ID: ReadonlyMap<string, BmpProcess> = new Map(BMP_REGISTER.map(p => [p.id, p]))',
    '',
    '/** Look up a process by its BMP code (e.g. "BMP-001"). Returns undefined if unknown. */',
    'export function bmpById(id: string): BmpProcess | undefined {',
    '  return BY_ID.get(id)',
    '}',
    '',
  )
  return out.join('\n')
}

function main() {
  const src = buildRegisterSource(readFileSync(CSV_PATH, 'utf8'))
  writeFileSync(OUT_PATH, src)
  const count = (src.match(/^ {4}id: /gm) || []).length
  console.log(`Wrote ${OUT_REL} (${count} processes)`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main()
