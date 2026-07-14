// Create the standalone HQ People product + prices in Stripe.
//
// scripts/stripe-c10-setup.py already created "HQ People (HR)" with its
// four prices, but those price ids only live in stripe-c10-price-ids.env
// and (if the c10 run used the live key) only in live mode. This script
// makes the People catalogue exist in WHICHEVER mode the supplied key is
// for, idempotently via lookup_keys, so:
//   - test key (.env.local): local dev checkout for people-solo /
//     people-business works end to end
//   - live key (STRIPE_API_KEY, run manually): production catalogue,
//     if you prefer fresh ids over pasting the c10 ones
//
// Prices come from lib/pricing-config.ts C10_SELF_SERVE.people.bands:
//   people-solo     $59/mo,  $590/yr   -> STRIPE_PRICE_ID_PEOPLE_SOLO_*
//   people-business $179/mo, $1,790/yr -> STRIPE_PRICE_ID_PEOPLE_BUSINESS_*
//
// Run with: npx tsx scripts/stripe-people-standalone-setup.ts
// The key is never printed - only its live/test mode.

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

const PRODUCT_NAME = 'HQ People (HR)'

interface PriceSpec {
  envKey: string
  lookupKey: string
  amountAud: number
  interval: 'month' | 'year'
  nickname: string
}

async function main() {
  const key = loadEnvKey('STRIPE_API_KEY') ?? loadEnvKey('STRIPE_SECRET_KEY')
  if (!key) {
    console.error('No STRIPE_SECRET_KEY in .env.local or environment. Aborting.')
    process.exit(1)
  }
  const mode = key.startsWith('sk_live') ? 'LIVE' : key.startsWith('sk_test') ? 'TEST' : 'UNKNOWN'
  console.log(`Stripe mode: ${mode}`)

  const stripe = new Stripe(key, { apiVersion: '2024-04-10' })

  const [small, large] = C10_SELF_SERVE.people.bands
  const specs: PriceSpec[] = [
    { envKey: 'STRIPE_PRICE_ID_PEOPLE_SOLO_MONTHLY',     lookupKey: 'people_solo_monthly',     amountAud: small.monthly,      interval: 'month', nickname: `HQ People ${small.label} monthly ($${small.monthly})` },
    { envKey: 'STRIPE_PRICE_ID_PEOPLE_SOLO_ANNUAL',      lookupKey: 'people_solo_annual',      amountAud: small.annualTotal!, interval: 'year',  nickname: `HQ People ${small.label} annual ($${small.annualTotal})` },
    { envKey: 'STRIPE_PRICE_ID_PEOPLE_BUSINESS_MONTHLY', lookupKey: 'people_business_monthly', amountAud: large.monthly,      interval: 'month', nickname: `HQ People ${large.label} monthly ($${large.monthly})` },
    { envKey: 'STRIPE_PRICE_ID_PEOPLE_BUSINESS_ANNUAL',  lookupKey: 'people_business_annual',  amountAud: large.annualTotal!, interval: 'year',  nickname: `HQ People ${large.label} annual ($${large.annualTotal})` },
  ]

  // Idempotency: reuse prices that already carry our lookup keys.
  const existing = await stripe.prices.list({
    lookup_keys: specs.map((s) => s.lookupKey),
    limit: 10,
  })
  const byLookup = new Map(existing.data.map((p) => [p.lookup_key, p]))

  let productId =
    (existing.data[0]?.product as string | undefined) ?? null
  if (!productId) {
    const found = await stripe.products.search({ query: `name:'${PRODUCT_NAME}'`, limit: 1 })
    productId = found.data[0]?.id ?? null
  }
  if (!productId) {
    const product = await stripe.products.create({
      name: PRODUCT_NAME,
      description:
        'HR only - the AI HR assistant, a full document library and the everyday HR jobs handled.',
    })
    productId = product.id
    console.log(`  product created: ${PRODUCT_NAME} -> ${productId}`)
  } else {
    console.log(`  product reused: ${PRODUCT_NAME} -> ${productId}`)
  }

  const ids: Record<string, string> = {}
  for (const spec of specs) {
    let price = byLookup.get(spec.lookupKey) ?? null
    if (!price) {
      price = await stripe.prices.create({
        product: productId,
        unit_amount: spec.amountAud * 100,
        currency: 'aud',
        recurring: { interval: spec.interval },
        nickname: spec.nickname,
        lookup_key: spec.lookupKey,
      })
      console.log(`  price created: ${spec.nickname} -> ${price.id}`)
    } else {
      console.log(`  price reused: ${spec.nickname} -> ${price.id}`)
    }
    ids[spec.envKey] = price.id
  }

  // Write the paste-into-Vercel env block (same pattern as the other
  // setup scripts).
  const outPath = join(__dirname, 'stripe-people-standalone-price-ids.env')
  writeFileSync(
    outPath,
    [
      '# HQ People standalone Stripe price ids. Paste into Vercel env (and .env.local).',
      '# Generated by scripts/stripe-people-standalone-setup.ts',
      ...Object.entries(ids).map(([k, v]) => `${k}=${v}`),
      '',
    ].join('\n'),
    'utf8',
  )
  console.log(`\nWrote ids to ${outPath}`)

  // Append to .env.local so local dev resolves immediately (skip any key
  // already present).
  const toAppend = Object.entries(ids)
    .filter(([k]) => !envHasKey(k))
    .map(([k, v]) => `${k}=${v}`)
  if (toAppend.length && existsSync(ENV_LOCAL)) {
    appendFileSync(ENV_LOCAL, `\n# HQ People standalone (stripe-people-standalone-setup.ts)\n${toAppend.join('\n')}\n`)
    console.log(`Appended ${toAppend.length} key(s) to .env.local`)
  } else {
    console.log('.env.local already has all keys (or file missing) - nothing appended')
  }

  console.log('Next: paste these ids into Vercel (Production + Preview + Development) and redeploy.')
}

main().catch((err) => {
  console.error('FAILED:', err?.message ?? err)
  process.exit(1)
})
