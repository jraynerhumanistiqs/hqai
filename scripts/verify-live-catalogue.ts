// Read-only-ish verification of the LIVE Stripe catalogue + checkout wiring.
//
// Phase 1 (read-only): for every price-id env key the app resolves, retrieve
// the price from live Stripe and assert it is active, AUD, and the exact
// expected amount. Catches a wrong/stale/mis-pasted id.
// Phase 2 (safe write): create a live Checkout Session per subscribable plan
// (and one one-off) to prove checkout actually works. These sessions are
// created UNPAID with a throwaway customer_email, so nothing is charged and no
// customer is created - the sessions simply expire. No cleanup needed.
//
// Reads the live price ids from the scripts/stripe-*-price-ids.env output
// files and the key from .env.local (never printed). Run from hqai/:
//   npx tsx scripts/verify-live-catalogue.ts

import { readFileSync, existsSync, readdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import Stripe from 'stripe'
import { resolveStripeKey } from './stripe-key'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ENV_LOCAL = join(__dirname, '..', '.env.local')
const ORIGIN = 'https://hqai.vercel.app'

// Expected AUD whole-dollar amounts, keyed by the env var the app resolves.
const EXPECTED: Record<string, number> = {
  STRIPE_PRICE_ID_SOLO_MONTHLY: 89, STRIPE_PRICE_ID_SOLO_ANNUAL: 890,
  STRIPE_PRICE_ID_BUSINESS_MONTHLY: 269, STRIPE_PRICE_ID_BUSINESS_ANNUAL: 2690,
  STRIPE_PRICE_ID_RECRUIT_MONTHLY: 65, STRIPE_PRICE_ID_RECRUIT_ANNUAL: 650,
  STRIPE_PRICE_ID_PEOPLE_SOLO_MONTHLY: 59, STRIPE_PRICE_ID_PEOPLE_SOLO_ANNUAL: 590,
  STRIPE_PRICE_ID_PEOPLE_BUSINESS_MONTHLY: 179, STRIPE_PRICE_ID_PEOPLE_BUSINESS_ANNUAL: 1790,
  STRIPE_PRICE_ID_LETTER_OF_OFFER: 49, STRIPE_PRICE_ID_TERMINATION: 99,
  STRIPE_PRICE_ID_EMPLOYMENT_CONTRACT: 129, STRIPE_PRICE_ID_FIRST_FINAL_WARNING: 59,
  STRIPE_PRICE_ID_POSITION_DESCRIPTION: 49, STRIPE_PRICE_ID_PERFORMANCE_PLAN: 69,
  STRIPE_PRICE_ID_CASUAL_CONVERSION: 49, STRIPE_PRICE_ID_RESIGNATION_ACCEPTANCE: 39,
  STRIPE_PRICE_ID_PROBATION_OUTCOME: 59, STRIPE_PRICE_ID_REFERENCE_CHECK: 39,
  STRIPE_PRICE_ID_EMPLOYMENT_PACK: 349, STRIPE_PRICE_ID_AWARD_PACK: 599,
}
// Subscription plans to smoke-test a Checkout Session for (monthly reps).
const SUB_KEYS = [
  'STRIPE_PRICE_ID_SOLO_MONTHLY', 'STRIPE_PRICE_ID_BUSINESS_MONTHLY',
  'STRIPE_PRICE_ID_RECRUIT_MONTHLY', 'STRIPE_PRICE_ID_PEOPLE_SOLO_MONTHLY',
  'STRIPE_PRICE_ID_PEOPLE_BUSINESS_MONTHLY',
]
const ONEOFF_SMOKE = 'STRIPE_PRICE_ID_LETTER_OF_OFFER'

function loadPriceIds(): Record<string, string> {
  const map: Record<string, string> = {}
  for (const f of readdirSync(__dirname)) {
    if (!/price-ids\.env$/.test(f) || /-v2-/.test(f) || /c10/.test(f)) continue // skip legacy catalogues
    for (const line of readFileSync(join(__dirname, f), 'utf8').split(/\r?\n/)) {
      const m = line.match(/^(STRIPE_PRICE_ID_[A-Z_]+)=(price_\w+)/)
      if (m) map[m[1]] = m[2]
    }
  }
  return map
}

async function main() {
  const r = resolveStripeKey(ENV_LOCAL)
  if (r.mode !== 'LIVE') { console.error(`Refusing to run: key mode is ${r.mode}, expected LIVE.`); process.exit(1) }
  console.log('Stripe mode: LIVE\n')
  const stripe = new Stripe(r.key!, { apiVersion: '2024-04-10' })
  const ids = loadPriceIds()

  // ---- Phase 1: validate every expected price ----
  console.log('== Phase 1: price validation (active / AUD / amount) ==')
  let fail = 0
  for (const [key, expected] of Object.entries(EXPECTED)) {
    const id = ids[key]
    if (!id) { console.log(`  MISSING  ${key} (no price id in output files)`); fail++; continue }
    try {
      const p = await stripe.prices.retrieve(id)
      const okActive = p.active === true
      const okCur = p.currency === 'aud'
      const okAmt = p.unit_amount === expected * 100
      const ok = okActive && okCur && okAmt
      if (!ok) fail++
      console.log(`  ${ok ? 'OK  ' : 'FAIL'}  ${key} -> ${id}  $${(p.unit_amount ?? 0) / 100} ${p.currency} active=${p.active}${okAmt ? '' : ` (expected $${expected})`}`)
    } catch (e: any) { console.log(`  FAIL  ${key} -> ${id}  retrieve error: ${e?.message}`); fail++ }
  }

  // ---- Phase 2: live Checkout Session smoke test (unpaid, expires) ----
  console.log('\n== Phase 2: live Checkout Session creation (no charge; sessions expire unpaid) ==')
  const stamp = 'verify-noreply@hqai.vercel.app'
  for (const key of SUB_KEYS) {
    const id = ids[key]
    if (!id) { console.log(`  SKIP  ${key} (no id)`); continue }
    try {
      const s = await stripe.checkout.sessions.create({
        mode: 'subscription', line_items: [{ price: id, quantity: 1 }],
        customer_email: stamp,
        success_url: `${ORIGIN}/dashboard/settings?billing=success`,
        cancel_url: `${ORIGIN}/dashboard/settings?billing=cancelled`,
      })
      console.log(`  OK   ${key}  session ${s.id} -> ${s.url ? 'hosted URL returned' : 'NO URL'}`)
    } catch (e: any) { console.log(`  FAIL ${key}  session create error: ${e?.message}`) }
  }
  // one-off (payment mode)
  const oid = ids[ONEOFF_SMOKE]
  if (oid) {
    try {
      const s = await stripe.checkout.sessions.create({
        mode: 'payment', line_items: [{ price: oid, quantity: 1 }],
        customer_email: stamp,
        success_url: `${ORIGIN}/offer/success`, cancel_url: `${ORIGIN}/offer/cancelled`,
      })
      console.log(`  OK   ${ONEOFF_SMOKE} (one-off)  session ${s.id} -> ${s.url ? 'hosted URL returned' : 'NO URL'}`)
    } catch (e: any) { console.log(`  FAIL ${ONEOFF_SMOKE}  ${e?.message}`) }
  }

  console.log(`\n== Result: ${fail === 0 ? 'ALL PRICES VALID' : fail + ' price problem(s)'} ==`)
  process.exit(fail === 0 ? 0 : 1)
}
main().catch((e) => { console.error('FAILED:', e?.message ?? e); process.exit(1) })
