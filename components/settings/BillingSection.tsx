'use client'

// Settings > Billing. The in-product half of the HQ.ai payment surface.
//
// Rebuilt Nov 2026. It used to be a plan name, a status word and two
// buttons, which meant every real billing question ("when am I next
// charged?", "which card is on file?", "where is last month's invoice?")
// ended in the Stripe portal or an email to support. Now the panel answers
// them in HQ.ai, on brand, and keeps Stripe for the two jobs that have to
// live there: entering a card and editing a subscription.
//
// Changing plan hands off to /checkout, the same branded order page the
// public funnel uses, so there is ONE payment path in the product rather
// than a second inline one that drifts out of step with it.
//
// Everything reads from GET /api/stripe/subscription, which never fails the
// whole payload for one missing piece - so this component always has a
// sensible empty state and never shows an error for "no history yet".

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  RiBankCardLine,
  RiCheckLine,
  RiExternalLinkLine,
  RiFileTextLine,
  RiLock2Line,
} from '@remixicon/react'
import { SettingsSection } from './SettingsSection'
import { StatusPill, type PillTone } from '@/components/ui/StatusPill'
import { InlineActionButton } from '@/components/ui/inline-action'
import { TAX } from '@/lib/pricing-config'
import {
  CHECKOUT_PLANS,
  amountDueToday,
  effectiveCycle,
  money,
  type CheckoutPlan,
} from '@/lib/checkout-plans'

interface BillingSnapshot {
  configured: boolean
  subscription: {
    status: string
    cycle: 'monthly' | 'annual' | null
    amount: number | null
    currency: string
    currentPeriodEnd: string | null
    cancelAtPeriodEnd: boolean
    trialEnd: string | null
  } | null
  paymentMethod: { brand: string; last4: string; expMonth: number; expYear: number } | null
  invoices: Array<{
    id: string
    date: string
    amount: number
    currency: string
    status: string
    number: string | null
    hostedUrl: string | null
    pdfUrl: string | null
  }>
  credits: { allocated: number; used: number; remaining: number } | null
}

const FOCUS = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30'

// businesses.plan can hold a legacy or unknown value ('growth', null). Name
// what we recognise and show the raw value otherwise - never guess a price
// for a plan we cannot identify.
const EXTRA_PLAN_LABELS: Record<string, string> = {
  free: 'Beta access',
  growth: 'Growth (legacy)',
  'enterprise-people': 'HR365',
  'enterprise-recruit': 'Recruit365',
  'enterprise-full': 'HR365 and Recruit365',
}

function planLabel(plan: string): string {
  const known = CHECKOUT_PLANS.find((p) => p.id === plan)
  if (known) return known.band ? `${known.product} (${known.band})` : known.product
  return EXTRA_PLAN_LABELS[plan] ?? plan
}

function statusTone(status: string): PillTone {
  if (status === 'active') return 'success'
  if (status === 'trialing') return 'info'
  if (status === 'past_due' || status === 'unpaid' || status === 'incomplete') return 'warning'
  if (status === 'canceled' || status === 'cancelled') return 'danger'
  return 'neutral'
}

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    active: 'Active',
    trialing: 'Beta access',
    past_due: 'Payment overdue',
    unpaid: 'Unpaid',
    incomplete: 'Payment incomplete',
    canceled: 'Cancelled',
    cancelled: 'Cancelled',
  }
  return map[status] ?? status.replace(/_/g, ' ')
}

function longDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })
}

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' })
}

// "visa" -> "Visa", "amex" -> "Amex". Stripe sends a lowercase slug.
function cardBrand(brand: string): string {
  if (brand === 'amex') return 'Amex'
  if (brand === 'mastercard') return 'Mastercard'
  return brand.replace(/\b\w/g, (c) => c.toUpperCase())
}

