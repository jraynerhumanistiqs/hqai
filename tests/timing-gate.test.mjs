// Unit tests for the timing gate. The output can hold or allow a termination,
// so the day boundaries are the thing to pin down exactly.
// Pure logic re-implemented (lib/ is TypeScript). Keep in sync with lib/timing-gate.ts.
// Run: node --test tests/timing-gate.test.mjs

import { test } from 'node:test'
import assert from 'node:assert/strict'

const ESCALATE_WITHIN_DAYS = 30
const CAUTION_WITHIN_DAYS = 90
const PROTECTED = new Set(['complaint', 'leave', 'injury', 'disclosure', 'other'])
const TRAIL_PROTECTED = { flexible_request: 'leave', casual_conversion: 'other' }

function kindOf(ev) {
  if (ev.event_type === 'file_note') {
    const m = ev.metadata ?? {}
    if (m.note_type !== 'protected_event') return null
    return typeof m.protected_kind === 'string' && PROTECTED.has(m.protected_kind) ? m.protected_kind : 'other'
  }
  return TRAIL_PROTECTED[ev.event_type] ?? null
}
function protectedEventsFrom(events) {
  return events
    .map(ev => { const kind = kindOf(ev); return kind && !Number.isNaN(Date.parse(ev.occurred_at)) ? { kind, occurred_at: ev.occurred_at } : null })
    .filter(Boolean)
    .sort((a, b) => Date.parse(b.occurred_at) - Date.parse(a.occurred_at))
}
function daysSince(iso, now) {
  const then = new Date(iso)
  const a = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
  const b = Date.UTC(then.getFullYear(), then.getMonth(), then.getDate())
  return Math.floor((a - b) / 86_400_000)
}
function tierForDays(days) {
  if (days === null || days < 0) return 'safe'
  if (days <= ESCALATE_WITHIN_DAYS) return 'escalate'
  if (days <= CAUTION_WITHIN_DAYS) return 'caution'
  return 'safe'
}
function evaluateGate(events, now) {
  const recent = protectedEventsFrom(events)[0] ?? null
  if (!recent) return { tier: 'safe', event: null, days: null }
  const days = daysSince(recent.occurred_at, now)
  return { tier: tierForDays(days), event: recent, days }
}

const NOW = new Date('2026-09-15T10:00:00')
const daysAgo = n => { const d = new Date(NOW); d.setDate(d.getDate() - n); return d.toISOString() }
const note = (kind, iso) => ({ event_type: 'file_note', occurred_at: iso, metadata: { note_type: 'protected_event', protected_kind: kind } })

test('nothing on record -> safe', () => {
  assert.equal(evaluateGate([], NOW).tier, 'safe')
})

test('a complaint 10 days ago -> escalate', () => {
  const g = evaluateGate([note('complaint', daysAgo(10))], NOW)
  assert.equal(g.tier, 'escalate'); assert.equal(g.days, 10)
})

test('the 30/31 boundary is exact', () => {
  assert.equal(evaluateGate([note('leave', daysAgo(30))], NOW).tier, 'escalate')
  assert.equal(evaluateGate([note('leave', daysAgo(31))], NOW).tier, 'caution')
})

test('the 90/91 boundary is exact', () => {
  assert.equal(evaluateGate([note('injury', daysAgo(90))], NOW).tier, 'caution')
  assert.equal(evaluateGate([note('injury', daysAgo(91))], NOW).tier, 'safe')
})

test('the most recent protected event decides, not the oldest', () => {
  const g = evaluateGate([note('leave', daysAgo(200)), note('disclosure', daysAgo(5))], NOW)
  assert.equal(g.tier, 'escalate'); assert.equal(g.event.kind, 'disclosure')
})

test('ordinary file notes are NOT protected events', () => {
  const ordinary = { event_type: 'file_note', occurred_at: daysAgo(3), metadata: { note_type: 'feedback_given' } }
  assert.equal(evaluateGate([ordinary], NOW).tier, 'safe')
})

test('a flexible-work request on the trail counts as a protected matter', () => {
  const g = evaluateGate([{ event_type: 'flexible_request', occurred_at: daysAgo(12), metadata: {} }], NOW)
  assert.equal(g.tier, 'escalate'); assert.equal(g.event.kind, 'leave')
})

test('a future-dated event is ignored rather than treated as recent', () => {
  const d = new Date(NOW); d.setDate(d.getDate() + 5)
  assert.equal(evaluateGate([note('complaint', d.toISOString())], NOW).tier, 'safe')
})

test('an unknown protected kind still counts, as other', () => {
  const g = evaluateGate([{ event_type: 'file_note', occurred_at: daysAgo(2), metadata: { note_type: 'protected_event', protected_kind: 'weird' } }], NOW)
  assert.equal(g.tier, 'escalate'); assert.equal(g.event.kind, 'other')
})
