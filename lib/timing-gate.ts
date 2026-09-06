// Timing gate - "right thing, wrong moment" protection.
//
// General-protections risk is about PROXIMITY and reasoning, not intent: a
// well-founded decision taken soon after someone raised a complaint, asked
// for leave, disclosed a pregnancy or was injured invites a claim, and the
// onus reverses onto the employer. This module answers one question from the
// person's own record: how recently did a protected event happen?
//
// Tiers (owner's decision):
//   escalate  - within 30 days: hold the action, route to the advisor
//   caution   - 31 to 90 days: warn clearly, still allow
//   safe      - beyond 90 days, or nothing on record
//
// This reads structured data logged on the trail (the opt-in "Leave,
// complaint or disclosure" note type and a few trail event types). It never
// characterises the situation - it reports a date and a distance.

import type { ComplianceEvent } from './employees'

export type GateTier = 'safe' | 'caution' | 'escalate'

export const PROTECTED_KINDS = {
  complaint:  { label: 'Raised a complaint or grievance' },
  leave:      { label: 'Requested or took leave' },
  injury:     { label: 'Injury or illness' },
  disclosure: { label: 'Pregnancy, family or carer disclosure' },
  other:      { label: 'Other protected matter' },
} as const
export type ProtectedKind = keyof typeof PROTECTED_KINDS

export const ESCALATE_WITHIN_DAYS = 30
export const CAUTION_WITHIN_DAYS = 90

export interface ProtectedEvent {
  kind: ProtectedKind
  occurred_at: string
  title: string
}

export interface GateResult {
  tier: GateTier
  /** Most recent protected event, if any. */
  event: ProtectedEvent | null
  /** Whole days since that event (0 = today). */
  days: number | null
}

/** Trail event types that are protected matters in their own right. */
const TRAIL_PROTECTED: Record<string, ProtectedKind> = {
  flexible_request: 'leave',     // a workplace right being exercised
  casual_conversion: 'other',    // employee-choice notification / response
}

function kindOf(ev: Pick<ComplianceEvent, 'event_type' | 'metadata'>): ProtectedKind | null {
  if (ev.event_type === 'file_note') {
    const m = (ev.metadata ?? {}) as Record<string, unknown>
    if (m.note_type !== 'protected_event') return null
    const k = m.protected_kind
    return typeof k === 'string' && k in PROTECTED_KINDS ? (k as ProtectedKind) : 'other'
  }
  return TRAIL_PROTECTED[ev.event_type] ?? null
}

export function protectedEventsFrom(
  events: Array<Pick<ComplianceEvent, 'event_type' | 'metadata' | 'occurred_at' | 'title'>>,
): ProtectedEvent[] {
  const out: ProtectedEvent[] = []
  for (const ev of events) {
    const kind = kindOf(ev)
    if (!kind) continue
    if (Number.isNaN(Date.parse(ev.occurred_at))) continue
    out.push({ kind, occurred_at: ev.occurred_at, title: ev.title })
  }
  return out.sort((a, b) => Date.parse(b.occurred_at) - Date.parse(a.occurred_at))
}

export function daysSince(iso: string, now: Date = new Date()): number {
  const then = new Date(iso)
  const a = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
  const b = Date.UTC(then.getFullYear(), then.getMonth(), then.getDate())
  return Math.floor((a - b) / 86_400_000)
}

export function tierForDays(days: number | null): GateTier {
  if (days === null || days < 0) return 'safe'          // nothing, or dated in the future
  if (days <= ESCALATE_WITHIN_DAYS) return 'escalate'
  if (days <= CAUTION_WITHIN_DAYS) return 'caution'
  return 'safe'
}

export function evaluateGate(
  events: Array<Pick<ComplianceEvent, 'event_type' | 'metadata' | 'occurred_at' | 'title'>>,
  now: Date = new Date(),
): GateResult {
  const recent = protectedEventsFrom(events)[0] ?? null
  if (!recent) return { tier: 'safe', event: null, days: null }
  const days = daysSince(recent.occurred_at, now)
  return { tier: tierForDays(days), event: recent, days }
}
