// Unit tests for lib/plan-access.ts - which plans get "I need help writing
// this" in the file-note composer. Imports the real module (Node strips the
// TypeScript types; the module has no runtime imports).
// Run: node --test tests/plan-access.test.mjs

import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  planIncludesHelpMode,
  isKnownPlanId,
  helpModeRequiredPlan,
  HELP_MODE_PLAN_MESSAGE,
} from '../lib/plan-access.ts'

test('up-to-150 plans include help-mode', () => {
  assert.equal(planIncludesHelpMode('business'), true)
  assert.equal(planIncludesHelpMode('people-business'), true)
})

test('every enterprise plan includes help-mode', () => {
  for (const p of ['enterprise-people', 'enterprise-recruit', 'enterprise-full']) {
    assert.equal(planIncludesHelpMode(p), true, p)
  }
})

test('up-to-25 plans do not include help-mode', () => {
  assert.equal(planIncludesHelpMode('solo'), false)
  assert.equal(planIncludesHelpMode('people-solo'), false)
})

test('standalone HQ Recruit does not include help-mode', () => {
  assert.equal(planIncludesHelpMode('recruit'), false)
})

test('legacy and unknown values fail open', () => {
  for (const p of ['growth', 'free', 'starter', 'something-new', '', null, undefined]) {
    assert.equal(planIncludesHelpMode(p), true, String(p))
  }
})

test('plan values are matched case- and whitespace-insensitively', () => {
  assert.equal(planIncludesHelpMode(' Solo '), false)
  assert.equal(planIncludesHelpMode('BUSINESS'), true)
})

test('inherited object keys are not treated as plans', () => {
  assert.equal(isKnownPlanId('toString'), false)
  assert.equal(planIncludesHelpMode('toString'), true)
  assert.equal(isKnownPlanId(42), false)
})

test('required plan and message', () => {
  assert.equal(helpModeRequiredPlan, 'business')
  assert.equal(planIncludesHelpMode(helpModeRequiredPlan), true)
  assert.match(HELP_MODE_PLAN_MESSAGE, /up to 150/)
  assert.doesNotMatch(HELP_MODE_PLAN_MESSAGE, /[\u2013\u2014]/)
})
