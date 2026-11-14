// Unit tests for the evidence-trail correction pattern (lib/trail.ts).
// Imports the real module: it is dependency-free and Node 24 strips the
// types natively. Run: node --test tests/trail.test.mjs

import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  applySupersessions,
  supersededIds,
  correctionsById,
  isMissingSupersedes,
  selectWithSupersedes,
} from '../lib/trail.ts'

const ev = (id, supersedes = null, created_at = '2026-11-01T00:00:00Z') => ({ id, supersedes, created_at })

test('no corrections -> every event is live, same array back', () => {
  const list = [ev('a'), ev('b')]
  assert.equal(applySupersessions(list), list)
  assert.equal(supersededIds(list).size, 0)
})

test('a correction hides the original and keeps itself', () => {
  const live = applySupersessions([ev('a'), ev('b', 'a')])
  assert.deepEqual(live.map(e => e.id), ['b'])
})

test('a chain leaves only the newest correction live', () => {
  // c corrects b, which corrected a
  const list = [ev('a'), ev('b', 'a'), ev('c', 'b'), ev('x')]
  assert.deepEqual(applySupersessions(list).map(e => e.id), ['c', 'x'])
  assert.deepEqual([...supersededIds(list)].sort(), ['a', 'b'])
})

test('a dangling reference supersedes nothing and the correction stays live', () => {
  const list = [ev('a'), ev('b', 'missing-id')]
  assert.deepEqual(applySupersessions(list).map(e => e.id), ['a', 'b'])
})

test('order is preserved and undefined supersedes (pre-migration rows) is fine', () => {
  const list = [{ id: 'z' }, ev('y', 'q'), { id: 'q' }, { id: 'p', supersedes: undefined }]
  assert.deepEqual(applySupersessions(list).map(e => e.id), ['z', 'y', 'p'])
})

test('a self-reference is ignored (the DB CHECK forbids it anyway)', () => {
  assert.deepEqual(applySupersessions([ev('a', 'a')]).map(e => e.id), ['a'])
})

test('correctionsById maps each original to its correcting entry, latest wins', () => {
  const m = correctionsById([
    ev('a'),
    ev('b', 'a', '2026-11-02T00:00:00Z'),
    ev('c', 'a', '2026-11-03T00:00:00Z'),
  ])
  assert.equal(m.get('a').id, 'c')
  assert.equal(m.size, 1)
})

test('isMissingSupersedes recognises an unapplied migration', () => {
  assert.equal(isMissingSupersedes({ code: '42703', message: 'column compliance_events.supersedes does not exist' }), true)
  assert.equal(isMissingSupersedes({ message: 'Could not find the supersedes column' }), true)
  assert.equal(isMissingSupersedes({ code: '23505', message: 'duplicate key' }), false)
  assert.equal(isMissingSupersedes(null), false)
})

test('selectWithSupersedes retries without the column only when it is missing', async () => {
  const calls = []
  const res = await selectWithSupersedes('id, event_type', async cols => {
    calls.push(cols)
    return cols.includes('supersedes')
      ? { data: null, error: { code: '42703', message: 'column supersedes does not exist' } }
      : { data: [{ id: 'a' }], error: null }
  })
  assert.deepEqual(calls, ['id, event_type, supersedes', 'id, event_type'])
  assert.deepEqual(res.data, [{ id: 'a' }])

  const calls2 = []
  await selectWithSupersedes('id', async cols => { calls2.push(cols); return { data: [], error: null } })
  assert.deepEqual(calls2, ['id, supersedes'])
})