export function BillingSection({
  plan,
  subscriptionStatus,
  hasStripe,
}: {
  plan: string
  subscriptionStatus: string
  hasStripe: boolean
}) {
  const searchParams = useSearchParams()
  const [billingError, setBillingError] = useState('')
  const [snapshot, setSnapshot] = useState<BillingSnapshot | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [cycle, setCycle] = useState<'monthly' | 'annual'>('monthly')

  // A stripe_customer_id is created the moment checkout STARTS, before any
  // payment, so an active subscription is the only safe test for "paid".
  const isSubscribed = subscriptionStatus === 'active'

  useEffect(() => {
    let alive = true
    fetch('/api/stripe/subscription')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: BillingSnapshot | null) => {
        if (alive) setSnapshot(data)
      })
      .catch(() => {
        // A failed snapshot is not an error the customer needs to see - the
        // panel falls back to the plan name it was handed as a prop.
      })
      .finally(() => {
        if (alive) setLoaded(true)
      })
    return () => {
      alive = false
    }
  }, [])

  // Resolves only once we are navigating, so the control keeps its loading
  // bar running through the redirect. Every failure throws, which drops it
  // back to the idle label beside the error banner.
  const openPortal = useCallback(async () => {
    setBillingError('')
    let url: string | undefined
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' })
      const data = await res.json()
      url = data.url
      if (!url) {
        setBillingError(data.error || 'Could not open the billing portal. Please try again or contact support.')
      }
    } catch {
      setBillingError('Could not open the billing portal. Please check your connection and try again.')
    }
    if (!url) throw new Error('Billing portal unavailable')
    window.location.assign(url)
  }, [])

  const sub = snapshot?.subscription ?? null
  const credits = snapshot?.credits ?? null
  const invoices = snapshot?.invoices ?? []
  const card = snapshot?.paymentMethod ?? null

  const status = sub?.status ?? subscriptionStatus
  const renewalDate = sub?.currentPeriodEnd ? longDate(sub.currentPeriodEnd) : null

  return (
    <>
      {billingError && (
        <div role="alert" className="mb-4 flex items-start gap-2 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          <span className="flex-1">{billingError}</span>
          <button
            onClick={() => setBillingError('')}
            aria-label="Dismiss error"
            className={`min-h-touch min-w-touch rounded-full font-bold text-danger hover:text-ink ${FOCUS}`}
          >
            &times;
          </button>
        </div>
      )}

      {searchParams.get('billing') === 'success' && (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">
          <RiCheckLine size={16} aria-hidden className="mt-0.5 shrink-0" />
          <span>Payment received. Your plan is active.</span>
        </div>
      )}

      {/* ── Plan ─────────────────────────────────────────────────────── */}
      <SettingsSection
        id="billing"
        title="Plan"
        description="What you are on, what it costs and when it renews."
      >
        <div className="rounded-2xl border border-border bg-bg-soft p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-display text-lg font-bold tracking-tight text-ink">{planLabel(plan)}</p>
                <StatusPill tone={statusTone(status)} label={statusLabel(status)} />
                {sub?.cancelAtPeriodEnd && <StatusPill tone="warning" label="Ends at period end" />}
              </div>
              <p className="mt-1.5 text-sm text-ink-muted">
                {/* The charge is GST inclusive, like every figure in
                    lib/pricing-config.ts - said here because the renewal
                    amount is the number a customer checks against their
                    statement. */}
                {sub?.amount !== null && sub?.amount !== undefined
                  ? `${money(sub.amount)} ${sub.cycle === 'annual' ? 'a year' : 'a month'}, incl. ${TAX.name}`
                  : 'No charge on this plan'}
                {renewalDate && (
                  <>
                    {' · '}
                    {sub?.cancelAtPeriodEnd ? 'access until' : 'renews'} {renewalDate}
                  </>
                )}
              </p>
            </div>
            {hasStripe && (
              <InlineActionButton
                size="sm"
                actionText="Manage in Stripe"
                successLabel="Opening the billing portal"
                onAction={openPortal}
                width={168}
                // The control's own `default` track is bg-bg-soft, which is
                // this panel's fill - without an edge it reads as a label,
                // not a button.
                className="border border-border"
              />
            )}
          </div>

          {/* AI actions used this period. The bar's width carries the
              number; .hq-bar-fill animates scaleX so the resting state is
              the finished one (CLAUDE.md "Motion"). */}
          {credits && credits.allocated > 0 && (
            <div className="mt-5 border-t border-border pt-4">
              <div className="flex items-baseline justify-between gap-3">
                <p className="font-mono text-[11px] uppercase tracking-[0.06em] text-ink-muted">
                  AI actions this period
                </p>
                <p className="text-sm text-ink">
                  <span className="font-semibold">{credits.used.toLocaleString('en-AU')}</span>
                  <span className="text-ink-muted"> of {credits.allocated.toLocaleString('en-AU')}</span>
                </p>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-border">
                <div
                  className="hq-bar-fill h-full rounded-full bg-clay"
                  style={{ width: `${Math.min(100, Math.round((credits.used / credits.allocated) * 100))}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-ink-muted">
                {credits.remaining.toLocaleString('en-AU')} left. They reset each billing period.
              </p>
            </div>
          )}
        </div>

        {/* ── Change plan ────────────────────────────────────────────── */}
        <div className="mt-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-semibold text-ink">
              {isSubscribed ? 'Move to another plan' : 'Choose a plan'}
            </p>
            <div role="group" aria-label="Billing cycle" className="flex items-center gap-1 rounded-full border border-border bg-bg-soft p-1">
              {([
                { k: 'monthly' as const, label: 'Monthly' },
                { k: 'annual' as const, label: 'Yearly' },
              ]).map((o) => {
                const on = o.k === cycle
                return (
                  <button
                    key={o.k}
                    type="button"
                    onClick={() => setCycle(o.k)}
                    aria-pressed={on}
                    className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors duration-base ${FOCUS} ${
                      on ? 'bg-ink text-bg' : 'text-ink-soft hover:text-ink'
                    }`}
                  >
                    {o.label}
                  </button>
                )
              })}
            </div>
          </div>

          <ul className="mt-3 space-y-2.5">
            {CHECKOUT_PLANS.map((p) => (
              <PlanOption key={p.id} plan={p} cycle={cycle} current={p.id === plan} />
            ))}
          </ul>

          <p className="mt-3 text-xs leading-relaxed text-ink-muted">
            All prices include {TAX.name}. Every plan has unlimited logins and no lock-in. Need a dedicated advisor on call?{' '}
            <Link href="/outsourcing" className={`text-accent underline-offset-4 hover:underline ${FOCUS}`}>
              HR365 and Recruit365
            </Link>{' '}
            are arranged with us directly.
          </p>
        </div>
      </SettingsSection>

      {/* ── Payment method ───────────────────────────────────────────── */}
      <SettingsSection
        id="payment-method"
        title="Payment method"
        description="Held by Stripe. HQ.ai never sees your card number."
      >
        {card ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-bg-soft p-4">
            <div className="flex items-center gap-3">
              <span aria-hidden className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-bg text-ink-soft">
                <RiBankCardLine size={18} />
              </span>
              <div>
                <p className="text-sm font-semibold text-ink">
                  {cardBrand(card.brand)} ending {card.last4}
                </p>
                <p className="text-xs text-ink-muted">
                  Expires {String(card.expMonth).padStart(2, '0')}/{String(card.expYear).slice(-2)}
                </p>
              </div>
            </div>
            <InlineActionButton
              size="sm"
              actionText="Update card"
              successLabel="Opening the billing portal"
              onAction={openPortal}
              width={140}
              className="border border-border"
            />
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-bg-soft p-4">
            <p className="flex items-start gap-2 text-sm text-ink-soft">
              <RiLock2Line size={16} aria-hidden className="mt-0.5 shrink-0 text-ink-muted" />
              <span>
                {loaded
                  ? 'No card saved yet. You add one when you pay for a plan.'
                  : 'Checking for a saved card.'}
              </span>
            </p>
          </div>
        )}
      </SettingsSection>

      {/* ── Invoices ─────────────────────────────────────────────────── */}
      <SettingsSection
        id="invoices"
        title="Invoices"
        description="Your receipts, newest first. Each one opens in Stripe."
      >
        {invoices.length > 0 ? (
          <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-bg-soft">
            {invoices.map((inv) => (
              <li key={inv.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink">{shortDate(inv.date)}</p>
                  <p className="text-xs text-ink-muted">
                    {money(inv.amount)} {inv.currency}
                    {inv.number ? ` · ${inv.number}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusPill
                    tone={inv.status === 'paid' ? 'success' : inv.status === 'open' ? 'warning' : 'neutral'}
                    label={inv.status === 'paid' ? 'Paid' : inv.status.replace(/_/g, ' ')}
                  />
                  {inv.hostedUrl && (
                    <a
                      href={inv.hostedUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`inline-flex min-h-touch items-center gap-1.5 rounded-full px-1 text-xs font-semibold text-accent underline-offset-4 transition-colors hover:underline ${FOCUS}`}
                    >
                      View
                      <RiExternalLinkLine size={13} aria-hidden />
                      <span className="sr-only">invoice from {shortDate(inv.date)}, opens in a new tab</span>
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-2xl border border-border bg-bg-soft p-4">
            <p className="flex items-start gap-2 text-sm text-ink-soft">
              <RiFileTextLine size={16} aria-hidden className="mt-0.5 shrink-0 text-ink-muted" />
              <span>{loaded ? 'No invoices yet. Your first one lands the day you pay.' : 'Loading your invoices.'}</span>
            </p>
          </div>
        )}
      </SettingsSection>
    </>
  )
}

// One plan row in the change-plan list. The row links to /checkout with the
// selection already made, so the dashboard and the public site share one
// payment page. The current plan is shown but not linkable.
function PlanOption({
  plan,
  cycle,
  current,
}: {
  plan: CheckoutPlan
  cycle: 'monthly' | 'annual'
  current: boolean
}) {
  const billed = effectiveCycle(plan, cycle)
  const amount = amountDueToday(plan, billed)
  const name = plan.band ? `${plan.product} (${plan.band})` : plan.product

  const body = (
    <>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-baseline gap-x-2">
          <span className="text-sm font-semibold text-ink">{name}</span>
          <span className="font-mono text-[10px] uppercase tracking-[0.06em] text-ink-muted">{plan.kicker}</span>
        </span>
        <span className="mt-0.5 block text-xs text-ink-muted">
          {plan.credits.toLocaleString('en-AU')} AI actions a month
        </span>
      </span>
      <span className="shrink-0 text-right">
        <span className="block text-sm font-semibold text-ink">{money(amount)}</span>
        <span className="block text-xs text-ink-muted">{billed === 'annual' ? 'a year' : 'a month'}</span>
      </span>
    </>
  )

  if (current) {
    return (
      <li className="flex items-center gap-4 rounded-2xl border border-clay bg-clay-soft p-4">
        {body}
        <StatusPill tone="gold" label="Current" className="shrink-0" />
      </li>
    )
  }

  return (
    <li>
      <Link
        href={`/checkout?plan=${plan.id}&cycle=${billed}`}
        className={`flex items-center gap-4 rounded-2xl border border-border bg-bg p-4 transition-all duration-base hover:-translate-y-0.5 hover:border-border-strong ${FOCUS}`}
      >
        {body}
      </Link>
    </li>
  )
}
