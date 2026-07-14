// Unit tests for the checkout plumbing in lib/stripe.ts.
// Run: npx tsx --test tests/checkout/  (or npm run test:checkout)

import { test, describe, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import {
  PLANS,
  isPlanId,
  isSalesAssistedPlan,
  isBillingCycle,
  isCheckoutReturnTo,
  getStripePriceId,
  buildCheckoutReturnUrls,
  type PlanId,
} from '../../lib/stripe'
import { PRICING, C10_SELF_SERVE } from '../../lib/pricing-config'

describe('isPlanId', () => {
  test('accepts every catalogue plan id', () => {
    for (const id of Object.keys(PLANS)) {
      assert.equal(isPlanId(id), true, `expected isPlanId('${id}') to be true`)
    }
  })

  test('rejects unknown and non-string values', () => {
    assert.equal(isPlanId('people'), false, "bare 'people' is not a plan id - the People bands are people-solo / people-business")
    assert.equal(isPlanId('growth'), false)
    assert.equal(isPlanId('free'), false)
    assert.equal(isPlanId(''), false)
    assert.equal(isPlanId(undefined), false)
    assert.equal(isPlanId(null), false)
    assert.equal(isPlanId(42), false)
    assert.equal(isPlanId('SOLO'), false)
  })
})

describe('isSalesAssistedPlan', () => {
  test('enterprise variants are sales-assisted; self-serve plans are not', () => {
    assert.equal(isSalesAssistedPlan('enterprise-people'), true)
    assert.equal(isSalesAssistedPlan('enterprise-recruit'), true)
    assert.equal(isSalesAssistedPlan('enterprise-full'), true)
    assert.equal(isSalesAssistedPlan('solo'), false)
    assert.equal(isSalesAssistedPlan('business'), false)
    assert.equal(isSalesAssistedPlan('recruit'), false)
    assert.equal(isSalesAssistedPlan('people-solo'), false)
    assert.equal(isSalesAssistedPlan('people-business'), false)
  })
})

describe('isBillingCycle', () => {
  test('accepts only monthly and annual', () => {
    assert.equal(isBillingCycle('monthly'), true)
    assert.equal(isBillingCycle('annual'), true)
    assert.equal(isBillingCycle('yearly'), false)
    assert.equal(isBillingCycle(''), false)
    assert.equal(isBillingCycle(undefined), false)
    assert.equal(isBillingCycle(null), false)
  })
})

describe('isCheckoutReturnTo', () => {
  test('accepts only onboarding and settings', () => {
    assert.equal(isCheckoutReturnTo('onboarding'), true)
    assert.equal(isCheckoutReturnTo('settings'), true)
    assert.equal(isCheckoutReturnTo('welcome'), false)
    assert.equal(isCheckoutReturnTo('dashboard'), false)
    assert.equal(isCheckoutReturnTo(''), false)
    assert.equal(isCheckoutReturnTo(undefined), false)
    assert.equal(isCheckoutReturnTo(null), false)
  })
})

describe('getStripePriceId', () => {
  const ENV_KEY = 'STRIPE_PRICE_ID_SOLO_MONTHLY'
  let saved: string | undefined

  beforeEach(() => { saved = process.env[ENV_KEY] })
  afterEach(() => {
    if (saved === undefined) delete process.env[ENV_KEY]
    else process.env[ENV_KEY] = saved
  })

  test('resolves the env var and trims whitespace', () => {
    process.env[ENV_KEY] = '  price_test_123  '
    assert.equal(getStripePriceId('solo', 'monthly'), 'price_test_123')
  })

  test('returns null when the env var is missing', () => {
    delete process.env[ENV_KEY]
    assert.equal(getStripePriceId('solo', 'monthly'), null)
  })

  test('returns null when the env var is blank', () => {
    process.env[ENV_KEY] = '   '
    assert.equal(getStripePriceId('solo', 'monthly'), null)
  })
})

describe('plan catalogue consistency with lib/pricing-config.ts', () => {
  test('solo prices match PRICING.tiers[0] and the C10 bundle', () => {
    assert.equal(PLANS.solo.monthly.price, PRICING.tiers[0].priceMonthly)
    assert.equal(PLANS.solo.annual.price, PRICING.tiers[0].priceAnnualMonthly)
    assert.equal(PLANS.solo.monthly.price, C10_SELF_SERVE.bundle.solo.monthly)
    assert.equal(C10_SELF_SERVE.bundle.solo.annualTotal, PRICING.tiers[0].priceAnnualTotal)
  })

  test('business prices match PRICING.tiers[1] and the C10 bundle', () => {
    assert.equal(PLANS.business.monthly.price, PRICING.tiers[1].priceMonthly)
    assert.equal(PLANS.business.annual.price, PRICING.tiers[1].priceAnnualMonthly)
    assert.equal(PLANS.business.monthly.price, C10_SELF_SERVE.bundle.business.monthly)
    assert.equal(C10_SELF_SERVE.bundle.business.annualTotal, PRICING.tiers[1].priceAnnualTotal)
  })

  test('recruit standalone price matches the C10 config', () => {
    assert.equal(PLANS.recruit.monthly.price, C10_SELF_SERVE.recruit.standaloneMonthly)
  })

  test('people standalone prices and credits match the C10 bands', () => {
    assert.equal(PLANS['people-solo'].monthly.price, C10_SELF_SERVE.people.bands[0].monthly)
    assert.equal(PLANS['people-solo'].credits, C10_SELF_SERVE.people.bands[0].credits)
    assert.equal(PLANS['people-business'].monthly.price, C10_SELF_SERVE.people.bands[1].monthly)
    assert.equal(PLANS['people-business'].credits, C10_SELF_SERVE.people.bands[1].credits)
    // Annual = the band's annual total as a monthly-equivalent rate.
    assert.equal(PLANS['people-solo'].annual.price, Math.round(C10_SELF_SERVE.people.bands[0].annualTotal! / 12))
    assert.equal(PLANS['people-business'].annual.price, Math.round(C10_SELF_SERVE.people.bands[1].annualTotal! / 12))
    // Env keys match the ones scripts/stripe-c10-setup.py generated.
    assert.equal(PLANS['people-solo'].monthly.envKey, 'STRIPE_PRICE_ID_PEOPLE_SOLO_MONTHLY')
    assert.equal(PLANS['people-business'].monthly.envKey, 'STRIPE_PRICE_ID_PEOPLE_BUSINESS_MONTHLY')
  })

  test('every plan (checkout-able and enterprise) declares env keys for both cycles', () => {
    for (const [id, entry] of Object.entries(PLANS)) {
      for (const cycle of ['monthly', 'annual'] as const) {
        const envKey = entry[cycle].envKey
        assert.equal(typeof envKey, 'string', `${id}/${cycle} envKey must be a string`)
        assert.ok(envKey.startsWith('STRIPE_PRICE_ID_'), `${id}/${cycle} envKey '${envKey}' must be a STRIPE_PRICE_ID_* key`)
      }
    }
  })

  test('every checkout-able plan has a positive price for both cycles', () => {
    const checkoutable = (Object.keys(PLANS) as PlanId[]).filter(id => !isSalesAssistedPlan(id))
    assert.deepEqual(checkoutable.sort(), ['business', 'people-business', 'people-solo', 'recruit', 'solo'])
    for (const id of checkoutable) {
      assert.ok(PLANS[id].monthly.price > 0, `${id} monthly price must be positive`)
      assert.ok(PLANS[id].annual.price > 0, `${id} annual price must be positive`)
    }
  })
})

describe('buildCheckoutReturnUrls', () => {
  const origin = 'https://example.test'

  test("'settings' keeps the pre-existing dashboard URLs exactly", () => {
    const { successUrl, cancelUrl } = buildCheckoutReturnUrls(origin, 'settings', 'business', 'monthly')
    assert.equal(successUrl, 'https://example.test/dashboard/settings?billing=success')
    assert.equal(cancelUrl, 'https://example.test/dashboard/settings?billing=cancelled')
  })

  test("'onboarding' success URL carries state, plan, cycle and the literal Stripe session token", () => {
    const { successUrl } = buildCheckoutReturnUrls(origin, 'onboarding', 'solo', 'annual')
    assert.equal(
      successUrl,
      'https://example.test/welcome?state=success&plan=solo&cycle=annual&session_id={CHECKOUT_SESSION_ID}',
    )
    // The Stripe template token must never be URL-encoded.
    assert.ok(successUrl.includes('{CHECKOUT_SESSION_ID}'))
    assert.ok(!successUrl.includes('%7B'))
  })

  test("'onboarding' cancel URL carries state, plan and cycle (no session token)", () => {
    const { cancelUrl } = buildCheckoutReturnUrls(origin, 'onboarding', 'business', 'monthly')
    assert.equal(cancelUrl, 'https://example.test/welcome?state=cancelled&plan=business&cycle=monthly')
    assert.ok(!cancelUrl.includes('CHECKOUT_SESSION_ID'))
  })

  test('plan and cycle are URL-encoded defensively', () => {
    const { cancelUrl } = buildCheckoutReturnUrls(origin, 'onboarding', 'a plan&x', 'mo/nthly')
    assert.ok(cancelUrl.includes('plan=a%20plan%26x'))
    assert.ok(cancelUrl.includes('cycle=mo%2Fnthly'))
  })
})
