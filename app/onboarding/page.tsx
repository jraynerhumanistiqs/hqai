'use client'
import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import PlanSummaryCard, { getPlanMeta, isCheckoutPlanId, planPriceLine } from '@/components/onboarding/PlanSummaryCard'
import ProductPicker from '@/components/onboarding/ProductPicker'
import { planToNeeds, suggestPlanId, type ProductNeeds } from '@/lib/plan-suggest'
import { PRICING } from '@/lib/pricing-config'
import { trackFunnelEvent } from '@/lib/analytics'

// Support step model (Aug 2026). The self-serve "book advisory hours now"
// pay-now path is OFF for now (the $250/hr Stripe price stays wired in
// .env + the checkout route, just not surfaced in the UX). The Support
// step is now purely an invitation to be contacted about ongoing outsourced
// HR, recruitment, or both - the buyer flags interest and offers their best
// days/times for a free 30-minute clarity call. Captured as an enterprise
// inquiry (founder triage email); never blocks or charges the plan.
const CALL_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] as const
const CALL_TIMES = ['Morning (9-12)', 'Midday (12-2)', 'Afternoon (2-5)'] as const
// Pricing-signal options for the outsourced (HR365/Recruit365) quote. Values
// MUST match the sets /api/enterprise-inquiry validates against, or they are
// dropped as "not stated". Labels mirror the /outsourcing inquiry form.
const ENTITY_OPTIONS = [
  { value: '1', label: '1' },
  { value: '2-3', label: '2-3' },
  { value: '4-5', label: '4-5' },
  { value: '6+', label: '6+' },
] as const
const HIRING_OPTIONS = [
  { value: 'under-30', label: 'Under 30' },
  { value: '30-60', label: '30-60' },
  { value: '60-100', label: '60-100' },
  { value: '100-plus', label: '100+' },
] as const
interface SupportState {
  hr: boolean
  recruit: boolean
  days: string[]
  times: string[]
  // Pricing signals for outsourced quoting (optional). entityCount +
  // currentSpend apply to any outsourced interest; hiringVolume only matters
  // when recruitment is wanted.
  entityCount: string
  hiringVolume: string
  currentSpend: string
}

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
  // Support step: interest in ongoing outsourced HR / recruitment + best
  // availability for a 30-minute clarity call. Interest capture only.
  const [support, setSupport] = useState<SupportState>({ hr: false, recruit: false, days: [], times: [], entityCount: '', hiringVolume: '', currentSpend: '' })
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
  // True once a business row exists for this user (resumed, or created on the
  // first pass). Switches submitOnboardingThenPay from create (POST) to
  // update (PATCH) so going Back to edit an earlier step actually saves.
  const hasBusiness = useRef(false)
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

      // businesses(*) so we can prefill EVERY step on resume without naming
      // a column that a given environment's migrations haven't added yet.
      const { data: profile } = await supabase
        .from('profiles')
        .select('business_id, full_name, businesses(*)')
        .eq('id', user.id)
        .maybeSingle()
      if (cancelled) return

      if (profile?.business_id) {
        const biz = (profile.businesses as unknown as Record<string, unknown> | null) ?? {}
        const paid = biz.subscription_status === 'active' || !!biz.stripe_subscription_id
        if (paid) {
          window.location.replace('/dashboard')
          return
        }
        // Unpaid but onboarded - a business row already exists, so edits from
        // here update it (PATCH) rather than trying to create a duplicate.
        hasBusiness.current = true

        // Prefill the whole wizard from the saved row so a buyer who clicks
        // Back sees their real details, not blank fields. Comma-joined
        // columns (state, award, employment_types) split back to arrays.
        const str = (v: unknown) => (typeof v === 'string' ? v : '')
        const splitList = (v: unknown) =>
          str(v).split(',').map(s => s.trim()).filter(Boolean)
        const q = new URLSearchParams(window.location.search)
        const bizPlan = str(biz.plan)
        const resolvedPlan = !q.get('plan') && isCheckoutPlanId(bizPlan) ? bizPlan : null
        // A saved business means the plan is a deliberate choice - never let
        // the headcount/product suggestion overwrite it on prefill.
        planManual.current = true
        setForm(f => ({
          ...f,
          bizName: str(biz.name) || f.bizName,
          industry: str(biz.industry) || f.industry,
          country: str(biz.country) || f.country,
          state: splitList(biz.state).length ? splitList(biz.state) : f.state,
          awards: splitList(biz.award).length ? splitList(biz.award) : f.awards,
          headcount: str(biz.headcount) || f.headcount,
          empTypes: splitList(biz.employment_types).length ? splitList(biz.employment_types) : f.empTypes,
          advisorName: str(biz.advisor_name) || f.advisorName,
          userName: f.userName || str(profile.full_name),
          plan: resolvedPlan || f.plan,
        }))
        if (resolvedPlan) setNeeds(planToNeeds(resolvedPlan))
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

  // Submit the wizard, then reveal the payment step. First pass creates the
  // business (POST); once a business exists - resumed, or the buyer clicked
  // Back to edit an earlier step - we UPDATE it (PATCH) so their edits save
  // instead of being dropped. A POST 409 means a row already existed, so we
  // flip to update mode and proceed.
  async function submitOnboardingThenPay() {
    setSaving(true)
    setError('')
    trackFunnelEvent('onboarding_step_completed', { plan: form.plan, cycle, step: 2 })

    try {
      // Service-role write server-side (see app/api/onboarding/route.ts).
      // `state` joins to a comma-separated string - the API contract's
      // existing shape.
      const payload = { ...form, state: form.state.join(', ') }
      const res = await fetch('/api/onboarding', {
        method: hasBusiness.current ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (res.status === 401) {
        setError('Your session expired. Please sign in again.')
        window.location.href = '/login'
        return
      }

      // A create hit an existing row - switch to update mode and move on.
      if (res.status === 409) {
        hasBusiness.current = true
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

      // Business now exists - any later Back-and-edit updates it.
      hasBusiness.current = true
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

  // Continue past the Support step. If the buyer flagged interest in
  // outsourced HR / recruitment, record it as an enterprise inquiry (founder
  // triage + confirmation email, same funnel as /enterprise), carrying their
  // best days/times for a clarity call in the notes. Interest capture only -
  // never charged here, and a capture failure must not block payment.
  async function submitSupportThenPay() {
    trackFunnelEvent('onboarding_step_completed', { plan: form.plan, cycle, step: 3 })

    if ((support.hr || support.recruit) && userEmail) {
      const variant = support.hr && support.recruit ? 'full' : support.hr ? 'people' : 'recruit'
      const areas = [support.hr ? 'HR' : null, support.recruit ? 'Recruitment' : null].filter(Boolean).join(' and ')
      trackFunnelEvent('outsourced_interest', {
        plan: form.plan,
        hr365: support.hr,
        recruit365: support.recruit,
        variant,
        days: support.days.length,
        times: support.times.length,
      })
      const n = parseInt(form.headcount.replace(/[^0-9]/g, ''), 10)
      const bucket = !Number.isFinite(n) || n < 30 ? 'Under 30' : n <= 50 ? '30-50' : n <= 150 ? '50-150' : '150+'
      const availability = [
        support.days.length ? `best days ${support.days.join(', ')}` : null,
        support.times.length ? `best times ${support.times.join(', ')}` : null,
      ].filter(Boolean).join('; ') || 'no preference given'
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
            // Pricing signals for the outsourced quote. Only send hiring
            // volume when recruitment is wanted; empty values are omitted so
            // the route records them as "not stated" rather than rejecting.
            entity_count: support.entityCount || undefined,
            annual_hiring_volume: support.recruit ? (support.hiringVolume || undefined) : undefined,
            current_spend: support.currentSpend.trim() || undefined,
            notes: `Self-serve onboarding (Support step) - wants a 30-min clarity call about ongoing ${areas} support. Availability: ${availability}. Self-serve plan: ${form.plan} (${cycle}).`,
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

  // Exit the funnel entirely. An authenticated user can't just navigate to
  // "/" - the root redirects authed users to /dashboard, and the dashboard
  // paywall bounces an unpaid buyer back to /onboarding (an infinite loop).
  // So a genuine "leave completely" has to end the session first; then "/"
  // renders the public homepage. Everything set up is saved on the business
  // row, so signing back in resumes them at the payment step.
  const [exiting, setExiting] = useState(false)
  async function exitToHome() {
    setExiting(true)
    try {
      await supabase.auth.signOut()
    } catch {
      // Even if sign-out fails, still leave for the homepage.
    }
    window.location.href = '/'
  }

  // Underline inputs; selects keep a subtle box (a bare underline +
  // browser chevron reads inconsistently across OSes).
  const inputCls ="w-full border-b border-ink/30 bg-transparent px-1 py-2.5 text-sm text-ink placeholder-ink-muted outline-none transition-colors focus:border-clay focus:ring-2 focus:ring-clay/30"
  const selectCls = "w-full px-3 py-2.5 bg-bg-soft border border-border rounded-xl text-sm text-ink placeholder-ink-muted outline-none transition-colors appearance-none focus:border-clay focus:ring-2 focus:ring-clay/30"
  const headingCls = "font-display text-[28px] font-bold tracking-tight text-ink leading-[1.1] mb-1.5 focus:outline-none"

  const detectedAward = INDUSTRY_AWARD[form.industry] ?? null
  const meta = getPlanMeta(isCheckoutPlanId(form.plan) ? form.plan : 'business')

  // Support step selections. contactAreas drives the payment-step
  // acknowledgment ("we will reach out about ongoing HR and Recruitment").
  const wantsContact = support.hr || support.recruit
  const contactAreas = [
    support.hr ? 'HR' : null,
    support.recruit ? 'Recruitment' : null,
  ].filter(Boolean) as string[]

  if (!authReady) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="text-sm text-ink-muted">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4 py-10">
      <div className="w-full max-w-lg">

        {/* Logo */}
        <div className="text-center mb-8">
          <Image src="/logo-white.svg" alt="HQ.ai" width={1760} height={570} className="w-[112px] h-auto mx-auto block" />
        </div>

        <div className="bg-bg-elevated rounded-3xl border border-border shadow-card p-8">

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
                  className="h-full rounded-full bg-clay transition-[width] duration-base ease-smooth motion-reduce:transition-none"
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
              <p className="mb-3 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.06em] text-clay">
                <span aria-hidden className="h-px w-5 bg-clay" />
                Getting started
              </p>
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
              <p className="mb-3 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.06em] text-clay">
                <span aria-hidden className="h-px w-5 bg-clay" />
                Your AI advisor
              </p>
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

          {/* Step 3 - Support. Interest capture only: flag ongoing outsourced
              HR / recruitment and offer best availability for a free 30-min
              clarity call. The self-serve "book advisory hours now" pay-now
              path is OFF for now (the $250/hr price stays wired in .env + the
              checkout route, just not surfaced here). */}
          {step === 3 && (
            <div>
              <p className="mb-3 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.06em] text-clay">
                <span aria-hidden className="h-px w-5 bg-clay" />
                Expert support
              </p>
              <h2 ref={headingRef} tabIndex={-1} className={headingCls}>Want an expert in your corner?</h2>
              <p className="text-sm text-mid mb-6">
                HQ.ai handles the everyday HR and hiring on its own. When you would rather hand the heavy lifting to a person, a dedicated Humanistiqs advisor can take HR, hiring, or both off your plate. Tell us what you would like a hand with and we will set up a free 30-minute clarity call - no obligation, and your plan still starts today.
              </p>
              <div className="space-y-2">
                {([
                  {
                    key: 'hr' as const,
                    label: 'Outsourced HR',
                    badge: PRICING.enterprise.variants[0].name,
                    from: PRICING.enterprise.variants[0].priceMonthlyDisplay,
                    desc: 'A dedicated HR advisor who knows your business handles the hard conversations, contracts and compliance.',
                  },
                  {
                    key: 'recruit' as const,
                    label: 'Outsourced Recruitment',
                    badge: PRICING.enterprise.variants[1].name,
                    from: PRICING.enterprise.variants[1].priceMonthlyDisplay,
                    desc: 'A dedicated talent advisor runs your hiring end to end, from brief to shortlist.',
                  },
                ]).map(area => {
                  const on = support[area.key]
                  return (
                    <button
                      key={area.key}
                      type="button"
                      role="checkbox"
                      aria-checked={on}
                      onClick={() => setSupport(s => ({ ...s, [area.key]: !on }))}
                      className={`w-full flex items-start gap-3 p-3 rounded-2xl border text-left transition-all
                        ${on ? 'border-clay bg-clay-soft' : 'border-border hover:border-ink-muted'}`}
                    >
                      <div className={`mt-0.5 w-4 h-4 rounded flex-shrink-0 flex items-center justify-center border-2 transition-colors
                        ${on ? 'border-clay bg-clay' : 'border-border'}`}>
                        {on && (
                          <svg className="w-2.5 h-2.5 text-clay-ink" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-ink">{area.label}</span>
                          <span className="text-[10px] bg-bg-soft text-ink-soft border border-border px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider">{area.badge}</span>
                        </div>
                        <p className="text-xs text-ink-muted mt-0.5">{area.desc}</p>
                        <p className="text-[11px] font-semibold text-ink-soft mt-1">Ongoing, from ${area.from.toLocaleString('en-AU')}/mo</p>
                      </div>
                    </button>
                  )
                })}
              </div>

              {/* Availability for the clarity call - only once an area is picked */}
              {wantsContact && (
                <div className="mt-4 rounded-2xl border border-border bg-bg-soft p-4 animate-in fade-in duration-base motion-reduce:animate-none">
                  <p className="text-sm font-semibold text-ink">When suits you for a quick call?</p>
                  <p className="text-xs text-ink-muted mt-0.5">A 30-minute clarity call, no pressure. This just helps us reach you faster - we will confirm an exact time.</p>

                  <p className="mt-3 mb-1.5 font-mono text-[11px] uppercase tracking-[0.06em] text-ink-muted">Best days</p>
                  <div className="flex flex-wrap gap-2">
                    {CALL_DAYS.map(d => {
                      const dayOn = support.days.includes(d)
                      return (
                        <button key={d} type="button" aria-pressed={dayOn}
                          onClick={() => setSupport(s => ({ ...s, days: dayOn ? s.days.filter(x => x !== d) : [...s.days, d] }))}
                          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/30
                            ${dayOn ? 'bg-ink text-bg-elevated border-ink' : 'bg-bg-elevated border-border text-ink-soft hover:border-ink'}`}>
                          {d}
                        </button>
                      )
                    })}
                  </div>

                  <p className="mt-3 mb-1.5 font-mono text-[11px] uppercase tracking-[0.06em] text-ink-muted">Best times</p>
                  <div className="flex flex-wrap gap-2">
                    {CALL_TIMES.map(t => {
                      const timeOn = support.times.includes(t)
                      return (
                        <button key={t} type="button" aria-pressed={timeOn}
                          onClick={() => setSupport(s => ({ ...s, times: timeOn ? s.times.filter(x => x !== t) : [...s.times, t] }))}
                          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/30
                            ${timeOn ? 'bg-ink text-bg-elevated border-ink' : 'bg-bg-elevated border-border text-ink-soft hover:border-ink'}`}>
                          {t}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Pricing signals - lets the team quote the outsourced price on
                  the call, not after. All optional. Values match the sets
                  /api/enterprise-inquiry validates. Hiring volume only shows
                  when recruitment is wanted. */}
              {wantsContact && (
                <div className="mt-3 rounded-2xl border border-border bg-bg-soft p-4 animate-in fade-in duration-base motion-reduce:animate-none">
                  <p className="text-sm font-semibold text-ink">A couple of details for an accurate quote</p>
                  <p className="text-xs text-ink-muted mt-0.5">Optional - it lets us price your outsourced support before the call, not after.</p>

                  <p className="mt-3 mb-1.5 font-mono text-[11px] uppercase tracking-[0.06em] text-ink-muted">How many separate entities do you run?</p>
                  <div className="flex flex-wrap gap-2">
                    {ENTITY_OPTIONS.map(o => {
                      const sel = support.entityCount === o.value
                      return (
                        <button key={o.value} type="button" aria-pressed={sel}
                          onClick={() => setSupport(s => ({ ...s, entityCount: sel ? '' : o.value }))}
                          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/30
                            ${sel ? 'bg-ink text-bg-elevated border-ink' : 'bg-bg-elevated border-border text-ink-soft hover:border-ink'}`}>
                          {o.label}
                        </button>
                      )
                    })}
                  </div>

                  {support.recruit && (
                    <>
                      <p className="mt-3 mb-1.5 font-mono text-[11px] uppercase tracking-[0.06em] text-ink-muted">Roughly how many people do you hire a year?</p>
                      <div className="flex flex-wrap gap-2">
                        {HIRING_OPTIONS.map(o => {
                          const sel = support.hiringVolume === o.value
                          return (
                            <button key={o.value} type="button" aria-pressed={sel}
                              onClick={() => setSupport(s => ({ ...s, hiringVolume: sel ? '' : o.value }))}
                              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/30
                                ${sel ? 'bg-ink text-bg-elevated border-ink' : 'bg-bg-elevated border-border text-ink-soft hover:border-ink'}`}>
                              {o.label}
                            </button>
                          )
                        })}
                      </div>
                    </>
                  )}

                  <label htmlFor="support-spend" className="mt-3 mb-1.5 block font-mono text-[11px] uppercase tracking-[0.06em] text-ink-muted">
                    What do you spend on outsourced HR/recruitment now? (optional)
                  </label>
                  <input id="support-spend" value={support.currentSpend}
                    onChange={e => setSupport(s => ({ ...s, currentSpend: e.target.value }))}
                    placeholder="e.g. $1,500/mo, or nothing yet"
                    className="w-full rounded-xl border border-border bg-bg-elevated px-3 py-2.5 text-sm text-ink placeholder-ink-muted outline-none transition-colors focus:border-clay focus:ring-2 focus:ring-clay/30" />
                </div>
              )}

              <div aria-live="polite">
                {wantsContact && (
                  <p className="mt-3 text-xs leading-relaxed text-ink-muted">
                    Our HQ.ai team will reach out within one business day about ongoing {contactAreas.join(' and ')} support. No obligation - your plan on the next step still starts today.
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
              <p className="mb-3 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.06em] text-clay">
                <span aria-hidden className="h-px w-5 bg-clay" />
                Almost there
              </p>
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

              {/* Support-step interest acknowledged so the buyer knows the
                  clarity call is coming; not charged here. */}
              {wantsContact && (
                <p className="mt-3 text-xs leading-relaxed text-ink-muted">
                  We will reach out about ongoing {contactAreas.join(' and ')} support - no obligation, and it is not charged here.
                </p>
              )}

              {checkoutError === 'unconfigured' && (
                <div role="alert" className="mt-4 bg-danger/10 border border-danger/30 rounded-lg px-3 py-2.5 text-sm text-danger">
                  Card payments for this plan aren&apos;t switched on just yet. Nothing has been charged and everything you set up is saved.{' '}
                  <a href="mailto:hq.ai@humanistiqs.com.au" className="font-semibold text-ink underline underline-offset-2 hover:text-ink-soft">Talk to our team</a>
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
                className="mt-6 w-full bg-clay hover:bg-clay-hover text-ink-on-accent font-bold py-3 rounded-full text-sm transition-colors disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay"
              >
                {checkoutLoading ? 'Taking you to secure checkout...' : 'Continue to secure checkout'}
              </button>

              <p className="mt-3 text-xs leading-relaxed text-ink-muted text-center">
                Cancel any time. No lock-in, no notice period, no per-person charges. Payment is handled by Stripe - we never see your card details.
              </p>

              {/* Previous - the payment step now has a way back to review or
                  edit earlier steps. Edits save via PATCH (see
                  submitOnboardingThenPay), so this is a real edit path. */}
              <div className="mt-6 flex">
                <button type="button" onClick={() => setStep(3)}
                  className="px-5 py-2.5 bg-bg-elevated hover:bg-bg-soft text-ink-soft rounded-full text-sm font-semibold border border-border transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay">
                  ← Previous
                </button>
              </div>
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
                  className="px-5 py-2.5 bg-bg-elevated hover:bg-bg-soft text-ink-soft rounded-full text-sm font-semibold border border-border transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay">
                  ← Previous
                </button>
              ) : <div />}
              {step === 1 && (
                <button type="button"
                  onClick={() => {
                    trackFunnelEvent('onboarding_step_completed', { plan: form.plan, cycle, step: 1 })
                    setStep(2)
                  }}
                  className="px-6 py-2.5 bg-clay hover:bg-clay-hover text-ink-on-accent rounded-full text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay">
                  Continue →
                </button>
              )}
              {step === 2 && (
                <button type="button" onClick={submitOnboardingThenPay}
                  disabled={saving || (!needs.people && !needs.recruit)}
                  className="px-6 py-2.5 bg-clay hover:bg-clay-hover text-ink-on-accent rounded-full text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay disabled:opacity-60">
                  {saving ? 'Setting up…' : 'Continue →'}
                </button>
              )}
              {step === 3 && (
                <button type="button" onClick={submitSupportThenPay} disabled={saving}
                  className="px-6 py-2.5 bg-clay hover:bg-clay-hover text-ink-on-accent rounded-full text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay disabled:opacity-60">
                  {saving ? 'One moment…' : 'Continue →'}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Subtle escape hatch - leave setup entirely for the homepage. Signs
            out so "/" actually renders (authed users are otherwise looped back
            here). Everything entered is saved; signing in again resumes. */}
        <p className="mt-6 text-center">
          <button
            type="button"
            onClick={exitToHome}
            disabled={exiting}
            className="text-xs text-ink-muted underline underline-offset-2 transition-colors hover:text-ink-soft disabled:opacity-60"
          >
            {exiting ? 'Exiting...' : 'Exit setup and return to the homepage'}
          </button>
        </p>
      </div>
    </div>
  )
}
