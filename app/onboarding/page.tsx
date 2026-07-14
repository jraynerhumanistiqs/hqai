'use client'
import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import PlanSummaryCard, { getPlanMeta, isCheckoutPlanId, planPriceLine } from '@/components/onboarding/PlanSummaryCard'
import { trackFunnelEvent } from '@/lib/analytics'

const INDUSTRIES = ['Retail','Hospitality & Food Service','Healthcare & Aged Care','Pharmacy','Construction & Trades','Professional Services','Education & Childcare','Community Services & NFP','Technology','Other']
// The value domain for award detection AND the Settings fine-tune picker.
// INDUSTRY_AWARD values below MUST be members of this list so the
// /api/onboarding payload contract (awards: string[]) is unchanged and
// Settings round-trips cleanly.
const AWARDS = ['General Retail Industry Award','Hospitality Industry (General) Award','Restaurant Industry Award','Pharmacy Industry Award 2020','Aged Care Award','SCHADS Award','Nurses Award','Building & Construction Award','Clerks Private Sector Award','Professional Employees Award','Award-free / Enterprise Agreement','Multiple awards apply','Not sure']
// HQ.ai is Australia-only - Fair Work Act, NES and Modern Awards. The
// onboarding only ever needs AU states, so there is no country toggle.
const AU_STATES = ['QLD','NSW','VIC','SA','WA','TAS','ACT','NT']

// Likely Modern Award per industry. Replaces the retired Employment
// step's 13-row multi-select: the detected award is confirmed inline on
// step 1 and fine-tuned any time in Settings. 'Other' maps to null - no
// award is guessed when we have nothing to go on.
const INDUSTRY_AWARD: Record<string, string | null> = {
  'Retail': 'General Retail Industry Award',
  'Hospitality & Food Service': 'Hospitality Industry (General) Award',
  'Healthcare & Aged Care': 'Aged Care Award',
  'Pharmacy': 'Pharmacy Industry Award 2020',
  'Construction & Trades': 'Building & Construction Award',
  'Professional Services': 'Clerks Private Sector Award',
  'Education & Childcare': 'SCHADS Award',
  'Community Services & NFP': 'SCHADS Award',
  'Technology': 'Professional Employees Award',
  'Other': null,
}
// Guard against typos drifting the map away from the AWARDS domain.
if (process.env.NODE_ENV !== 'production') {
  Object.values(INDUSTRY_AWARD).forEach(a => { if (a && !AWARDS.includes(a)) console.warn(`[onboarding] INDUSTRY_AWARD value not in AWARDS: ${a}`) })
}

function headcountBand(raw: string): string {
  const n = parseInt(raw.replace(/[^0-9]/g, ''), 10)
  if (!Number.isFinite(n)) return 'unknown'
  if (n <= 10) return '1-10'
  if (n <= 25) return '11-25'
  if (n <= 150) return '26-150'
  return '151+'
}

