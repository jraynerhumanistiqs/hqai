// lib/funnel-events.ts
//
// Single source of truth for the self-serve funnel event names. The
// client helper (lib/analytics.ts), the ingest API route
// (app/api/telemetry/funnel/route.ts) and the unit tests all import
// this list, so an event can only ever be renamed in one place.
//
// Event names and their properties come from the funnel metrics table
// in the sales-funnel spec (Agent 1 section 5). billing_banner_shown /
// billing_banner_dismissed cover the unpaid soft-gate banner
// interactions; welcome_viewed covers the /welcome success and
// cancelled variants.

export const FUNNEL_EVENTS = [
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
  'recovery_email_sent',
  'dashboard_first_view',
  'billing_gate_shown',
  'billing_banner_shown',
  'billing_banner_dismissed',
  'upsell_shown',
  'upsell_clicked',
  'document_purchased',
  'welcome_viewed',
] as const

export type FunnelEvent = (typeof FUNNEL_EVENTS)[number]

export function isFunnelEvent(value: unknown): value is FunnelEvent {
  return typeof value === 'string' && (FUNNEL_EVENTS as readonly string[]).includes(value)
}
