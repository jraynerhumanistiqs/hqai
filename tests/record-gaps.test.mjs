// Unit tests for the evidence-gap indicator.
//
// Pure logic re-implemented here (lib/ is TypeScript; this runs under plain
// `node --test` like the project's other smoke tests). Keep in sync with
// lib/record-gaps.ts. Run: node --test tests/record-gaps.test.mjs

import { test } from 'node:test'
import assert from 'node:assert/strict'

function monthsOfService(startDate, asOf) {
  const start = new Date(startDate + 'T00:00:00')
  let m = (asOf.getFullYear() - start.getFullYear()) * 12 + (asOf.getMonth() - start.getMonth())
  if (asOf.getDate() < start.getDate()) m -= 1
  return Math.max(0, m)
}
const minPeriod = h => (h < 15 ? 12 : 6)

const REQ = {
  contract:      { events: ['contract_issued'], docTypes: ['employment-contract', 'contract', 'letter-of-offer'] },
  fwis:          { events: ['fwis_provided'], docTypes: [] },
  ceis:          { events: ['ceis_provided'], docTypes: [] },
  ftcis:         { events: ['ftcis_provided'], docTypes: [] },
  right_to_work: { events: ['right_to_work_check'], docTypes: [] },
  super_choice:  { events: ['super_choice'], docTypes: [] },
  contractor_agreement: { events: ['contractor_agreement'], docTypes: ['contractor-agreement'] },
  probation_review: { events: ['probation_review', 'probation_decision'], docTypes: ['probationary-period-review-form'] },
}
function requirementsFor(type) {
  switch (type) {
    case 'casual':     return ['contract', 'fwis', 'ceis', 'right_to_work', 'super_choice']
    case 'fixed_term': return ['contract', 'fwis', 'ftcis', 'right_to_work', 'super_choice']
    case 'contractor': return ['contractor_agreement', 'right_to_work']
    default:           return ['contract', 'fwis', 'right_to_work', 'super_choice', 'probation_review']
  }
}
function computeGaps(employee, events, docTypes, headcount, now = new Date()) {
  const ev = new Set(events.map(e => e.event_type))
  const docs = new Set(docTypes.map(d => d.toLowerCase()))
  const items = requirementsFor(employee.employment_type).map(key => {
    const r = REQ[key]
    let via
    if (r.events.some(t => ev.has(t))) via = 'event'
    else if (r.docTypes.some(t => docs.has(t))) via = 'document'
    const item = { key, satisfied: Boolean(via), via }
    if (key === 'probation_review' && !item.satisfied) {
      const months = monthsOfService(employee.start_date, now)
      if (months < 1 || months >= minPeriod(headcount)) item.notYetDue = true
    }
    return item
  })
  const counted = items.filter(i => !i.notYetDue)
  return {
    items,
    satisfied: counted.filter(i => i.satisfied).length,
    total: counted.length,
    missing: counted.filter(i => !i.satisfied),
  }
}

const NOW = new Date('2026-09-15T00:00:00')

test('a brand-new full-timer with nothing on file shows every per-hire gap', () => {
  const g = computeGaps({ employment_type: 'full_time', start_date: '2026-09-01' }, [], [], 8, NOW)
  // probation not yet due (under 1 month), so 4 counted, all missing
  assert.equal(g.total, 4)
  assert.equal(g.satisfied, 0)
  assert.equal(g.missing.length, 4)
})

test('an event satisfies a requirement', () => {
  const g = computeGaps({ employment_type: 'full_time', start_date: '2026-09-01' },
    [{ event_type: 'fwis_provided' }], [], 8, NOW)
  assert.equal(g.items.find(i => i.key === 'fwis').satisfied, true)
  assert.equal(g.items.find(i => i.key === 'fwis').via, 'event')
})

test('a linked document of the right type satisfies the contract requirement', () => {
  const g = computeGaps({ employment_type: 'full_time', start_date: '2026-09-01' },
    [], ['employment-contract'], 8, NOW)
  const c = g.items.find(i => i.key === 'contract')
  assert.equal(c.satisfied, true)
  assert.equal(c.via, 'document')
})

test('document matching is case-insensitive and ignores unrelated docs', () => {
  const g = computeGaps({ employment_type: 'full_time', start_date: '2026-09-01' },
    [], ['Employment-Contract', 'warning-letter'], 8, NOW)
  assert.equal(g.items.find(i => i.key === 'contract').satisfied, true)
})

test('casuals additionally need the CEIS; fixed-term additionally need the FTCIS', () => {
  const cas = computeGaps({ employment_type: 'casual', start_date: '2026-03-01' }, [], [], 8, NOW)
  assert.ok(cas.items.some(i => i.key === 'ceis'))
  assert.ok(!cas.items.some(i => i.key === 'ftcis'))
  const ft = computeGaps({ employment_type: 'fixed_term', start_date: '2026-03-01' }, [], [], 8, NOW)
  assert.ok(ft.items.some(i => i.key === 'ftcis'))
  assert.ok(!ft.items.some(i => i.key === 'ceis'))
})

test('contractors are not asked for a FWIS (it does not apply to them)', () => {
  const g = computeGaps({ employment_type: 'contractor', start_date: '2026-03-01' }, [], [], 8, NOW)
  assert.ok(!g.items.some(i => i.key === 'fwis'))
  assert.ok(g.items.some(i => i.key === 'contractor_agreement'))
})

test('probation review is not a gap before month 1, IS a gap inside the period, and drops off after it', () => {
  const emp = s => ({ employment_type: 'full_time', start_date: s })
  // 2 weeks in -> not yet due
  assert.equal(computeGaps(emp('2026-09-01'), [], [], 8, NOW).items.find(i => i.key === 'probation_review').notYetDue, true)
  // 3 months in, small business (12-month period) -> due, and missing
  const mid = computeGaps(emp('2026-06-10'), [], [], 8, NOW)
  const pr = mid.items.find(i => i.key === 'probation_review')
  assert.equal(pr.notYetDue, undefined)
  assert.equal(pr.satisfied, false)
  assert.equal(mid.total, 5)
  // 8 months in at a 20-person business (6-month period) -> period over, drops off
  const late = computeGaps(emp('2026-01-10'), [], [], 20, NOW)
  assert.equal(late.items.find(i => i.key === 'probation_review').notYetDue, true)
  assert.equal(late.total, 4)
})

test('the 15-employee boundary changes when probation drops off', () => {
  const emp = { employment_type: 'full_time', start_date: '2026-01-10' } // ~8 months
  // 14 staff -> 12-month period -> still inside -> counted
  assert.equal(computeGaps(emp, [], [], 14, NOW).total, 5)
  // 15 staff -> 6-month period -> past -> not counted
  assert.equal(computeGaps(emp, [], [], 15, NOW).total, 4)
})
