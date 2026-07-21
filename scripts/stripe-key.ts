// Shared Stripe-key resolver for the setup scripts.
//
// Robust to a messy .env.local: it scans process.env AND every
// STRIPE_SECRET_KEY / STRIPE_API_KEY line in .env.local, then deterministically
// prefers a LIVE key (sk_live/rk_live) when several candidates exist - so a
// stale sk_test line coexisting with a new sk_live line no longer shadows the
// live key. Returns the chosen key plus a mode summary for diagnostics; the
// secret value itself is never logged by callers, only its mode.

import { readFileSync, existsSync } from 'fs'

const NAMES = ['STRIPE_SECRET_KEY', 'STRIPE_API_KEY']

function modeOf(k: string): 'LIVE' | 'TEST' | 'other' {
  if (k.startsWith('sk_live') || k.startsWith('rk_live')) return 'LIVE'
  if (k.startsWith('sk_test') || k.startsWith('rk_test')) return 'TEST'
  return 'other'
}

export interface StripeKeyResolution {
  key: string | null
  mode: 'LIVE' | 'TEST' | 'other' | 'none'
  liveCount: number
  testCount: number
  otherCount: number
}

export function resolveStripeKey(envLocalPath: string): StripeKeyResolution {
  const candidates: string[] = []
  for (const n of NAMES) {
    const v = process.env[n]?.trim()
    if (v) candidates.push(v)
  }
  if (existsSync(envLocalPath)) {
    for (const line of readFileSync(envLocalPath, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)=(.*)$/)
      if (m && NAMES.includes(m[1])) candidates.push(m[2].trim().replace(/^["']|["']$/g, ''))
    }
  }
  const liveCount = candidates.filter((k) => modeOf(k) === 'LIVE').length
  const testCount = candidates.filter((k) => modeOf(k) === 'TEST').length
  const otherCount = candidates.filter((k) => modeOf(k) === 'other').length
  const chosen = candidates.find((k) => modeOf(k) === 'LIVE') ?? candidates[0] ?? null
  return {
    key: chosen,
    mode: chosen ? modeOf(chosen) : 'none',
    liveCount,
    testCount,
    otherCount,
  }
}