export default function OnboardingPage() {
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  // country stays fixed to Australia and awards/empTypes/userName stay
  // in form state so the /api/onboarding payload contract is unchanged:
  // awards is filled by the industry auto-detect, empTypes stays []
  // (deferred to Settings), userName prefills from auth metadata.
  const [form, setForm] = useState({
    bizName: '', industry: '', country: 'Australia', state: [] as string[], awards: [] as string[], headcount: '',
    empTypes: [] as string[],
    advisorName: 'Hugo', userName: '', plan: 'business'
  })
  const [cycle, setCycle] = useState<'monthly' | 'annual'>('monthly')
  const [authReady, setAuthReady] = useState(false)
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [checkoutError, setCheckoutError] = useState<'' | 'unconfigured' | 'generic'>('')
  const headingRef = useRef<HTMLHeadingElement>(null)
  const firstRender = useRef(true)
  const paymentViewed = useRef(false)
  const supabase = createClient()

  // Auth guard + prefill + resume guard: a user who already has a
  // business (onboarded earlier, abandoned payment) resumes at the
  // payment step instead of re-running the wizard and 409-ing; paid
  // accounts go straight to the dashboard.
  useEffect(() => {
    let cancelled = false
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (cancelled) return
      if (!user) {
        window.location.href = '/login'
        return
      }
      const fullName = (user.user_metadata?.full_name as string) || ''
      setForm(f => ({ ...f, userName: f.userName || fullName }))

      const { data: profile } = await supabase
        .from('profiles')
        .select('business_id, businesses(plan, subscription_status, stripe_subscription_id)')
        .eq('id', user.id)
        .maybeSingle()
      if (cancelled) return

      if (profile?.business_id) {
        const biz = profile.businesses as unknown as { plan?: string; subscription_status?: string; stripe_subscription_id?: string | null } | null
        const paid = biz?.subscription_status === 'active' || !!biz?.stripe_subscription_id
        if (paid) {
          window.location.replace('/dashboard')
          return
        }
        // Unpaid but onboarded - resume at the payment step. Prefer the
        // plan on the business row unless a query param overrides it.
        const q = new URLSearchParams(window.location.search)
        if (!q.get('plan') && isCheckoutPlanId(biz?.plan)) {
          setForm(f => ({ ...f, plan: biz!.plan! }))
        }
        setStep(3)
      }
      setAuthReady(true)
      trackFunnelEvent('onboarding_started', {
        plan: new URLSearchParams(window.location.search).get('plan') || undefined,
        cycle: new URLSearchParams(window.location.search).get('cycle') || undefined,
      })
    }
    init()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Pre-select the plan + cycle the user picked on the marketing pricing
  // page (carried via /signup?plan=...&cycle=... -> login -> here) so the
  // funnel choice isn't lost.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const q = new URLSearchParams(window.location.search)
    const wanted = q.get('plan')
    if (isCheckoutPlanId(wanted)) {
      setForm(f => ({ ...f, plan: wanted }))
    }
    const wantedCycle = q.get('cycle')
    if (wantedCycle === 'monthly' || wantedCycle === 'annual') {
      setCycle(wantedCycle)
    }
  }, [])

  // Move focus to the step headline on step change so screen readers
  // announce the new step (skip the initial render).
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return }
    headingRef.current?.focus()
  }, [step])

  useEffect(() => {
    if (step === 3 && authReady && !paymentViewed.current) {
      paymentViewed.current = true
      trackFunnelEvent('payment_step_viewed', { plan: form.plan, cycle })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, authReady])

  const steps = [
    { label: 'Business' },
    { label: 'Advisor' },
    { label: 'Payment' },
  ]

  const update = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  function toggleState(s: string) {
    setForm(f => {
      const current = f.state
      if (current.includes(s)) {
        return { ...f, state: current.filter(x => x !== s) }
      }
      return { ...f, state: [...current, s] }
    })
  }

  // Submit the wizard, then reveal the payment step. A 409 means this
  // user already has a business (an earlier attempt saved it) - treat it
  // as "already onboarded, proceed to payment", never as a failure.
  async function submitOnboardingThenPay() {
    setSaving(true)
    setError('')
    trackFunnelEvent('onboarding_step_completed', { plan: form.plan, cycle, step: 2 })

    try {
      // Service-role insert server-side (see app/api/onboarding/route.ts).
      // `state` joins to a comma-separated string - the API contract's
      // existing shape.
      const payload = { ...form, state: form.state.join(', ') }
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (res.status === 401) {
        setError('Your session expired. Please sign in again.')
        window.location.href = '/login'
        return
      }

      if (res.status === 409) {
        setStep(3)
        setSaving(false)
        return
      }

      const json = await res.json().catch(() => ({}))

      if (!res.ok) {
        const detail = (json as any)?.detail ? ` (${(json as any).detail})` : ''
        setError(((json as any)?.error ?? 'Could not complete onboarding') + detail)
        setSaving(false)
        return
      }

      trackFunnelEvent('onboarding_completed', {
        plan: form.plan,
        cycle,
        industry: form.industry,
        headcount_band: headcountBand(form.headcount),
        states_count: form.state.length,
        advisor_renamed: form.advisorName.trim() !== 'Hugo',
      })
      setStep(3)
      setSaving(false)
    } catch (err: any) {
      console.error('Onboarding error:', err)
      setError('Something went wrong: ' + (err?.message ?? 'unknown'))
      setSaving(false)
    }
  }

  async function startCheckout() {
    setCheckoutLoading(true)
    setCheckoutError('')
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: form.plan, cycle, returnTo: 'onboarding' }),
      })
      const json = await res.json().catch(() => ({} as { url?: string }))
      if (res.ok && (json as { url?: string }).url) {
        trackFunnelEvent('checkout_started', { plan: form.plan, cycle, source: 'onboarding_payment_step' })
        // Stay disabled while the browser navigates - a double-click
        // must not open two checkout sessions.
        window.location.href = (json as { url: string }).url
        return
      }
      setCheckoutError(res.status === 503 ? 'unconfigured' : 'generic')
    } catch {
      setCheckoutError('generic')
    }
    setCheckoutLoading(false)
  }

  // Underline inputs; selects keep a subtle box (a bare underline +
  // browser chevron reads inconsistently across OSes).
  const inputCls ="w-full border-b border-ink/30 bg-transparent px-1 py-2.5 text-sm text-ink placeholder-ink-muted outline-none transition-colors focus:border-ink focus:ring-2 focus:ring-accent/30"
  const selectCls = "w-full px-3 py-2.5 bg-bg-elevated border border-border rounded-lg text-sm text-ink placeholder-ink-muted outline-none transition-colors appearance-none focus:border-ink focus:ring-2 focus:ring-accent/30"
  const headingCls = "font-display text-[28px] font-bold tracking-tight text-ink leading-[1.1] mb-1.5 focus:outline-none"

  const detectedAward = INDUSTRY_AWARD[form.industry] ?? null
  const meta = getPlanMeta(isCheckoutPlanId(form.plan) ? form.plan : 'business')

  if (!authReady) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="text-sm text-ink-muted">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-lg">

        {/* Logo */}
        <div className="text-center mb-8">
          <Image src="/logo-black.svg" alt="HQ.ai" width={1760} height={570} className="w-[112px] h-auto mx-auto block" />
        </div>

        <div className="bg-bg-elevated rounded-3xl border border-border p-8">

          {/* Progress. "Payment" is visible as step 3 of 3 from the first
              render - setting the expectation early kills the surprise. */}
          <div className="mb-8">
            {/* Mobile: text label + linear progress bar */}
            <div className="sm:hidden">
              <div className="flex items-baseline justify-between mb-2">
                <span className="font-mono text-[11px] uppercase tracking-[0.06em] text-ink-muted">Step {step} of {steps.length}</span>
                <span className="text-xs font-semibold text-ink">{steps[step - 1].label}</span>
              </div>
              <div className="h-1 w-full rounded-full bg-bg-soft overflow-hidden">
                <div
                  className="h-full rounded-full bg-accent transition-[width] duration-base ease-smooth motion-reduce:transition-none"
                  style={{ width: `${(step / steps.length) * 100}%` }}
                />
              </div>
            </div>

            {/* sm and up: hairline connector + ink-pill active state */}
            <div className="hidden sm:flex items-center gap-2">
              {steps.map((s, i) => (
                <div key={i} className="flex items-center gap-2 flex-1">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 transition-colors
                    ${step > i + 1 ? 'bg-ink text-bg-elevated' : step === i + 1 ? 'bg-ink text-bg-elevated' : 'bg-bg-soft text-ink-muted border border-border'}`}>
                    {step > i + 1 ? '✓' : i + 1}
                  </div>
                  <span className={`text-xs font-semibold ${step === i + 1 ? 'text-ink' : 'text-ink-muted'}`}>{s.label}</span>
                  {i < steps.length - 1 && <div className={`flex-1 h-px ${step > i + 1 ? 'bg-ink' : 'bg-border'}`} />}
                </div>
              ))}
            </div>
          </div>

          {/* Step 1 - Business */}
          {step === 1 && (
            <div>
              <h2 ref={headingRef} tabIndex={-1} className={headingCls}>Tell us about your business</h2>
              <p className="text-sm text-mid mb-6">HQ uses this to tailor every answer and document to your business. Takes about a minute.</p>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-mid mb-1.5">Business name</label>
                  <input className={inputCls} value={form.bizName} onChange={e => update('bizName', e.target.value)} placeholder="e.g. Sunrise Pharmacy" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-mid mb-1.5">Industry</label>
                  <select
                    className={selectCls}
                    value={form.industry}
                    onChange={e => {
                      // Populate awards as the retired multi-select would
                      // have - a single detected award, or none.
                      const v = e.target.value
                      setForm(f => ({ ...f, industry: v, awards: INDUSTRY_AWARD[v] ? [INDUSTRY_AWARD[v]!] : [] }))
                    }}
                  >
                    <option value="">Select industry</option>
                    {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
                  </select>
                  {detectedAward && (
                    <div
                      className="mt-2 flex items-start gap-2 rounded-xl border border-border bg-bg-soft px-3 py-2.5 animate-in fade-in duration-base motion-reduce:animate-none"
                      role="status"
                      aria-live="polite"
                    >
                      <svg viewBox="0 0 16 16" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-soft" aria-hidden>
                        <path fill="currentColor" d="M6.2 11.4 3 8.2l1.1-1.1 2.1 2.1 5.7-5.7 1.1 1.1z" />
                      </svg>
                      <p className="text-xs leading-relaxed text-ink-soft">
                        Looks like the <strong className="font-semibold text-ink">{detectedAward}</strong> applies to you. We&apos;ll use it from day one - fine-tune any time in Settings.
                      </p>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-bold text-mid mb-1.5">State / Territory</label>
                  <div className="flex flex-wrap gap-2">
                    {AU_STATES.map(s => (
                      <button key={s} type="button" onClick={() => toggleState(s)}
                        className={`px-4 py-2 rounded-full text-sm border font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/30
                          ${form.state.includes(s) ? 'bg-ink text-bg-elevated border-ink' : 'bg-bg-elevated border-border text-ink-soft hover:border-ink'}`}>
                        {s}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-ink-muted mt-2">Select all states your business operates in (multiple selections OK).</p>
                  {form.state.length > 0 && (
                    <p className="text-[10px] text-ink font-bold mt-1">{form.state.length} location{form.state.length > 1 ? 's' : ''} selected</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-bold text-mid mb-1.5">Number of employees</label>
                  <input
                    className={inputCls}
                    type="text"
                    value={form.headcount}
                    onChange={e => update('headcount', e.target.value)}
                    placeholder="e.g. 25"
                  />
                  <p className="text-[10px] text-muted mt-1">Enter an approximate number</p>
                </div>
              </div>
            </div>
          )}

          {/* Step 2 - Advisor */}
          {step === 2 && (
            <div>
              <h2 ref={headingRef} tabIndex={-1} className={headingCls}>Meet your AI Advisor</h2>
              <p className="text-sm text-mid mb-6">
                This is the assistant that handles your day-to-day HR questions. Give it a name you like - you can change it any time in Settings.
                <span
                  className="group relative ml-1 inline-flex h-4 w-4 cursor-help items-center justify-center rounded-full border border-ink/30 align-middle text-[10px] font-bold text-ink-muted"
                  tabIndex={0}
                  role="note"
                  aria-label="Human advisor handoff is available on eligible membership tiers"
                >
                  i
                  <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 w-56 -translate-x-1/2 rounded-lg bg-ink px-3 py-2 text-left text-[11px] font-normal leading-snug text-bg-elevated opacity-0 shadow-float transition-opacity duration-150 group-hover:opacity-100 group-focus:opacity-100">
                    Live handoff to a human Humanistiqs advisor is available on eligible membership tiers.
                  </span>
                </span>
              </p>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-mid mb-1.5">Name your AI Advisor</label>
                  <input className={inputCls} value={form.advisorName} onChange={e => update('advisorName', e.target.value)} placeholder="Hugo, Sarah, anything you like" />
                  <p className="text-[10px] text-muted mt-1">Pick something friendly - this is what shows up in chat when your AI Advisor talks to you. You can change it any time in Settings.</p>
                </div>
                <PlanSummaryCard
                  planId={form.plan}
                  cycle={cycle}
                  onPlanChange={id => update('plan', id)}
                  headcount={parseInt(form.headcount.replace(/[^0-9]/g, ''), 10) || undefined}
                />
              </div>
            </div>
          )}

          {/* Step 3 - Payment. Rendered only after POST /api/onboarding
              succeeds (or via the resume guard). No Back button - the
              business row exists; changes belong to Change plan/Settings. */}
          {step === 3 && (
            <div>
              <h2 ref={headingRef} tabIndex={-1} className={headingCls}>Last step: start your plan</h2>
              <p className="text-sm text-mid mb-6">
                {meta.name} ({meta.band}) - {planPriceLine(isCheckoutPlanId(form.plan) ? form.plan : 'business', cycle)}. Unlimited logins for your whole team.
              </p>

              <PlanSummaryCard
                planId={form.plan}
                cycle={cycle}
                onPlanChange={id => update('plan', id)}
                onCycleChange={setCycle}
                showAnnualNudge
              />

              {checkoutError === 'unconfigured' && (
                <div role="alert" className="mt-4 bg-danger/10 border border-danger/30 rounded-lg px-3 py-2.5 text-sm text-danger">
                  Card payments for this plan aren&apos;t switched on just yet. Nothing has been charged and everything you set up is saved.{' '}
                  <a href="mailto:jrayner@humanistiqs.com.au" className="font-semibold text-ink underline underline-offset-2 hover:text-ink-soft">Email us</a>
                  {' '}and we&apos;ll sort it, or{' '}
                  <a href="/dashboard" className="font-semibold text-ink underline underline-offset-2 hover:text-ink-soft">have a look around first</a>.
                </div>
              )}
              {checkoutError === 'generic' && (
                <div role="alert" className="mt-4 bg-danger/10 border border-danger/30 rounded-lg px-3 py-2.5 text-sm text-danger">
                  Something went wrong starting checkout. No payment was taken. Please try again.
                </div>
              )}

              <button
                type="button"
                onClick={startCheckout}
                disabled={checkoutLoading}
                aria-busy={checkoutLoading}
                className="mt-6 w-full bg-accent hover:bg-accent-hover text-ink-on-accent font-bold py-2.5 rounded-full text-sm transition-colors disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                {checkoutLoading ? 'Taking you to secure checkout...' : 'Continue to secure checkout'}
              </button>

              <p className="mt-3 text-xs leading-relaxed text-ink-muted text-center">
                Cancel any time. No lock-in, no notice period, no per-person charges. Payment is handled by Stripe - we never see your card details.
              </p>
            </div>
          )}

          {/* Error message (steps 1-2) */}
          {error && step < 3 && (
            <div className="mt-4 bg-danger/10 border border-danger/30 rounded-lg px-3 py-2 text-sm text-danger">
              {error}
            </div>
          )}

          {/* Actions (steps 1-2; the payment step carries its own CTA) */}
          {step < 3 && (
            <div className="flex justify-between mt-8">
              {step === 2 ? (
                <button type="button" onClick={() => setStep(1)}
                  className="px-5 py-2.5 bg-bg-elevated hover:bg-bg-soft text-ink-soft rounded-full text-sm font-semibold border border-border transition-colors">
                  ← Back
                </button>
              ) : <div />}
              {step === 1 ? (
                <button type="button"
                  onClick={() => {
                    trackFunnelEvent('onboarding_step_completed', { plan: form.plan, cycle, step: 1 })
                    setStep(2)
                  }}
                  className="px-6 py-2.5 bg-ink hover:bg-ink/90 text-bg-elevated rounded-full text-sm font-semibold transition-colors">
                  Continue →
                </button>
              ) : (
                <button type="button" onClick={submitOnboardingThenPay} disabled={saving}
                  className="px-6 py-2.5 bg-ink hover:bg-ink/90 text-bg-elevated rounded-full text-sm font-semibold transition-colors disabled:opacity-60">
                  {saving ? 'Setting up…' : 'Continue →'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
