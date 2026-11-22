'use client'

// The /checkout order page.
//
// Design notes, because a payment page is where a brand either holds or
// falls apart:
//   - Marketing surface (dark warm slab), set on <html> the same way
//     MarketingHeader does it, so the gold CTA and the near-white ink apply.
//   - ONE filled gold CTA on the page: "Continue to secure payment". Every
//     other control is an outline pill, a radio row or a text link.
//   - The summary is sticky on desktop and a plain block on mobile, so the
//     total and the pay button are always one glance away.
//   - Entrances are CSS keyframes (.hq-reveal), never JS, so nothing can
//     paint blank in a background tab. See CLAUDE.md "Motion".
//
// Card entry itself stays on Stripe. That is deliberate and it is said
// plainly on the page: HQ.ai never handles a card number, which is the
// honest version of the trust line AND the lighter compliance posture.

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import {
  RiAddLine,
  RiArrowLeftLine,
  RiArrowRightLine,
  RiCheckLine,
  RiLoader4Line,
  RiLock2Line,
  RiSubtractLine,
} from '@remixicon/react'
import { ADVISORY_HOURS } from '@/lib/pricing-config'
import {
  CHECKOUT_PLANS,
  amountDueToday,
  effectiveCycle,
  getCheckoutPlan,
  money,
  type CheckoutPlan,
  type CheckoutPlanId,
} from '@/lib/checkout-plans'
import { trackFunnelEvent } from '@/lib/analytics'

// Marketing palette scope. MarketingHeader owns this on every other public
// page; /checkout runs its own slim bar, so it sets the scope itself.
function useMarketingScope() {
  useEffect(() => {
    if (typeof document === 'undefined') return
    const html = document.documentElement
    const prev = html.getAttribute('data-app')
    html.setAttribute('data-app', 'marketing')
    return () => {
      if (prev) html.setAttribute('data-app', prev)
      else html.removeAttribute('data-app')
    }
  }, [])
}

const FOCUS_PILL =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay'

const FAMILY_LABEL: Record<CheckoutPlan['family'], string> = {
  people: 'HR only',
  recruit: 'Hiring only',
  bundle: 'HR and hiring',
}

