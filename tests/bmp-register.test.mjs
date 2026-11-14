// Tests for the Bare Minimum HR Processes register and its generated typed
// export (lib/bmp-register.ts). Run: node --test tests/bmp-register.test.mjs

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  CSV_PATH, OUT_PATH, COLUMNS, TRIGGER_TYPES, RISK_TIERS, SURFACES, SOURCE_TIER_RE,
  parseCsv, loadRows, buildRegisterSource,
} from '../scripts/build-bmp-register.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const csvText = readFileSync(CSV_PATH, 'utf8')
const rows = loadRows(csvText)

test('CSV has a header plus 21 well-formed records', () => {
  const records = parseCsv(csvText)
  assert.equal(records.length, 22)
  for (const rec of records) assert.equal(rec.length, COLUMNS.length)
  assert.equal(rows.length, 21)
})

test('ids are unique and sequential BMP-001..BMP-021', () => {
  const ids = rows.map(r => r.id)
  assert.equal(new Set(ids).size, ids.length)
  ids.forEach((id, i) => assert.equal(id, `BMP-${String(i + 1).padStart(3, '0')}`))
})

test('every enum value sits inside its domain', () => {
  for (const r of rows) {
    assert.ok(TRIGGER_TYPES.includes(r.trigger_type), `${r.id} trigger_type ${r.trigger_type}`)
    assert.ok(RISK_TIERS.includes(r.risk_tier), `${r.id} risk_tier ${r.risk_tier}`)
    assert.ok(SURFACES.includes(r.surface), `${r.id} surface ${r.surface}`)
    assert.match(r.source_tier, SOURCE_TIER_RE, `${r.id} source_tier`)
    assert.ok(r.lifecycle_stage.trim().length > 0, `${r.id} lifecycle_stage`)
  }
})

test('quoted fields with commas survive intact (BMP-012 dollar figures)', () => {
  // BMP-012 once broke on an unescaped high-income figure (then $183,100,
  // now $190,100 from 1 Jul 2026). Guard the comma-bearing figures it holds.
  const r = rows.find(x => x.id === 'BMP-012')
  assert.ok(r.fair_work_exposure.includes('$190,100'))
  assert.ok(r.assistant_hook.includes('$190,100'))
  assert.ok(r.hot_water_later.includes('$495,000'))
  assert.equal(r.linked_challenge_codes, 'PF3|PF4|PF5')
  assert.equal(r.prevalence, 'Med-High')
})

test('every bmp code referenced in lib/record-gaps.ts exists in the register', () => {
  const src = readFileSync(resolve(ROOT, 'lib/record-gaps.ts'), 'utf8')
  const codes = [...new Set([...src.matchAll(/bmp:\s*['"](BMP-\d{3})['"]/g)].map(m => m[1]))]
  assert.ok(codes.length > 0, 'expected at least one bmp code in record-gaps.ts')
  const ids = new Set(rows.map(r => r.id))
  for (const code of codes) assert.ok(ids.has(code), `${code} missing from register`)
})

test('lib/bmp-register.ts matches a fresh run of the build script', () => {
  // Line endings are normalised because git core.autocrlf=true checks the
  // file out as CRLF on Windows; every other byte must match.
  const lf = s => s.replace(/\r\n/g, '\n')
  assert.equal(lf(readFileSync(OUT_PATH, 'utf8')), lf(buildRegisterSource(csvText)),
    'lib/bmp-register.ts is stale - run: node scripts/build-bmp-register.mjs')
})
