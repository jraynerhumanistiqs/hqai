'use client'
import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import PlanSummaryCard, { getPlanMeta, isCheckoutPlanId, planPriceLine } from '@/components/onboarding/PlanSummaryCard'
import ProductPicker from '@/components/onboarding/ProductPicker'
import { planToNeeds, suggestPlanId, type ProductNeeds } from '@/lib/plan-suggest'
import { PRICING, ADVISORY_HOURS } from '@/lib/pricing-config'
import { trackFunnelEvent } from '@/lib/analytics'

// Support step model. Per area (HR, recruitment) the buyer picks ONE of:
//   'hours' - book a Humanistiqs advisor's time now ($250/hr, one-off,
//             charged at checkout), or
//   'talk'  - talk to the team about ongoing outsourcing (HR365/Recruit365,
//             sales-assisted, interest capture only).
// Both options are always offered - no headcount/hours cutoff chooses for
// the buyer. null = neither (skipped).
type SupportMode = null | 'hours' | 'talk'
interface SupportAreaState { mode: SupportMode; hours: number }

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
  // Product needs drive the plan suggestion (ProductPicker). Default
  // mirrors the default 'business' plan: both products on.
  const [needs, setNeeds] = useState<ProductNeeds>({ people: true, recruit: true })
  // Support step. Each area independently: book advisory time now ('hours'),
  // talk to the team about ongoing outsourcing ('talk'), or skip (null).
  const [support, setSupport] = useState<{ hr: SupportAreaState; recruit: SupportAreaState }>({
    hr: { mode: null, hours: ADVISORY_HOURS.minHours },
    recruit: { mode: null, hours: ADVISORY_HOURS.minHours },
  })
  const [userEmail, setUserEmail] = useState('')
  const [authReady, setAuthReady] = useState(false)
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [checkoutError, setCheckoutError] = useState<'' | 'unconfigured' | 'generic'>('')
  const headingRef = useRef<HTMLHeadingElement>(null)
  const firstRender = useRef(true)
  const paymentViewed = useRef(false)
  // True once the buyer picked an exact plan (pricing-page param, resume
  // guard, or the payment step's Change plan list) - the headcount/product
  // suggestion must not overwrite an explicit choice.
  const planManual = useRef(false)
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
      setUserEmail(user.email || '')

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
        const bizPlan = biz?.plan
        if (!q.get('plan') && isCheckoutPlanId(bizPlan)) {
          planManual.current = true
          setForm(f => ({ ...f, plan: bizPlan }))
          setNeeds(planToNeeds(bizPlan))
        }
        setStep(4)
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
      // The pricing-page pick seeds the plan AND the product toggles,
      // but does NOT lock the band - the headcount typed on step 1 is
      // the stronger signal, so the suggestion may re-band (e.g. a
      // business pick with a team of 12 becomes the up-to-25 bundle).
      setForm(f => ({ ...f, plan: wanted }))
      setNeeds(planToNeeds(wanted))
    }
    const wantedCycle = q.get('cycle')
    if (wantedCycle === 'monthly' || wantedCycle === 'annual') {
      setCycle(wantedCycle)
    }
  }, [])

  // Re-suggest the plan whenever the product needs or headcount change,
  // unless the buyer explicitly picked one (planManual). Toggling a
  // product IS a fresh signal - the toggle handler clears the flag.
  useEffect(() => {
    if (planManual.current) return
    const n = parseInt(form.headcount.replace(/[^0-9]/g, ''), 10)
    const suggested = suggestPlanId(needs, Number.isFinite(n) ? n : undefined)
    if (suggested) setForm(f => (f.plan === suggested ? f : { ...f, plan: suggested }))
  }, [needs, form.headcount])

  // Move focus to the step headline on step change so screen readers
  // announce the new step (skip the initial render).
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return }
    headingRef.current?.focus()
  }, [step])

  useEffect(() => {
    if (step === 4 && authReady && !paymentViewed.current) {
      paymentViewed.current = true
      trackFunnelEvent('payment_step_viewed', { plan: form.plan, cycle })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, authReady])

  const steps = [
    { label: 'Business' },
    { label: 'Advisor' },
    { label: 'Support' },
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

  // Continue past the Support step. Two independent outcomes:
  //   - 'talk' selections become an enterprise inquiry (founder triage +
  //     confirmation email, same funnel as /enterprise) - interest only,
  //     never charged here. A capture failure must not block payment.
  //   - 'hours' selections carry in state to the payment step and are
  //     charged as a one-off line item at checkout (see startCheckout).
  async function submitSupportThenPay() {
    trackFunnelEvent('onboarding_step_completed', { plan: form.plan, cycle, step: 3 })

    const talkHr = support.hr.mode === 'talk'
    const talkRecruit = support.recruit.mode === 'talk'
    const hrHours = support.hr.mode === 'hours' ? support.hr.hours : 0
    const recruitHours = support.recruit.mode === 'hours' ? support.recruit.hours : 0

    if (hrHours + recruitHours > 0) {
      trackFunnelEvent('advisory_hours_selected', {
        plan: form.plan,
        hr_hours: hrHours,
        recruit_hours: recruitHours,
        total_cost_aud: (hrHours + recruitHours) * ADVISORY_HOURS.hourlyRate,
      })
    }

    if ((talkHr || talkRecruit) && userEmail) {
      const variant = talkHr && talkRecruit ? 'full' : talkHr ? 'people' : 'recruit'
      trackFunnelEvent('outsourced_interest', {
        plan: form.plan,
        hr365: talkHr,
        recruit365: talkRecruit,
        variant,
      })
      const n = parseInt(form.headcount.replace(/[^0-9]/g, ''), 10)
      const bucket = !Number.isFinite(n) || n < 30 ? 'Under 30' : n <= 50 ? '30-50' : n <= 150 ? '50-150' : '150+'
      setSaving(true)
      try {
        await fetch('/api/enterprise-inquiry', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            full_name: form.userName || form.bizName || 'HQ.ai signup',
            work_email: userEmail,
            business_name: form.bizName || 'My Business',
            staff_headcount: bucket,
            variant_interest: variant,
            urgency: 'exploring',
            consent: true,
            notes: `Submitted from self-serve onboarding (Support step) - wants to talk about ongoing outsourcing. Self-serve plan: ${form.plan} (${cycle}).`,
          }),
        })
      } catch {
        // Interest capture is best-effort - never block payment on it.
      }
      setSaving(false)
    }
    setStep(4)
  }

  async function startCheckout() {
    setCheckoutLoading(true)
    setCheckoutError('')
    const hrHours = support.hr.mode === 'hours' ? support.hr.hours : 0
    const recruitHours = support.recruit.mode === 'hours' ? support.recruit.hours : 0
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: form.plan,
          cycle,
          returnTo: 'onboarding',
          advisoryHours: { hr: hrHours, recruit: recruitHours },
        }),
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

  // Advisory-hours + talk selections, derived from the Support step model.
  const hrHours = support.hr.mode === 'hours' ? support.hr.hours : 0
  const recruitHours = support.recruit.mode === 'hours' ? support.recruit.hours : 0
  const totalAdvisoryHours = hrHours + recruitHours
  const advisoryCost = totalAdvisoryHours * ADVISORY_HOURS.hourlyRate
  const talkAreas = [
    support.hr.mode === 'talk' ? 'HR' : null,
    support.recruit.mode === 'talk' ? 'recruitment' : null,
  ].filter(Boolean) as string[]

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
                        {/* Explicit {' '} both sides of the award name - the plain
                            inter-element space was lost in the rendered output
                            ("...Awardapplies..."), per tester feedback 2026-07-14. */}
                        Looks like the{' '}
                        <strong className="font-semibold text-ink">{detectedAward}</strong>
                        {' '}applies to you. We&apos;ll use it from day one - fine-tune any time in Settings.
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
                <ProductPicker
                  needs={needs}
                  headcount={parseInt(form.headcount.replace(/[^0-9]/g, ''), 10) || undefined}
                  planId={isCheckoutPlanId(form.plan) ? form.plan : null}
                  cycle={cycle}
                  onNeedsChange={n => {
                    // A product toggle is a fresh signal - re-enable the
                    // suggestion even after an explicit earlier pick.
                    planManual.current = false
                    setNeeds(n)
                  }}
                />
              </div>
            </div>
          )}

          {/* Step 3 - Support. Every buyer sees BOTH options per area:
              book advisory time now ($250/hr, one-off, charged at checkout)
              or talk to the team about ongoing outsourcing (HR365/Recruit365,
              interest capture only). No headcount/hours cutoff picks for them. */}
          {step === 3 && (
            <div>
              <h2 ref={headingRef} tabIndex={-1} className={headingCls}>Want a hand with the hard parts?</h2>
              <p className="text-sm text-mid mb-6">
                HQ.ai handles the everyday HR and hiring on its own. For the complex, high-stakes work - a messy exit, a key hire, a policy overhaul - a real Humanistiqs advisor can step in. Choose how you would like that support for each area below, or just continue.
              </p>
              <div className="space-y-3">
                {([
                  {
                    key: 'hr' as const,
                    label: 'Outsourced HR',
                    retainerName: PRICING.enterprise.variants[0].name,
                    retainerFrom: PRICING.enterprise.variants[0].priceMonthlyDisplay,
                    hoursDesc: 'Book a Humanistiqs HR advisor for a set number of hours - a tricky termination, contracts, a policy review.',
                    talkDesc: 'A dedicated HR advisor runs your HR month to month.',
                  },
                  {
                    key: 'recruit' as const,
                    label: 'Outsourced recruitment',
                    retainerName: PRICING.enterprise.variants[1].name,
                    retainerFrom: PRICING.enterprise.variants[1].priceMonthlyDisplay,
                    hoursDesc: 'Book a talent advisor for a set number of hours - a role kickoff, shortlist review or interview help.',
                    talkDesc: 'A dedicated talent advisor runs your hiring end to end.',
                  },
                ]).map(area => {
                  const st = support[area.key]
                  const setArea = (next: Partial<SupportAreaState>) =>
                    setSupport(s => ({ ...s, [area.key]: { ...s[area.key], ...next } }))
                  const toggle = (mode: 'hours' | 'talk') =>
                    setArea({ mode: st.mode === mode ? null : mode })
                  const setHours = (h: number) =>
                    setArea({ hours: Math.min(Math.max(h, ADVISORY_HOURS.minHours), ADVISORY_HOURS.maxHours) })
                  return (
                    <div key={area.key} className="rounded-2xl border border-border p-3">
                      <p className="text-sm font-semibold text-ink mb-2">{area.label}</p>
                      <div role="radiogroup" aria-label={area.label} className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {/* Book time now */}
                        <button
                          type="button"
                          role="radio"
                          aria-checked={st.mode === 'hours'}
                          onClick={() => toggle('hours')}
                          className={`flex flex-col items-start gap-1 p-3 rounded-xl border text-left transition-all
                            ${st.mode === 'hours' ? 'border-ink bg-ink/5' : 'border-border hover:border-mid'}`}
                        >
                          <span className="text-sm font-semibold text-ink">Book advisory time now</span>
                          <span className="text-xs text-ink-muted">{area.hoursDesc}</span>
                          <span className="text-[11px] font-semibold text-ink-soft mt-0.5">${ADVISORY_HOURS.hourlyRate}/hour, paid today</span>
                        </button>
                        {/* Talk to the team */}
                        <button
                          type="button"
                          role="radio"
                          aria-checked={st.mode === 'talk'}
                          onClick={() => toggle('talk')}
                          className={`flex flex-col items-start gap-1 p-3 rounded-xl border text-left transition-all
                            ${st.mode === 'talk' ? 'border-ink bg-ink/5' : 'border-border hover:border-mid'}`}
                        >
                          <span className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-ink">Talk to the team</span>
                            <span className="text-[10px] bg-bg-soft text-ink-soft border border-border px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider">{area.retainerName}</span>
                          </span>
                          <span className="text-xs text-ink-muted">{area.talkDesc}</span>
                          <span className="text-[11px] font-semibold text-ink-soft mt-0.5">Ongoing, from ${area.retainerFrom.toLocaleString('en-AU')}/mo</span>
                        </button>
                      </div>

                      {/* Hours stepper - only when "book time now" is chosen */}
                      {st.mode === 'hours' && (
                        <div className="mt-2 flex items-center justify-between rounded-xl border border-border bg-bg-soft px-3 py-2.5 animate-in fade-in duration-base motion-reduce:animate-none">
                          <span className="text-xs font-semibold text-ink-soft">How many hours?</span>
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                              <button type="button" onClick={() => setHours(st.hours - 1)} disabled={st.hours <= ADVISORY_HOURS.minHours}
                                aria-label="One hour fewer"
                                className="h-7 w-7 rounded-full border border-border text-ink-soft font-bold leading-none disabled:opacity-40 hover:border-ink transition-colors">-</button>
                              <span className="w-6 text-center text-sm font-bold text-ink tabular-nums">{st.hours}</span>
                              <button type="button" onClick={() => setHours(st.hours + 1)} disabled={st.hours >= ADVISORY_HOURS.maxHours}
                                aria-label="One hour more"
                                className="h-7 w-7 rounded-full border border-border text-ink-soft font-bold leading-none disabled:opacity-40 hover:border-ink transition-colors">+</button>
                            </div>
                            <span className="text-sm font-bold text-ink tabular-nums">${(st.hours * ADVISORY_HOURS.hourlyRate).toLocaleString('en-AU')}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              <div aria-live="polite">
                {totalAdvisoryHours > 0 && (
                  <p className="mt-3 text-xs leading-relaxed text-ink-soft">
                    {totalAdvisoryHours} advisory hour{totalAdvisoryHours > 1 ? 's' : ''} - ${advisoryCost.toLocaleString('en-AU')} - will be added to your payment today as a one-off. Our team books the time in with you after checkout.
                  </p>
                )}
                {talkAreas.length > 0 && (
                  <p className="mt-3 text-xs leading-relaxed text-ink-muted">
                    Our HQ.ai team will reach out within one business day about ongoing {talkAreas.join(' and ')} support. No obligation - your plan on the next step still starts today.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Step 4 - Payment. Rendered only after POST /api/onboarding
              succeeds (or via the resume guard). No Back button - the
              business row exists; changes belong to Change plan/Settings. */}
          {step === 4 && (
            <div>
              <h2 ref={headingRef} tabIndex={-1} className={headingCls}>Last step: start your plan</h2>
              <p className="text-sm text-mid mb-6">
                {meta.name} ({meta.band}) - {planPriceLine(isCheckoutPlanId(form.plan) ? form.plan : 'business', cycle)}. Unlimited logins for your whole team.
              </p>

              <PlanSummaryCard
                planId={form.plan}
                cycle={cycle}
                onPlanChange={id => {
                  // An exact pick from the list is authoritative - stop
                  // the suggestion overwriting it, and mirror the pick
                  // back into the product toggles for consistency.
                  planManual.current = true
                  update('plan', id)
                  if (isCheckoutPlanId(id)) setNeeds(planToNeeds(id))
                }}
                onCycleChange={setCycle}
                showAnnualNudge
              />

              {/* Advisory hours booked on the Support step - shown here so the
                  full, combined selection is visible before checkout. */}
              {totalAdvisoryHours > 0 && (
                <div className="mt-3 rounded-xl border border-border bg-bg-soft p-4">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="font-mono text-[11px] uppercase tracking-[0.06em] text-ink-muted">Advisory time (one-off)</p>
                    <button
                      type="button"
                      onClick={() => setStep(3)}
                      className="text-xs font-semibold text-ink-soft underline underline-offset-2 hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 rounded-sm"
                    >
                      Change
                    </button>
                  </div>
                  <p className="mt-1.5 text-sm text-ink">
                    <strong className="font-semibold">
                      {[hrHours > 0 ? `${hrHours} hr HR` : null, recruitHours > 0 ? `${recruitHours} hr recruitment` : null].filter(Boolean).join(' + ')}
                    </strong>
                    {' - '}{totalAdvisoryHours} x ${ADVISORY_HOURS.hourlyRate} = ${advisoryCost.toLocaleString('en-AU')}, charged once with your plan today.
                  </p>
                </div>
              )}
              {talkAreas.length > 0 && (
                <p className="mt-3 text-xs leading-relaxed text-ink-muted">
                  We will also reach out about ongoing {talkAreas.join(' and ')} outsourcing - that part is not charged here.
                </p>
              )}

              {checkoutError === 'unconfigured' && (
                <div role="alert" className="mt-4 bg-danger/10 border border-danger/30 rounded-lg px-3 py-2.5 text-sm text-danger">
                  Card payments for this plan aren&apos;t switched on just yet. Nothing has been charged and everything you set up is saved.{' '}
                  <a href="mailto:jrayner@humanistiqs.com.au" className="font-semibold text-ink underline underline-offset-2 hover:text-ink-soft">Talk to our team</a>
                  {' '}and we&apos;ll get your plan started - it only takes a minute.
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

          {/* Error message (steps 1-3) */}
          {error && step < 4 && (
            <div className="mt-4 bg-danger/10 border border-danger/30 rounded-lg px-3 py-2 text-sm text-danger">
              {error}
            </div>
          )}

          {/* Actions (steps 1-3; the payment step carries its own CTA) */}
          {step < 4 && (
            <div className="flex justify-between mt-8">
              {step > 1 ? (
                <button type="button" onClick={() => setStep(s => s - 1)}
                  className="px-5 py-2.5 bg-bg-elevated hover:bg-bg-soft text-ink-soft rounded-full text-sm font-semibold border border-border transition-colors">
                  ← Back
                </button>
              ) : <div />}
              {step === 1 && (
                <button type="button"
                  onClick={() => {
                    trackFunnelEvent('onboarding_step_completed', { plan: form.plan, cycle, step: 1 })
                    setStep(2)
                  }}
                  className="px-6 py-2.5 bg-ink hover:bg-ink/90 text-bg-elevated rounded-full text-sm font-semibold transition-colors">
                  Continue →
                </button>
              )}
              {step === 2 && (
                <button type="button" onClick={submitOnboardingThenPay}
                  disabled={saving || (!needs.people && !needs.recruit)}
                  className="px-6 py-2.5 bg-ink hover:bg-ink/90 text-bg-elevated rounded-full text-sm font-semibold transition-colors disabled:opacity-60">
                  {saving ? 'Setting up…' : 'Continue →'}
                </button>
              )}
              {step === 3 && (
                <button type="button" onClick={submitSupportThenPay} disabled={saving}
                  className="px-6 py-2.5 bg-ink hover:bg-ink/90 text-bg-elevated rounded-full text-sm font-semibold transition-colors disabled:opacity-60">
                  {saving ? 'One moment…' : 'Continue →'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