export default function CheckoutClient({
  initialPlan,
  initialCycle,
  signedIn,
  accountEmail,
}: {
  initialPlan: CheckoutPlanId
  initialCycle: 'monthly' | 'annual'
  signedIn: boolean
  accountEmail: string | null
}) {
  useMarketingScope()

  const [planId, setPlanId] = useState<CheckoutPlanId>(initialPlan)
  const [requestedCycle, setRequestedCycle] = useState<'monthly' | 'annual'>(initialCycle)
  const [hrHours, setHrHours] = useState(0)
  const [recruitHours, setRecruitHours] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const plan = getCheckoutPlan(planId)
  // A plan with no published annual price stays monthly however it was
  // linked in, rather than quoting a figure that does not exist.
  const cycle = effectiveCycle(plan, requestedCycle)
  const annualUnavailable = requestedCycle === 'annual' && cycle === 'monthly'

  const planAmount = amountDueToday(plan, cycle)
  const advisoryHours = hrHours + recruitHours
  const advisoryAmount = advisoryHours * ADVISORY_HOURS.hourlyRate
  const total = planAmount + advisoryAmount

  // Annual saving, stated only when there is a real annual price to compare.
  const annualSaving = plan.annualTotal === null ? 0 : plan.monthly * 12 - plan.annualTotal

  useEffect(() => {
    trackFunnelEvent('payment_step_viewed', { plan: planId, cycle, source: 'checkout_page' })
    // Fire once on arrival, for the plan the buyer landed on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function choosePlan(next: CheckoutPlanId) {
    setPlanId(next)
    setError('')
    trackFunnelEvent('plan_selected', { plan: next, cycle, source: 'checkout_page' })
  }

  function chooseCycle(next: 'monthly' | 'annual') {
    setRequestedCycle(next)
    setError('')
    if (next === 'annual') trackFunnelEvent('annual_nudge_accepted', { plan: planId, cycle: 'annual', source: 'checkout_page' })
  }

  async function pay() {
    setError('')
    setBusy(true)
    trackFunnelEvent('checkout_started', { plan: planId, cycle, source: 'checkout_page' })

    let url: string | undefined
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId,
          cycle,
          returnTo: 'settings',
          advisoryHours: { hr: hrHours, recruit: recruitHours },
        }),
      })
      const data = await res.json().catch(() => ({} as { url?: string; error?: string }))
      if (res.ok && data.url) {
        url = data.url
      } else {
        setError(data.error || `We could not open the payment page (HTTP ${res.status}). Please try again, or email hq.ai@humanistiqs.com.au and we will sort it.`)
      }
    } catch {
      setError('We could not reach the payment page. Please check your connection and try again.')
    }

    if (url) {
      // Busy state stays on through the redirect - clearing it would flash
      // the button back to idle while the browser is already navigating.
      window.location.assign(url)
      return
    }
    setBusy(false)
  }

  const signupHref = `/signup?plan=${planId}&cycle=${cycle}`

  return (
    <div className="min-h-screen bg-bg text-ink antialiased">
      {/* ── Slim checkout bar. A full marketing nav on an order page is a
          row of exits; this keeps the brand and one way back. ────────── */}
      <header className="sticky top-0 z-40 border-b border-border bg-bg/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4 md:px-10">
          <Link href="/" className={`inline-flex items-center rounded-full transition-opacity hover:opacity-80 ${FOCUS_PILL}`}>
            <Image
              src="/logo/png/hqai-lockup-white.png"
              alt="HQ.ai home"
              width={216}
              height={56}
              className="h-7 w-auto"
              priority
            />
          </Link>
          <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.06em] text-ink-soft">
            <RiLock2Line size={14} aria-hidden className="text-clay" />
            Secure checkout
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 pb-20 pt-10 md:px-10 md:pt-14">
        <div className="hq-reveal">
          <p className="mb-4 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.06em] text-clay">
            <span aria-hidden className="h-px w-5 bg-clay" />
            Checkout
          </p>
          <h1 className="max-w-3xl font-display text-[32px] font-bold leading-[1.06] tracking-tight text-ink md:text-[44px]">
            Check your order, then pay.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-ink-soft md:text-lg">
            Unlimited logins on every plan, no per-seat charge and no lock-in. Change plan or cancel
            from your settings whenever you like.
          </p>
        </div>

        <Steps className="mt-8 hq-reveal" style={{ '--hq-delay': '60ms' } as React.CSSProperties} />

        <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-8">
          {/* ── The order ──────────────────────────────────────────── */}
          <div className="hq-reveal space-y-6" style={{ '--hq-delay': '120ms' } as React.CSSProperties}>
            <section
              aria-labelledby="checkout-plan-heading"
              className="rounded-3xl border border-border bg-bg-elevated p-6 shadow-card md:p-8"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 id="checkout-plan-heading" className="font-display text-xl font-bold tracking-tight text-ink">
                    Your plan
                  </h2>
                  <p className="mt-1 text-sm text-ink-muted">Pick HR, hiring, or both.</p>
                </div>
                <CycleToggle value={requestedCycle} onChange={chooseCycle} />
              </div>

              {annualUnavailable && (
                <p className="mt-4 rounded-xl border border-border bg-bg-soft px-4 py-3 text-sm text-ink-soft">
                  {plan.product} is billed monthly only, so this order is on the monthly price.
                </p>
              )}

              <fieldset className="mt-5">
                <legend className="sr-only">Choose a plan</legend>
                <div className="space-y-2.5">
                  {CHECKOUT_PLANS.map((p) => (
                    <PlanRow
                      key={p.id}
                      plan={p}
                      cycle={requestedCycle}
                      selected={p.id === planId}
                      onSelect={() => choosePlan(p.id)}
                    />
                  ))}
                </div>
              </fieldset>

              <div className="mt-6 border-t border-border pt-5">
                <p className="font-mono text-[11px] uppercase tracking-[0.06em] text-ink-muted">
                  What is included
                </p>
                <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                  <li className="flex items-start gap-2 text-sm text-ink-soft">
                    <RiCheckLine size={16} aria-hidden className="mt-0.5 shrink-0 text-clay" />
                    <span>{plan.credits.toLocaleString('en-AU')} AI actions a month</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-ink-soft">
                    <RiCheckLine size={16} aria-hidden className="mt-0.5 shrink-0 text-clay" />
                    <span>Unlimited logins for your team</span>
                  </li>
                  {plan.features.slice(0, 6).map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-ink-soft">
                      <RiCheckLine size={16} aria-hidden className="mt-0.5 shrink-0 text-clay" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            {/* ── Advisory time. The one real add-on the checkout route
                accepts, charged once on the first invoice. ───────────── */}
            <section
              aria-labelledby="checkout-advisory-heading"
              className="rounded-3xl border border-border bg-bg-elevated p-6 shadow-card md:p-8"
            >
              <h2 id="checkout-advisory-heading" className="font-display text-xl font-bold tracking-tight text-ink">
                Add advisor time
              </h2>
              <p className="mt-1 max-w-xl text-sm leading-relaxed text-ink-muted">
                Time with a Humanistiqs advisor at {money(ADVISORY_HOURS.hourlyRate)} an hour, billed once
                with your first payment. Skip it now and book later from your dashboard if you would rather.
              </p>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <HourStepper
                  label="HR advice"
                  hint="Policies, performance, a tricky conversation"
                  value={hrHours}
                  onChange={setHrHours}
                />
                <HourStepper
                  label="Hiring advice"
                  hint="Role scoping, shortlisting, interview panels"
                  value={recruitHours}
                  onChange={setRecruitHours}
                />
              </div>
            </section>

            <section aria-labelledby="checkout-next-heading" className="rounded-3xl border border-border bg-bg-soft p-6 md:p-8">
              <h2 id="checkout-next-heading" className="font-display text-xl font-bold tracking-tight text-ink">
                What happens next
              </h2>
              <ol className="mt-4 space-y-3">
                {[
                  'You enter your card on Stripe, the payment provider. We never see the number.',
                  'Your workspace switches on straight away and you land back in HQ.ai.',
                  'Your receipt and every invoice after it arrive by email and sit in your settings.',
                ].map((line, i) => (
                  <li key={line} className="flex gap-3 text-sm leading-relaxed text-ink-soft">
                    <span
                      aria-hidden
                      className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-clay/40 font-mono text-[10px] text-clay-ink"
                    >
                      {i + 1}
                    </span>
                    <span>{line}</span>
                  </li>
                ))}
              </ol>
            </section>
          </div>

          {/* ── Order summary ──────────────────────────────────────── */}
          <aside
            aria-labelledby="checkout-summary-heading"
            className="hq-reveal lg:sticky lg:top-24"
            style={{ '--hq-delay': '180ms' } as React.CSSProperties}
          >
            <div className="rounded-3xl border border-border bg-bg-elevated p-6 shadow-card">
              <h2 id="checkout-summary-heading" className="font-display text-lg font-bold tracking-tight text-ink">
                Order summary
              </h2>

              <dl className="mt-5 space-y-3 text-sm">
                <div className="flex items-start justify-between gap-4">
                  <dt className="text-ink-soft">
                    {plan.product}
                    {plan.band ? ` (${plan.band})` : ''}
                    <span className="block text-xs text-ink-muted">
                      {cycle === 'annual' ? 'Billed yearly' : 'Billed monthly'}
                    </span>
                  </dt>
                  <dd className="shrink-0 font-medium text-ink">{money(planAmount)}</dd>
                </div>

                {advisoryHours > 0 && (
                  <div className="flex items-start justify-between gap-4">
                    <dt className="text-ink-soft">
                      Advisor time
                      <span className="block text-xs text-ink-muted">
                        {advisoryHours} {advisoryHours === 1 ? 'hour' : 'hours'} at {money(ADVISORY_HOURS.hourlyRate)} an hour, one off
                      </span>
                    </dt>
                    <dd className="shrink-0 font-medium text-ink">{money(advisoryAmount)}</dd>
                  </div>
                )}

                {cycle === 'annual' && annualSaving > 0 && (
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-clay-ink">Yearly saving</dt>
                    <dd className="shrink-0 font-medium text-clay-ink">{money(annualSaving)}</dd>
                  </div>
                )}
              </dl>

              <div className="mt-5 flex items-end justify-between gap-4 border-t border-border pt-5">
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-[0.06em] text-ink-muted">Due today</p>
                  <p className="mt-1 text-xs text-ink-muted">AUD</p>
                </div>
                <p className="font-display text-[34px] font-bold leading-none tracking-tight text-ink">
                  {money(total)}
                </p>
              </div>

              <p className="mt-3 text-xs leading-relaxed text-ink-muted">
                {cycle === 'annual'
                  ? `Then ${money(planAmount)} a year until you cancel.`
                  : `Then ${money(plan.monthly)} a month until you cancel.`}
              </p>

              {error && (
                <p role="alert" className="mt-4 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
                  {error}
                </p>
              )}

              <div className="mt-5">
                {signedIn ? (
                  <button
                    type="button"
                    onClick={pay}
                    disabled={busy}
                    aria-busy={busy}
                    className={`inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-clay px-6 text-sm font-semibold text-ink-on-clay shadow-card transition-all duration-base hover:bg-clay-hover active:translate-y-px disabled:opacity-70 ${FOCUS_PILL}`}
                  >
                    {busy ? (
                      <>
                        <RiLoader4Line size={16} aria-hidden className="animate-spin" />
                        Opening payment
                      </>
                    ) : (
                      <>
                        Continue to secure payment
                        <RiArrowRightLine size={16} aria-hidden />
                      </>
                    )}
                  </button>
                ) : (
                  <Link
                    href={signupHref}
                    className={`inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-clay px-6 text-sm font-semibold text-ink-on-clay shadow-card transition-all duration-base hover:bg-clay-hover active:translate-y-px ${FOCUS_PILL}`}
                  >
                    Create your account
                    <RiArrowRightLine size={16} aria-hidden />
                  </Link>
                )}
              </div>

              {!signedIn && (
                <p className="mt-3 text-xs leading-relaxed text-ink-muted">
                  Takes about a minute. Your plan choice carries over, and you pay on the next step.
                </p>
              )}
              {signedIn && accountEmail && (
                <p className="mt-3 text-xs leading-relaxed text-ink-muted">
                  Paying as {accountEmail}. The receipt goes to that address.
                </p>
              )}

              <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-ink-muted">
                <RiLock2Line size={14} aria-hidden className="mt-0.5 shrink-0 text-ink-soft" />
                <span>Card details are entered on Stripe. HQ.ai never sees your card number.</span>
              </p>

              <ul className="mt-5 space-y-2 border-t border-border pt-5">
                {['Cancel any time, no lock-in', 'Unlimited logins, no per-seat charge', 'Built in Australia, for Australian rules'].map((line) => (
                  <li key={line} className="flex items-start gap-2 text-xs text-ink-soft">
                    <RiCheckLine size={14} aria-hidden className="mt-0.5 shrink-0 text-clay" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 px-1 text-xs">
              <Link
                href="/pricing"
                className={`inline-flex min-h-touch items-center gap-1.5 rounded-full text-ink-soft transition-colors hover:text-ink ${FOCUS_PILL}`}
              >
                <RiArrowLeftLine size={14} aria-hidden />
                Back to plans
              </Link>
              <Link
                href="/contact"
                className={`inline-flex min-h-touch items-center rounded-full text-ink-soft underline-offset-4 transition-colors hover:text-ink hover:underline ${FOCUS_PILL}`}
              >
                Questions? Talk to us
              </Link>
            </div>
          </aside>
        </div>
      </main>
    </div>
  )
}

// ── Step rail ──────────────────────────────────────────────────────────
// Three states, flat: done, now, next. No progress bar fills and nothing
// animates - the buyer's position is the only information here.
function Steps({ className, style }: { className?: string; style?: React.CSSProperties }) {
  const steps = [
    { label: 'Pick a plan', state: 'done' as const },
    { label: 'Pay', state: 'now' as const },
    { label: 'Start using HQ.ai', state: 'next' as const },
  ]
  return (
    <ol className={`flex flex-wrap items-center gap-x-3 gap-y-2 ${className ?? ''}`} style={style}>
      {steps.map((s, i) => (
        <li key={s.label} className="flex items-center gap-3">
          <span className="flex items-center gap-2">
            <span
              aria-hidden
              className={`flex h-5 w-5 items-center justify-center rounded-full font-mono text-[10px] ${
                s.state === 'done'
                  ? 'bg-clay text-ink-on-clay'
                  : s.state === 'now'
                  ? 'border border-clay text-clay-ink'
                  : 'border border-border text-ink-muted'
              }`}
            >
              {s.state === 'done' ? <RiCheckLine size={12} /> : i + 1}
            </span>
            <span className={`text-sm ${s.state === 'next' ? 'text-ink-muted' : 'text-ink'}`}>
              {s.label}
              {s.state === 'now' && <span className="sr-only"> (current step)</span>}
            </span>
          </span>
          {i < steps.length - 1 && <span aria-hidden className="h-px w-6 bg-border" />}
        </li>
      ))}
    </ol>
  )
}

// ── Billing cycle ──────────────────────────────────────────────────────
function CycleToggle({
  value,
  onChange,
}: {
  value: 'monthly' | 'annual'
  onChange: (next: 'monthly' | 'annual') => void
}) {
  const options: Array<{ k: 'monthly' | 'annual'; label: string }> = [
    { k: 'monthly', label: 'Monthly' },
    { k: 'annual', label: 'Yearly' },
  ]
  return (
    <div role="group" aria-label="Billing cycle" className="flex items-center gap-1 rounded-full border border-border bg-bg-soft p-1">
      {options.map((o) => {
        const on = o.k === value
        return (
          <button
            key={o.k}
            type="button"
            onClick={() => onChange(o.k)}
            aria-pressed={on}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors duration-base ${FOCUS_PILL} ${
              on ? 'bg-ink text-bg' : 'text-ink-soft hover:text-ink'
            }`}
          >
            {o.label}
            {o.k === 'annual' && <span className="ml-1 font-normal opacity-70">2 months free</span>}
          </button>
        )
      })}
    </div>
  )
}

// ── One selectable plan ────────────────────────────────────────────────
// A real radio, so arrow keys move between plans and the selection is
// announced. The whole row is the label, so the whole row is the target.
function PlanRow({
  plan,
  cycle,
  selected,
  onSelect,
}: {
  plan: CheckoutPlan
  cycle: 'monthly' | 'annual'
  selected: boolean
  onSelect: () => void
}) {
  const billed = effectiveCycle(plan, cycle)
  const amount = amountDueToday(plan, billed)
  const suffix = billed === 'annual' ? 'a year' : 'a month'

  return (
    <label
      className={`group flex cursor-pointer items-center gap-4 rounded-2xl border p-4 transition-all duration-base hover:-translate-y-0.5 ${
        selected
          ? 'border-clay bg-clay-soft'
          : 'border-border bg-bg hover:border-border-strong'
      }`}
    >
      <input
        type="radio"
        name="checkout-plan"
        value={plan.id}
        checked={selected}
        onChange={onSelect}
        // Named explicitly rather than left to the wrapping label, whose
        // text content would be read as one run-on string of name, kicker,
        // credits and price.
        aria-label={`${plan.product}${plan.band ? ` for a team ${plan.band}` : ''}, ${money(amount)} ${suffix}`}
        className="peer sr-only"
      />
      {/* The input is visually hidden, so the keyboard indicator has to be
          painted on this marker instead - otherwise tabbing through the
          plans shows nothing at all. */}
      <span
        aria-hidden
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-clay ${
          selected ? 'border-clay bg-clay text-ink-on-clay' : 'border-border-strong text-transparent'
        }`}
      >
        <RiCheckLine size={12} />
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-baseline gap-x-2">
          <span className="text-sm font-semibold text-ink">
            {plan.product}
            {plan.band ? ` (${plan.band})` : ''}
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.06em] text-ink-muted">
            {FAMILY_LABEL[plan.family]}
          </span>
        </span>
        <span className="mt-0.5 block text-xs text-ink-muted">
          {plan.credits.toLocaleString('en-AU')} AI actions a month
        </span>
      </span>

      <span className="shrink-0 text-right">
        <span className="block text-sm font-semibold text-ink">{money(amount)}</span>
        <span className="block text-xs text-ink-muted">{suffix}</span>
      </span>
    </label>
  )
}

// ── Advisor hours ──────────────────────────────────────────────────────
function HourStepper({
  label,
  hint,
  value,
  onChange,
}: {
  label: string
  hint: string
  value: number
  onChange: (next: number) => void
}) {
  const max = ADVISORY_HOURS.maxHours
  const clamp = (n: number) => Math.min(Math.max(n, 0), max)
  const btn =
    `flex h-9 w-9 items-center justify-center rounded-full border border-border text-ink-soft transition-colors duration-base hover:border-border-strong hover:text-ink disabled:opacity-40 disabled:hover:border-border ${FOCUS_PILL}`

  return (
    <div className="rounded-2xl border border-border bg-bg p-4">
      <p className="text-sm font-semibold text-ink">{label}</p>
      <p className="mt-0.5 text-xs leading-relaxed text-ink-muted">{hint}</p>
      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          onClick={() => onChange(clamp(value - 1))}
          disabled={value === 0}
          aria-label={`One less hour of ${label.toLowerCase()}`}
          className={btn}
        >
          <RiSubtractLine size={16} aria-hidden />
        </button>
        <p aria-live="polite" className="min-w-[4.5rem] text-center text-sm text-ink">
          <span className="font-semibold">{value}</span>
          <span className="text-ink-muted"> {value === 1 ? 'hour' : 'hours'}</span>
        </p>
        <button
          type="button"
          onClick={() => onChange(clamp(value + 1))}
          disabled={value === max}
          aria-label={`One more hour of ${label.toLowerCase()}`}
          className={btn}
        >
          <RiAddLine size={16} aria-hidden />
        </button>
      </div>
    </div>
  )
}
