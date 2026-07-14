// Create the standalone HQ Recruit product + prices in Stripe.
//
// The C10 catalogue (scripts/stripe-c10-setup.py) predates HQ Recruit
// becoming a standalone subscribable plan, so STRIPE_PRICE_ID_RECRUIT_MONTHLY
// has no price object behind it and the checkout route 503s for
// planId 'recruit'. This creates:
//   - product "HQ Recruit (hiring only)" (its own product, not the add-on
//     product, so the buyer's invoice line reads correctly)
//   - $65/mo AUD recurring price  -> STRIPE_PRICE_ID_RECRUIT_MONTHLY
//   - $650/yr AUD recurring price -> STRIPE_PRICE_ID_RECRUIT_ANNUAL
//     (2 months free equivalent; the catalogue slot lib/stripe.ts already
//     reserves - not surfaced in the UI yet)
//
// Amounts come from lib/pricing-config.ts - never hardcoded here.
// Idempotent: prices carry lookup_keys and are reused on re-run.
//
// Reads STRIPE_SECRET_KEY from .env.local (or the environment). The key is
// never printed - only its live/test mode. Run with:
//   npx tsx scripts/stripe-recruit-standalone-setup.ts
//
// Output: scripts/stripe-recruit-standalone-price-ids.env (paste into
// Vercel), and the two lines are appended to .env.local if absent.

import { readFileSync, writeFileSync, appendFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import Stripe from 'stripe'
import { C10_SELF_SERVE } from '../lib/pricing-config'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ENV_LOCAL = join(__dirname, '..', '.env.local')

function loadEnvKey(name: string): string | null {
  if (process.env[name]?.trim()) return process.env[name]!.trim()
  if (!existsSync(ENV_LOCAL)) return null
  for (const line of readFileSync(ENV_LOCAL, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (m && m[1] === name) return m[2].trim().replace(/^["']|["']$/g, '')
  }
  return null
}

function envHasKey(name: string): boolean {
  if (!existsSync(ENV_LOCAL)) return false
  return readFileSync(ENV_LOCAL, 'utf8')
    .split(/\r?\n/)
    .some((l) => l.startsWith(`${name}=`))
}

const LOOKUP_MONTHLY = 'recruit_standalone_monthly'
const LOOKUP_ANNUAL = 'recruit_standalone_annual'
const PRODUCT_NAME = 'HQ Recruit (hiring only)'

async function main() {
  const key = loadEnvKey('STRIPE_API_KEY') ?? loadEnvKey('STRIPE_SECRET_KEY')
  if (!key) {
    console.error('No STRIPE_SECRET_KEY in .env.local or environment. Aborting.')
    process.exit(1)
  }
  const mode = key.startsWith('sk_live') ? 'LIVE' : key.startsWith('sk_test') ? 'TEST' : 'UNKNOWN'
  console.log(`Stripe mode: ${mode}`)

  const stripe = new Stripe(key, { apiVersion: '2024-04-10' })

  const monthlyAud = C10_SELF_SERVE.recruit.standaloneMonthly // $65
  const annualAudTotal = monthlyAud * 10 // 2 months free equivalent

  // Idempotency: reuse prices that already carry our lookup keys.
  const existing = await stripe.prices.list({
    lookup_keys: [LOOKUP_MONTHLY, LOOKUP_ANNUAL],
    limit: 10,
  })
  let monthlyPrice = existing.data.find((p) => p.lookup_key === LOOKUP_MONTHLY) ?? null
  let annualPrice = existing.data.find((p) => p.lookup_key === LOOKUP_ANNUAL) ?? null

  // Resolve or create the product.
  let productId =
    (monthlyPrice?.product as string | undefined) ??
    (annualPrice?.product as string | undefined) ??
    null
  if (!productId) {
    const found = await stripe.products.search({ query: `name:'${PRODUCT_NAME}'`, limit: 1 })
    productId = found.data[0]?.id ?? null
  }
  if (!productId) {
    const product = await stripe.products.create({
      name: PRODUCT_NAME,
      description:
        'Standalone hiring plan - CV scoring, video and phone interviews, Campaign Coach job ads. No HR subscription needed.',
    })
    productId = product.id
    console.log(`  product created: ${PRODUCT_NAME} -> ${productId}`)
  } else {
    console.log(`  product reused: ${PRODUCT_NAME} -> ${productId}`)
  }

  if (!monthlyPrice) {
    monthlyPrice = await stripe.prices.create({
      product: productId,
      unit_amount: monthlyAud * 100,
      currency: 'aud',
      recurring: { interval: 'month' },
      nickname: `HQ Recruit standalone monthly ($${monthlyAud})`,
      lookup_key: LOOKUP_MONTHLY,
    })
    console.log(`  price created: monthly $${monthlyAud} -> ${monthlyPrice.id}`)
  } else {
    console.log(`  price reused: monthly -> ${monthlyPrice.id}`)
  }

  if (!annualPrice) {
    annualPrice = await stripe.prices.create({
      product: productId,
      unit_amount: annualAudTotal * 100,
      currency: 'aud',
      recurring: { interval: 'year' },
      nickname: `HQ Recruit standalone annual ($${annualAudTotal}/yr, 2 months free)`,
      lookup_key: LOOKUP_ANNUAL,
    })
    console.log(`  price created: annual $${annualAudTotal}/yr -> ${annualPrice.id}`)
  } else {
    console.log(`  price reused: annual -> ${annualPrice.id}`)
  }

  // Write the paste-into-Vercel env block (same pattern as the c10 script).
  const outPath = join(__dirname, 'stripe-recruit-standalone-price-ids.env')
  writeFileSync(
    outPath,
    [
      '# HQ Recruit standalone Stripe price ids. Paste into Vercel env (and .env.local).',
      '# Generated by scripts/stripe-recruit-standalone-setup.ts',
      `STRIPE_PRICE_ID_RECRUIT_MONTHLY=${monthlyPrice.id}`,
      `STRIPE_PRICE_ID_RECRUIT_ANNUAL=${annualPrice.id}`,
      '',
    ].join('\n'),
    'utf8',
  )
  console.log(`\nWrote ids to ${outPath}`)

  // Append to .env.local so local dev resolves immediately (skip if present).
  const toAppend: string[] = []
  if (!envHasKey('STRIPE_PRICE_ID_RECRUIT_MONTHLY')) {
    toAppend.push(`STRIPE_PRICE_ID_RECRUIT_MONTHLY=${monthlyPrice.id}`)
  }
  if (!envHasKey('STRIPE_PRICE_ID_RECRUIT_ANNUAL')) {
    toAppend.push(`STRIPE_PRICE_ID_RECRUIT_ANNUAL=${annualPrice.id}`)
  }
  if (toAppend.length && existsSync(ENV_LOCAL)) {
    appendFileSync(ENV_LOCAL, `\n# HQ Recruit standalone (stripe-recruit-standalone-setup.ts)\n${toAppend.join('\n')}\n`)
    console.log(`Appended ${toAppend.length} key(s) to .env.local`)
  } else {
    console.log('.env.local already has both keys (or file missing) - nothing appended')
  }

  console.log('Next: paste the two ids into Vercel (Production + Preview + Development) and redeploy.')
}

main().catch((err) => {
  console.error('FAILED:', err?.message ?? err)
  process.exit(1)
})
