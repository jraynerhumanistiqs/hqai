// Fair Work Commission Modern Awards Pay Database (MAPD) API client.
// Docs: https://uatcalc.fwc.gov.au/api/v1 (public, CC-BY 4.0).
// Used by the chat tool `get_pay_rate` so numeric pay answers are never
// hallucinated — they come straight from the FWC.

type CacheEntry<T> = { value: T; expiresAt: number }
const CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 24h
const cache = new Map<string, CacheEntry<unknown>>()

const BASE = process.env.MAPD_BASE_URL || 'https://uatcalc.fwc.gov.au/api/v1'

export class MapdError extends Error {
  constructor(message: string, public status?: number, public cause?: unknown) {
    super(message)
    this.name = 'MapdError'
  }
}

async function fetchCached<T>(path: string, label: string): Promise<T> {
  const key = `${label}:${path}`
  const hit = cache.get(key)
  if (hit && hit.expiresAt > Date.now()) return hit.value as T

  let res: Response
  try {
    res = await fetch(`${BASE}${path}`, {
      headers: { Accept: 'application/json' },
      // Revalidate roughly daily at the platform level too.
      next: { revalidate: 60 * 60 * 24 },
    })
  } catch (err) {
    throw new MapdError(`MAPD network error for ${path}`, undefined, err)
  }
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new MapdError(`MAPD ${res.status} for ${path}: ${body.slice(0, 300)}`, res.status)
  }
  const data = (await res.json()) as T
  cache.set(key, { value: data, expiresAt: Date.now() + CACHE_TTL_MS })
  return data
}

export interface MapdAward {
  code: string              // e.g. "MA000003"
  name: string
  operative_from?: string
  industry?: string
}

export interface MapdClassification {
  code: string
  title: string
  level?: string
  base_pay_rate?: number
  base_rate_type?: 'annual' | 'weekly' | 'hourly'
}

export interface MapdPayRate {
  award_code: string
  award_name: string
  classification: string
  employment_type: 'full-time' | 'part-time' | 'casual' | string
  base_rate: number
  base_rate_type: 'annual' | 'weekly' | 'hourly' | string
  casual_loading_pct?: number
  effective_from: string
  source_url: string
}

export async function listAwards(): Promise<MapdAward[]> {
  // Shape of the real endpoint is documented at the FWC. We normalise here
  // so callers get a stable interface even if the upstream shape shifts.
  const raw = await fetchCached<{ awards?: MapdAward[] } | MapdAward[]>(
    '/awards',
    'listAwards',
  )
  return Array.isArray(raw) ? raw : raw.awards ?? []
}

export async function getAward(awardCode: string): Promise<MapdAward & {
  classifications?: MapdClassification[]
}> {
  return fetchCached(`/awards/${encodeURIComponent(awardCode)}`, `getAward:${awardCode}`)
}

export interface GetPayRateInput {
  awardCode: string
  classification: string       // classification title or code
  employmentType: 'full-time' | 'part-time' | 'casual'
  date?: string                // ISO date; defaults to today
}

export async function getPayRate(input: GetPayRateInput): Promise<MapdPayRate> {
  const { awardCode, classification, employmentType, date } = input
  const qs = new URLSearchParams({
    classification,
    employmentType,
    ...(date ? { date } : {}),
  })
  return fetchCached<MapdPayRate>(
    `/awards/${encodeURIComponent(awardCode)}/pay-rate?${qs.toString()}`,
    `getPayRate:${awardCode}:${classification}:${employmentType}:${date ?? 'today'}`,
  )
}

export interface MapdAllowance {
  code: string
  name: string
  amount: number
  unit: 'per-hour' | 'per-day' | 'per-week' | 'per-occasion' | string
  taxable?: boolean
  description?: string
}

export async function getAllowances(awardCode: string): Promise<MapdAllowance[]> {
  const raw = await fetchCached<{ allowances?: MapdAllowance[] } | MapdAllowance[]>(
    `/awards/${encodeURIComponent(awardCode)}/allowances`,
    `getAllowances:${awardCode}`,
  )
  return Array.isArray(raw) ? raw : raw.allowances ?? []
}

export interface MapdPenalty {
  code: string
  description: string
  rate_pct: number          // e.g. 150 for time-and-a-half
  applies_to: string        // e.g. "Saturday", "Public Holiday", "overtime after 38h"
}

export async function getPenalties(awardCode: string): Promise<MapdPenalty[]> {
  const raw = await fetchCached<{ penalties?: MapdPenalty[] } | MapdPenalty[]>(
    `/awards/${encodeURIComponent(awardCode)}/penalties`,
    `getPenalties:${awardCode}`,
  )
  return Array.isArray(raw) ? raw : raw.penalties ?? []
}

// Small helper for the chat tool: turns a rate lookup into a citation-ready
// summary string the model can quote directly.
export function summarisePayRate(p: MapdPayRate): string {
  const casual = p.casual_loading_pct ? ` (+${p.casual_loading_pct}% casual loading)` : ''
  return `${p.award_name} — ${p.classification} (${p.employment_type}): $${p.base_rate} ${p.base_rate_type}${casual}, effective ${p.effective_from}.`
}
