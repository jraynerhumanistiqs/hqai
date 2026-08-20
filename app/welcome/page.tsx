'use client'
// /welcome - where Stripe Checkout returns the self-serve funnel.
// Two variants on one route, switched by ?state=success|cancelled
// (set by buildCheckoutReturnUrls in lib/stripe.ts):
//   success:   plan is active - restrained celebration, one CTA in.
//   cancelled: no payment taken - saved-state reassurance, resume CTA.
// The tail of the self-serve funnel, so it wears the same dark, warm
// marketing palette as /onboarding: app/welcome/layout.tsx scopes the
// route to data-app="marketing". No MarketingHeader, no ThemeBoundary.

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import PlanSummaryCard, { isCheckoutPlanId, type CheckoutPlanId } from '@/components/onboarding/PlanSummaryCard'
import { trackFunnelEvent } from '@/lib/analytics'

const FIRST_ACTIONS: Array<[string, string]> = [
  ['Ask one real question', 'A leave question, a pay question - anything on your plate right now.'],
  ['Check a rule you are unsure about', 'Try "how much notice do I owe a casual after seven months?"'],
  ['Add your managers', 'Unlimited logins on every plan, at no extra cost.'],
]

// Query form (shown to a buyer who backed out of checkout). Kept short -
// name/email/business/plan are recalled server-side, not re-asked. The
// topic chip helps the team triage; the message is the substance.
const QUERY_TOPICS = ['Pricing & plans', 'Which plan fits us', 'Outsourced HR / Recruitment', 'How it works', 'Something else']
const QUERY_TIMES = ['Morning', 'Midday', 'Afternoon']

