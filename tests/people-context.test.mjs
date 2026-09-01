// Unit tests for the reactive-hook logic.
//
// These matter more than usual: the output is a DATE the user may act on, and
// an off-by-one in the minimum employment period is the difference between a
// one-week-notice decision and an unfair-dismissal exposure. Run:
//   node --test tests/people-context.test.mjs
//
// Pure logic is re-implemented here rather than imported, because lib/ is
// TypeScript and this suite runs under plain node --test like the project's
// other smoke tests. Keep in sync with lib/employees.ts + lib/people-context.ts.

import { test } from 'node:test'
import assert from 'node:assert/strict'

function monthsOfService(startDate, asOf) {
  const start = new Date(startDate + 'T00:00:00')
  let months =
    (asOf.getFullYear() - start.getFullYear()) * 12 + (asOf.getMonth() - start.getMonth())
  if (asOf.getDate() < start.getDate()) months -= 1
  return Math.max(0, months)
}

function minimumEmploymentPeriodMonths(headcount) {
  return headcount < 15 ? 12 : 6
}

function minimumPeriodEndsOn(startDate, headcount) {
  const d = new Date(startDate + 'T00:00:00')
  d.setMonth(d.getMonth() + minimumEmploymentPeriodMonths(headcount))
  return d
}

function detectTopic(text) {
  const t = text.toLowerCase()
  if (/\b(sack|fire|fired|firing|terminat|dismiss|let (him|her|them) go|end (his|her|their) employment|redundan)/.test(t)) return 'termination'
  if (/\b(probation|trial period|minimum employment period|first six months|first 6 months)/.test(t)) return 'probation'
  if (/\bcasual\b.*(convert|permanent|conversion)|convert.*casual|employee choice/.test(t)) return 'casual_conversion'
  if (/\b(underpaid|underpaying|underpayment|back ?pay|wrong (rate|award|classification)|wage theft)/.test(t)) return 'underpayment'
  if (/\b(performance|pip|improvement plan|written warning|underperform)/.test(t)) return 'performance'
  if (/\b(annual leave|sick leave|personal leave|carer|parental leave|long service)/.test(t)) return 'leave'
  return null
}

// --- minimum employment period ------------------------------------------------

test('small business (under 15 staff) gets a 12-month minimum period', () => {
  assert.equal(minimumEmploymentPeriodMonths(8), 12)
  assert.equal(minimumEmploymentPeriodMonths(14), 12)
})

test('15 or more staff gets a 6-month minimum period', () => {
  assert.equal(minimumEmploymentPeriodMonths(15), 6)
  assert.equal(minimumEmploymentPeriodMonths(40), 6)
})

test('the 15-employee boundary is exact, not approximate', () => {
  // The whole legal difference turns on this single employee.
  assert.notEqual(minimumEmploymentPeriodMonths(14), minimumEmploymentPeriodMonths(15))
})

test('minimum period end date is computed correctly for a small business', () => {
  const ends = minimumPeriodEndsOn('2026-03-01', 8)
  assert.equal(ends.getFullYear(), 2027)
  assert.equal(ends.getMonth(), 2) // March (0-indexed)
  assert.equal(ends.getDate(), 1)
})

test('minimum period end date is computed correctly for a larger business', () => {
  const ends = minimumPeriodEndsOn('2026-03-01', 20)
  assert.equal(ends.getFullYear(), 2026)
  assert.equal(ends.getMonth(), 8) // September
})

// --- months of service --------------------------------------------------------

test('months of service does not round up a partial month', () => {
  // Started 15 March, asking on 14 April - that is NOT yet one month.
  assert.equal(monthsOfService('2026-03-15', new Date('2026-04-14T00:00:00')), 0)
  assert.equal(monthsOfService('2026-03-15', new Date('2026-04-15T00:00:00')), 1)
})

test('months of service handles a year boundary', () => {
  assert.equal(monthsOfService('2025-08-01', new Date('2026-08-01T00:00:00')), 12)
})

test('months of service never goes negative for a future start date', () => {
  assert.equal(monthsOfService('2027-01-01', new Date('2026-08-01T00:00:00')), 0)
})

// --- topic detection ----------------------------------------------------------

test('detects termination language as SMEs actually phrase it', () => {
  for (const s of [
    'I need to sack someone',
    'how do I let him go',
    'thinking about firing her',
    'can I terminate this employee',
    'we need to make the role redundant',
  ]) {
    assert.equal(detectTopic(s), 'termination', `failed on: ${s}`)
  }
})

test('detects probation, casual conversion and underpayment', () => {
  assert.equal(detectTopic('is he still on probation'), 'probation')
  assert.equal(detectTopic('do I have to convert my casual to permanent'), 'casual_conversion')
  assert.equal(detectTopic('I think I have been underpaying her'), 'underpayment')
})

test('stays silent on unrelated questions (a false positive costs trust)', () => {
  for (const s of [
    'what is the minimum wage',
    'how do I write a job ad',
    'can you help me with a policy',
    'what are my obligations under WHS',
  ]) {
    assert.equal(detectTopic(s), null, `false positive on: ${s}`)
  }
})
