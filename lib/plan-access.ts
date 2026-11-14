// lib/plan-access.ts
//
// What each subscription plan unlocks inside the product. Pure and
// dependency-free (type-only imports are erased), so node --test can load it
// directly - see tests/plan-access.test.mjs.
//
// Decision (Nov 2026): the People register, evidence trail, document uploads
// and the timing gate on ending employment are included in EVERY HQ People
// and HQ Business plan; the headcount bands (up to 25 / up to 150) are the
// register caps. ONE feature is gated: "I need help writing this" in the
// file-note composer (POST /api/file-notes/assist) is on the up-to-150 plans
// and every enterprise plan only. Standalone HQ Recruit has no HQ People, so
// no help-mode either.
//
// Source of the plan value: businesses.plan (text, default 'growth' in
// supabase/schema.sql). Written by app/api/stripe/webhook/route.ts from
// subscription.metadata.plan, by app/api/onboarding/route.ts (defaults to
// 'free' before payment) and set to 'free' on cancellation.
//
// Unknown and legacy values ('growth', 'free', null, typos) FAIL OPEN: a data
// quirk must never lock an existing customer out of a feature they had.
// Subscription status, not this helper, decides whether a business is live.

import type { PlanId as StripePlanId } from './stripe'

/** Every plan id the Stripe catalogue (lib/stripe.ts PLANS) and webhook know. */
export type PlanId =
  | 'solo'               // HQ Business bundle, up to 25
  | 'business'           // HQ Business bundle, up to 150
  | 'recruit'            // standalone HQ Recruit (hiring only)
  | 'people-solo'        // standalone HQ People, up to 25
  | 'people-business'    // standalone HQ People, up to 150
  | 'enterprise-people'  // HR365
  | 'enterprise-recruit' // Recruit365 (includes the HQ Business bundle)
  | 'enterprise-full'    // HR365 + Recruit365

// Compile-time guard: fails tsc if this list drifts from lib/stripe.ts.
type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false
const PLAN_IDS_MATCH_STRIPE: Same<PlanId, StripePlanId> = true
void PLAN_IDS_MATCH_STRIPE

/** The plan a business needs for help writing a file note. */
export const helpModeRequiredPlan = 'business' as const satisfies PlanId

export const HELP_MODE_PLAN_MESSAGE =
  'Help writing a file note is included on the HQ People plan for up to 150 people. You can still write the note yourself.'

const HELP_MODE_BY_PLAN: Record<PlanId, boolean> = {
  solo: false,
  business: true,
  recruit: false,
  'people-solo': false,
  'people-business': true,
  'enterprise-people': true,
  'enterprise-recruit': true,
  'enterprise-full': true,
}

/** True for a value that is one of the known plan ids. */
export function isKnownPlanId(plan: unknown): plan is PlanId {
  return typeof plan === 'string' && Object.prototype.hasOwnProperty.call(HELP_MODE_BY_PLAN, plan)
}

/**
 * Whether a business on this plan can use "I need help writing this"
 * (Claude-assisted file-note drafting).
 *
 * @param plan - the raw businesses.plan value
 * @returns false only for a KNOWN plan that excludes it (the up-to-25 plans
 *   and standalone HQ Recruit); true for the up-to-150 plans, every
 *   enterprise plan, and any unknown or legacy value (fail-open).
 */
export function planIncludesHelpMode(plan: string | null | undefined): boolean {
  const key = typeof plan === 'string' ? plan.trim().toLowerCase() : ''
  return isKnownPlanId(key) ? HELP_MODE_BY_PLAN[key] : true
}
