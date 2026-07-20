// A10 - unit tests for the 3-tier Claude model router.
// Run: npx tsx --test tests/model-router.test.ts
// (matches the existing tests/checkout convention of tsx --test)

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { routeModel } from '../lib/model-router'
import { CLAUDE_MODELS } from '../lib/ai-models'

const base = { historyLength: 0 }

test('simple: greetings and acknowledgements go to Haiku', () => {
  for (const msg of ['Hi', 'thanks heaps', 'ok great', 'no worries']) {
    const r = routeModel({ ...base, message: msg })
    assert.equal(r.tier, 'simple', `"${msg}" -> ${r.tier} (${r.reason})`)
    assert.equal(r.model, CLAUDE_MODELS.simple)
  }
})

test('simple: short clarifying follow-ups go to Haiku', () => {
  const r = routeModel({ ...base, message: 'Can you clarify that last bit?', historyLength: 4 })
  assert.equal(r.tier, 'simple')
})

test('simple: formatting request on an existing answer goes to Haiku', () => {
  const r = routeModel({ ...base, message: 'Can you make that shorter?', historyLength: 4 })
  assert.equal(r.tier, 'simple')
})

test('standard: ordinary HR questions stay on Sonnet (default)', () => {
  for (const msg of [
    'What notice period applies to a casual under the Retail Award?',
    'How much annual leave does a part-time employee accrue?',
    'What should be in an onboarding checklist?',
  ]) {
    const r = routeModel({ ...base, message: msg })
    // Escalation-free HR substance must be standard or complex, never simple.
    assert.notEqual(r.tier, 'simple', `"${msg}" -> simple (${r.reason})`)
  }
})

test('standard: short message WITH HR substance never drops to Haiku', () => {
  const r = routeModel({ ...base, message: 'ok what about leave', historyLength: 4 })
  assert.notEqual(r.tier, 'simple', r.reason)
})

test('complex: high-stakes topics go to Opus', () => {
  for (const msg of [
    'I need to terminate an employee for serious misconduct',
    'We are planning a redundancy for three roles',
    'An employee has raised a bullying complaint against their manager',
    'I think we have an underpayment issue going back two years',
    'Can I dismiss someone on probation?',
    'They have threatened to go to the FWC',
  ]) {
    const r = routeModel({ ...base, message: msg })
    assert.equal(r.tier, 'complex', `"${msg}" -> ${r.tier} (${r.reason})`)
    assert.equal(r.model, CLAUDE_MODELS.complex)
  }
})

test('complex: caller-flagged escalation signals force Opus', () => {
  const r = routeModel({ ...base, message: 'yes', escalationSignals: true })
  assert.equal(r.tier, 'complex')
})

test('complex: multi-part scenario analysis goes to Opus', () => {
  const msg =
    'One of my team members has been consistently late and their performance has slipped. ' +
    'I want to understand my options here. First, what is the right process to raise it formally with them? ' +
    'Second, how long should I give them to improve before we move to the next step? ' +
    'Third, what records do I need to keep along the way so we are covered if it goes further? ' +
    'They have been with us four years and are otherwise a good worker so I want to get this right.'
  const r = routeModel({ ...base, message: msg })
  assert.equal(r.tier, 'complex', r.reason)
})

test('guard: document generation is never routed to Haiku', () => {
  const r = routeModel({ ...base, message: 'Please draft it now', historyLength: 4, hasDocumentIntent: true })
  assert.notEqual(r.tier, 'simple', r.reason)
})

test('guard: escalation beats document intent (Opus wins)', () => {
  const r = routeModel({
    ...base,
    message: 'Draft a termination letter for serious misconduct',
    hasDocumentIntent: true,
  })
  assert.equal(r.tier, 'complex')
})

test('safety valve: ANTHROPIC_ROUTER_DISABLED=1 forces standard', () => {
  process.env.ANTHROPIC_ROUTER_DISABLED = '1'
  try {
    const r = routeModel({ ...base, message: 'I need to terminate an employee today' })
    assert.equal(r.tier, 'standard')
    assert.equal(r.model, CLAUDE_MODELS.standard)
  } finally {
    delete process.env.ANTHROPIC_ROUTER_DISABLED
  }
})

test('empty message falls back to standard', () => {
  const r = routeModel({ ...base, message: '' })
  assert.equal(r.tier, 'standard')
})