export default function WelcomePage() {
  const [ready, setReady] = useState(false)
  const [variant, setVariant] = useState<'success' | 'cancelled' | ''>('')
  const [plan, setPlan] = useState<CheckoutPlanId | null>(null)
  const [cycle, setCycle] = useState<'monthly' | 'annual'>('monthly')
  const [loading, setLoading] = useState(false)
  const [checkoutError, setCheckoutError] = useState<'' | 'unconfigured' | 'generic'>('')
  // Query form (cancelled variant): a paused buyer asks a question.
  const [queryOpen, setQueryOpen] = useState(false)
  const [qTopic, setQTopic] = useState<string | null>(null)
  const [qMessage, setQMessage] = useState('')
  const [qPhone, setQPhone] = useState('')
  const [qTimes, setQTimes] = useState<string[]>([])
  const [qSubmitting, setQSubmitting] = useState(false)
  const [qSubmitted, setQSubmitted] = useState(false)
  const [qError, setQError] = useState('')
  const tracked = useRef(false)
  const supabase = createClient()

  useEffect(() => {
    let cancelled = false
    async function init() {
      const q = new URLSearchParams(window.location.search)
      const state = q.get('state')
      if (state !== 'success' && state !== 'cancelled') {
        // No zero-state on this page - anything else goes home.
        window.location.replace('/dashboard')
        return
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (cancelled) return
      if (!user) {
        window.location.href = '/login'
        return
      }

      const qPlan = q.get('plan')
      const qCycle = q.get('cycle')
      let resolvedPlan: CheckoutPlanId | null = isCheckoutPlanId(qPlan) ? qPlan : null
      if (!resolvedPlan) {
        // Fall back to the business row; if that fails too, render the
        // screen without the plan card - the copy stands alone.
        const { data: profile } = await supabase
          .from('profiles')
          .select('businesses(plan)')
          .eq('id', user.id)
          .maybeSingle()
        const bizPlan = (profile?.businesses as unknown as { plan?: string } | null)?.plan
        resolvedPlan = isCheckoutPlanId(bizPlan) ? bizPlan : null
      }
      if (cancelled) return

      setPlan(resolvedPlan)
      if (qCycle === 'monthly' || qCycle === 'annual') setCycle(qCycle)
      setVariant(state)
      setReady(true)
      document.title = state === 'success' ? 'Welcome - HQ.ai' : 'No payment taken - HQ.ai'

      if (!tracked.current) {
        tracked.current = true
        trackFunnelEvent('welcome_viewed', { plan: resolvedPlan ?? undefined, cycle: qCycle ?? undefined, source: state })
        if (state === 'cancelled') {
          trackFunnelEvent('checkout_cancelled', { plan: resolvedPlan ?? undefined, cycle: qCycle ?? undefined })
        }
      }
    }
    init()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Re-create checkout for the plan/cycle carried in the query params -
  // the same call the onboarding payment step makes.
  async function resumeCheckout() {
    setLoading(true)
    setCheckoutError('')
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: plan ?? 'business', cycle, returnTo: 'onboarding' }),
      })
      const json = await res.json().catch(() => ({} as { url?: string }))
      if (res.ok && (json as { url?: string }).url) {
        trackFunnelEvent('checkout_started', { plan: plan ?? 'business', cycle, source: 'welcome_cancelled' })
        window.location.href = (json as { url: string }).url
        return
      }
      setCheckoutError(res.status === 503 ? 'unconfigured' : 'generic')
    } catch {
      setCheckoutError('generic')
    }
    setLoading(false)
  }

  // Submit the checkout query. Name/email/business/plan are recalled
  // server-side from the session - the form only sends the substance.
  async function submitQuery() {
    if (!qMessage.trim()) {
      setQError('Please add a quick note so we know what to help with.')
      return
    }
    setQSubmitting(true)
    setQError('')
    try {
      const res = await fetch('/api/checkout-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: qTopic, message: qMessage, phone: qPhone, bestTime: qTimes.join(', '), cycle }),
      })
      if (res.ok) {
        trackFunnelEvent('checkout_query_submitted', { plan: plan ?? undefined, cycle, topic: qTopic ?? undefined })
        setQSubmitted(true)
      } else {
        const j = await res.json().catch(() => ({} as { error?: string }))
        setQError((j as { error?: string }).error || 'Something went wrong. Please try again.')
      }
    } catch {
      setQError('Something went wrong. Please try again.')
    }
    setQSubmitting(false)
  }

  if (!ready) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="text-sm text-ink-muted">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Image src="/logo-white.svg" alt="HQ.ai" width={1760} height={570} className="w-[112px] h-auto mx-auto block" />
        </div>

        <div className="bg-bg-elevated border border-border shadow-card rounded-3xl p-8">
          {variant === 'success' ? (
            <>
              <div className="text-center">
                {/* Restrained celebration - the clay-soft disc is the one
                    sanctioned highlight. No confetti. */}
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-clay-soft text-clay animate-in zoom-in-95 fade-in duration-base motion-reduce:animate-none">
                  <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                </div>
                <p className="mb-3 flex items-center justify-center gap-2 font-mono text-[11px] uppercase tracking-[0.06em] text-clay">
                  <span aria-hidden className="h-px w-5 bg-clay" />
                  Welcome to HQ.ai
                </p>
                <h1 className="font-display text-[28px] font-bold tracking-tight text-ink leading-[1.1] mb-1.5">
                  You&apos;re in.
                </h1>
                <p className="text-sm text-ink-soft mb-6">
                  Your plan is active and your workspace is ready. Ask your first question - it&apos;s the fastest way to see what HQ can do.
                </p>
              </div>

              {plan && <PlanSummaryCard planId={plan} cycle={cycle} />}

              <ol className="mt-4 space-y-2">
                {FIRST_ACTIONS.map(([title, desc], i) => (
                  <li key={title} className="flex items-start gap-3 rounded-xl border border-border p-3">
                    <span aria-hidden className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-bg-soft font-mono text-[11px] font-bold text-ink-soft">
                      {i + 1}
                    </span>
                    <p className="text-sm leading-snug text-ink-soft">
                      <strong className="font-semibold text-ink">{title}.</strong> {desc}
                    </p>
                  </li>
                ))}
              </ol>

              <a
                href="/dashboard"
                className="mt-6 inline-flex w-full items-center justify-center bg-clay hover:bg-clay-hover text-ink-on-accent font-bold py-3 rounded-full text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay"
              >
                Open my dashboard
              </a>

              <p className="mt-3 text-center text-xs text-ink-muted">
                Your receipt is on its way to your email.
              </p>
            </>
          ) : (
            <>
              <div className="text-center">
                {/* Neutral 'saved' bookmark - never red. Nothing went wrong
                    from the user's point of view. */}
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-bg-soft text-ink-soft">
                  <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                  </svg>
                </div>
                <p className="mb-3 flex items-center justify-center gap-2 font-mono text-[11px] uppercase tracking-[0.06em] text-clay">
                  <span aria-hidden className="h-px w-5 bg-clay" />
                  Saved for later
                </p>
                <h1 className="font-display text-[28px] font-bold tracking-tight text-ink leading-[1.1] mb-1.5">
                  No payment taken
                </h1>
                <p className="text-sm text-ink-soft mb-6">
                  Everything you set up is saved - your business details, your advisor, your plan. Start it whenever you&apos;re ready. It takes about a minute.
                </p>
              </div>

              {checkoutError === 'unconfigured' && (
                <div role="alert" className="mb-4 bg-danger/10 border border-danger/30 rounded-lg px-3 py-2.5 text-sm text-danger">
                  Card payments for this plan aren&apos;t switched on just yet. Nothing has been charged and everything you set up is saved.{' '}
                  <a href="mailto:hq.ai@humanistiqs.com.au" className="font-semibold text-ink underline underline-offset-2 hover:text-ink-soft">Email us</a>
                  {' '}and we&apos;ll sort it.
                </div>
              )}
              {checkoutError === 'generic' && (
                <div role="alert" className="mb-4 bg-danger/10 border border-danger/30 rounded-lg px-3 py-2.5 text-sm text-danger">
                  Something went wrong starting checkout. No payment was taken. Please try again.
                </div>
              )}

              <button
                type="button"
                onClick={resumeCheckout}
                disabled={loading}
                aria-busy={loading}
                className="w-full bg-clay hover:bg-clay-hover text-ink-on-accent font-bold py-3 rounded-full text-sm transition-colors disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay"
              >
                {loading ? 'Taking you to secure checkout...' : 'Start my plan'}
              </button>

              <p className="mt-4 text-center text-xs leading-relaxed text-ink-soft">
                Second guessing a HQ.ai subscription? Feel free to{' '}
                <button
                  type="button"
                  onClick={() => {
                    setQueryOpen(true)
                    trackFunnelEvent('checkout_query_opened', { plan: plan ?? undefined, cycle })
                  }}
                  className="font-semibold text-ink underline underline-offset-2 hover:text-ink-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-clay/30 rounded-sm"
                >
                  submit a query here
                </button>
                {' '}- someone from the HQ.ai team will be sure to reach out and help clarify any questions you may have.
              </p>

              <p className="mt-3 text-center text-xs text-ink-muted">
                No lock-in on any plan. Cancel any time.
              </p>
            </>
          )}
        </div>
      </div>

      {/* Checkout query modal - a paused buyer asks a question. Name, email,
          business and plan are recalled server-side, so the form stays short. */}
      {queryOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Ask the HQ.ai team a question"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onKeyDown={e => { if (e.key === 'Escape') setQueryOpen(false) }}
        >
          <div className="absolute inset-0 bg-ink/60" onClick={() => setQueryOpen(false)} aria-hidden />
          <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-3xl border border-border bg-bg-elevated shadow-card p-6 animate-in fade-in zoom-in-95 duration-base motion-reduce:animate-none">
            {!qSubmitted ? (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="mb-2 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.06em] text-clay">
                      <span aria-hidden className="h-px w-5 bg-clay" />
                      Before you go
                    </p>
                    <h2 className="font-display text-xl font-bold tracking-tight text-ink leading-tight">Ask us anything</h2>
                  </div>
                  <button type="button" onClick={() => setQueryOpen(false)} aria-label="Close"
                    className="shrink-0 text-lg leading-none text-ink-muted hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-clay/30 rounded-sm">
                    &#10005;
                  </button>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-ink-muted">
                  A quick note is all we need - we already have your business details from setup. We&apos;ll reach out to organise a 30-minute discovery call.
                </p>

                <p className="mt-4 mb-1.5 font-mono text-[11px] uppercase tracking-[0.06em] text-ink-muted">What is it about?</p>
                <div className="flex flex-wrap gap-2">
                  {QUERY_TOPICS.map(t => {
                    const on = qTopic === t
                    return (
                      <button key={t} type="button" aria-pressed={on} onClick={() => setQTopic(on ? null : t)}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-clay/30
                          ${on ? 'bg-clay text-ink-on-accent border-clay' : 'bg-bg-elevated border-border text-ink-soft hover:border-ink'}`}>
                        {t}
                      </button>
                    )
                  })}
                </div>

                <label htmlFor="q-msg" className="mt-4 mb-1.5 block font-mono text-[11px] uppercase tracking-[0.06em] text-ink-muted">
                  What would you like to get out of the call?
                </label>
                <textarea id="q-msg" value={qMessage} onChange={e => setQMessage(e.target.value)} rows={3}
                  placeholder="e.g. Not sure which plan fits a team of 20, and whether outsourced HR is worth it for us."
                  className="w-full rounded-xl border border-border bg-bg px-3 py-2.5 text-sm text-ink placeholder-ink-muted outline-none transition-colors focus:border-clay focus:ring-2 focus:ring-clay/30" />

                <label htmlFor="q-phone" className="mt-3 mb-1.5 block font-mono text-[11px] uppercase tracking-[0.06em] text-ink-muted">
                  Best number to reach you (optional)
                </label>
                <input id="q-phone" value={qPhone} onChange={e => setQPhone(e.target.value)} inputMode="tel" placeholder="04xx xxx xxx"
                  className="w-full rounded-xl border border-border bg-bg px-3 py-2.5 text-sm text-ink placeholder-ink-muted outline-none transition-colors focus:border-clay focus:ring-2 focus:ring-clay/30" />

                <p className="mt-3 mb-1.5 font-mono text-[11px] uppercase tracking-[0.06em] text-ink-muted">Best time to call (optional)</p>
                <div className="flex flex-wrap gap-2">
                  {QUERY_TIMES.map(t => {
                    const on = qTimes.includes(t)
                    return (
                      <button key={t} type="button" aria-pressed={on}
                        onClick={() => setQTimes(s => on ? s.filter(x => x !== t) : [...s, t])}
                        className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-clay/30
                          ${on ? 'bg-ink text-bg-elevated border-ink' : 'bg-bg-elevated border-border text-ink-soft hover:border-ink'}`}>
                        {t}
                      </button>
                    )
                  })}
                </div>

                {qError && <p className="mt-3 text-xs text-danger">{qError}</p>}

                <button type="button" onClick={submitQuery} disabled={qSubmitting} aria-busy={qSubmitting}
                  className="mt-5 w-full bg-clay hover:bg-clay-hover text-ink-on-accent font-bold py-3 rounded-full text-sm transition-colors disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay">
                  {qSubmitting ? 'Sending...' : 'Send my question'}
                </button>
                <p className="mt-2 text-center text-[11px] text-ink-muted">No obligation. Your plan is saved either way.</p>
              </>
            ) : (
              <div className="text-center py-2">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-clay-soft text-clay">
                  <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                </div>
                <h2 className="font-display text-xl font-bold tracking-tight text-ink leading-tight">Got it - thanks.</h2>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                  Your question is with the HQ.ai team. We&apos;ve emailed you a confirmation with a link back to where you left off. Expect to hear from us within one business day to organise a 30-minute discovery call.
                </p>
                <button type="button" onClick={() => setQueryOpen(false)}
                  className="mt-5 w-full border border-border text-ink font-semibold py-3 rounded-full text-sm hover:border-ink transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay">
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
