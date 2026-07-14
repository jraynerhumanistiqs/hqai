// Unit tests for the funnel event allowlist shared by lib/analytics.ts
// and app/api/telemetry/funnel/route.ts.
// Run: npx tsx --test tests/checkout/  (or npm run test:checkout)

import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { FUNNEL_EVENTS, isFunnelEvent } from '../../lib/funnel-events'

describe('FUNNEL_EVENTS allowlist', () => {
  test('contains the core funnel transition events (renames get caught here)', () => {
    const required = [
      'pricing_viewed',
      'plan_selected',
      'signup_started',
      'signup_completed',
      'signup_email_exists',
      'magic_link_sent',
      'onboarding_started',
      'onboarding_step_completed',
      'onboarding_completed',
      'payment_step_viewed',
      'annual_nudge_accepted',
      'checkout_started',
      'checkout_completed',
      'checkout_cancelled',
      'upsell_shown',
      'upsell_clicked',
      'billing_banner_shown',
      'welcome_viewed',
    ]
    for (const event of required) {
      assert.ok((FUNNEL_EVENTS as readonly string[]).includes(event), `missing required event '${event}'`)
    }
  })

  test('has no duplicate entries', () => {
    assert.equal(new Set(FUNNEL_EVENTS).size, FUNNEL_EVENTS.length)
  })

  test('every entry is snake_case ascii', () => {
    for (const event of FUNNEL_EVENTS) {
      assert.match(event, /^[a-z][a-z0-9_]*$/, `event '${event}' is not snake_case`)
    }
  })
})

describe('isFunnelEvent', () => {
  test('accepts every allowlisted event', () => {
    for (const event of FUNNEL_EVENTS) {
      assert.equal(isFunnelEvent(event), true, `expected isFunnelEvent('${event}') to be true`)
    }
  })

  test('rejects unknown names, wrong case and non-strings', () => {
    assert.equal(isFunnelEvent('not_an_event'), false)
    assert.equal(isFunnelEvent('PRICING_VIEWED'), false)
    assert.equal(isFunnelEvent('pricing_viewed '), false)
    assert.equal(isFunnelEvent(''), false)
    assert.equal(isFunnelEvent(undefined), false)
    assert.equal(isFunnelEvent(null), false)
    assert.equal(isFunnelEvent(123), false)
    assert.equal(isFunnelEvent({}), false)
    assert.equal(isFunnelEvent(['pricing_viewed']), false)
  })
})
