// Unit tests for the onboarding plan suggestion logic (lib/plan-suggest.ts).
// Run: npm run test:checkout

import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import {
  suggestPlanId,
  planToNeeds,
  isCheckoutPlanId,
  SMALL_BAND_MAX_HEADCOUNT,
} from '../../lib/plan-suggest'

describe('suggestPlanId', () => {
  test('HR + hiring resolves to the bundle, banded by headcount', () => {
    assert.equal(suggestPlanId({ people: true, recruit: true }, 10), 'solo')
    assert.equal(suggestPlanId({ people: true, recruit: true }, SMALL_BAND_MAX_HEADCOUNT), 'solo')
    assert.equal(suggestPlanId({ people: true, recruit: true }, SMALL_BAND_MAX_HEADCOUNT + 1), 'business')
    assert.equal(suggestPlanId({ people: true, recruit: true }, 150), 'business')
  })

  test('HR only resolves to HQ People, banded by headcount', () => {
    assert.equal(suggestPlanId({ people: true, recruit: false }, 5), 'people-solo')
    assert.equal(suggestPlanId({ people: true, recruit: false }, 80), 'people-business')
  })

  test('hiring only resolves to standalone recruit regardless of headcount', () => {
    assert.equal(suggestPlanId({ people: false, recruit: true }, 5), 'recruit')
    assert.equal(suggestPlanId({ people: false, recruit: true }, 500), 'recruit')
    assert.equal(suggestPlanId({ people: false, recruit: true }), 'recruit')
  })

  test('nothing selected suggests nothing', () => {
    assert.equal(suggestPlanId({ people: false, recruit: false }, 25), null)
  })

  test('unknown headcount defaults to the small band', () => {
    assert.equal(suggestPlanId({ people: true, recruit: true }), 'solo')
    assert.equal(suggestPlanId({ people: true, recruit: false }), 'people-solo')
    assert.equal(suggestPlanId({ people: true, recruit: true }, undefined), 'solo')
  })
})

describe('planToNeeds', () => {
  test('round-trips every checkout plan id to sensible toggles', () => {
    assert.deepEqual(planToNeeds('solo'), { people: true, recruit: true })
    assert.deepEqual(planToNeeds('business'), { people: true, recruit: true })
    assert.deepEqual(planToNeeds('people-solo'), { people: true, recruit: false })
    assert.deepEqual(planToNeeds('people-business'), { people: true, recruit: false })
    assert.deepEqual(planToNeeds('recruit'), { people: false, recruit: true })
  })

  test('suggesting from planToNeeds output lands back on a plan of the same family', () => {
    for (const id of ['solo', 'business', 'people-solo', 'people-business', 'recruit'] as const) {
      const suggested = suggestPlanId(planToNeeds(id), 10)
      assert.ok(suggested, `expected a suggestion for ${id}`)
      const sameFamily =
        (id === 'recruit' && suggested === 'recruit') ||
        (id.startsWith('people') && suggested!.startsWith('people')) ||
        ((id === 'solo' || id === 'business') && (suggested === 'solo' || suggested === 'business'))
      assert.ok(sameFamily, `${id} -> ${suggested} left the plan family`)
    }
  })
})

describe('isCheckoutPlanId', () => {
  test('accepts the five checkout plan ids and nothing else', () => {
    for (const id of ['solo', 'business', 'recruit', 'people-solo', 'people-business']) {
      assert.equal(isCheckoutPlanId(id), true, id)
    }
    assert.equal(isCheckoutPlanId('people'), false)
    assert.equal(isCheckoutPlanId('enterprise-people'), false)
    assert.equal(isCheckoutPlanId(''), false)
    assert.equal(isCheckoutPlanId(null), false)
  })
})
