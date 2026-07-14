'use client'
import { useState, useEffect } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { C10_SELF_SERVE } from '@/lib/pricing-config'

const INDUSTRIES = ['Retail','Hospitality & Food Service','Healthcare & Aged Care','Pharmacy','Construction & Trades','Professional Services','Education & Childcare','Community Services & NFP','Technology','Other']
const AWARDS = ['General Retail Industry Award','Hospitality Industry (General) Award','Restaurant Industry Award','Pharmacy Industry Award 2020','Aged Care Award','SCHADS Award','Nurses Award','Building & Construction Award','Clerks Private Sector Award','Professional Employees Award','Award-free / Enterprise Agreement','Multiple awards apply','Not sure']
// HQ.ai is Australia-only - Fair Work Act, NES and Modern Awards. The
// onboarding only ever needs AU states, so there is no country toggle.
const AU_STATES = ['QLD','NSW','VIC','SA','WA','TAS','ACT','NT']
// Multi-select. A business can run any mix of employment types in
// parallel - many SMEs have a few FT employees, a couple of PT, and a
// pool of casuals or contractors all at once. Mirror that reality at
// onboarding so the AI prompts can target the right awards for each.
const EMP_TYPES = ['Full-time','Part-time','Casual','Fixed-term contract','Independent contractor','Apprentice or trainee']
// Plans are derived from lib/pricing-config.ts (the single source of
// truth) - never hardcode prices here. The bundle options reuse the C10
// self-serve bundle (the 'solo'/'business' plan ids); HQ Recruit is a
// standalone hiring-only plan (its own 'recruit' plan id) so a non-People
// user can subscribe to hiring on its own. The /api/onboarding route
// stores `plan` as an opaque string, so these ids flow through without a
// schema change.
const { bundle, recruit } = C10_SELF_SERVE
const PLANS: Array<{ id: string; label: string; price: string; desc: string; recommended?: boolean }> = [
  {
    id: bundle.solo.planId,
    label: `${bundle.name} (${bundle.solo.label})`,
    price: `$${bundle.solo.monthly}/month`,
    desc: `HR and hiring, for teams ${bundle.solo.label}, unlimited logins`,
  },
  {
    id: bundle.business.planId,
    label: `${bundle.name} (${bundle.business.label})`,
    price: `$${bundle.business.monthly}/month`,
    desc: `HR and hiring, for teams ${bundle.business.label}, unlimited logins, founder-led onboarding`,
    recommended: true,
  },
  {
    id: recruit.standalonePlanId,
    label: `${recruit.name} (hiring only)`,
    price: `$${recruit.standaloneMonthly}/month`,
    desc: 'Hiring tools only - CV scoring, interviews and Campaign Coach. No HR subscription needed.',
  },
]

export default function OnboardingPage() {
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  // country is fixed to Australia (HQ.ai is AU-only) but kept in form
  // state so the /api/onboarding payload contract is unchanged.
  const [form, setForm] = useState({
    bizName: '', industry: '', country: 'Australia', state: [] as string[], awards: [] as string[], headcount: '',
    empTypes: [] as string[],
    advisorName: 'Hugo', userName: '', plan: 'business'
  })
  const [authReady, setAuthReady] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        window.location.href = '/login'
      } else {
        setAuthReady(true)
      }
    })
  }, [])

  // Pre-select the plan the user picked on the marketing pricing page
  // (carried via /signup?plan=... -> login -> here) so the funnel
  // choice isn't lost.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const q = new URLSearchParams(window.location.search)
    const wanted = q.get('plan')
    if (wanted && ['solo', 'business', 'recruit'].includes(wanted)) {
      setForm(f => ({ ...f, plan: wanted }))
    }
  }, [])

  const steps = [
    { label: 'Business' },
    { label: 'Employment' },
    { label: 'Advisor' },
  ]

  const update = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  function toggleAward(award: string) {
    setForm(f => {
      const current = f.awards
      if (current.includes(award)) {
        return { ...f, awards: current.filter(a => a !== award) }
      }
      return { ...f, awards: [...current, award] }
    })
  }

  function toggleState(s: string) {
    setForm(f => {
      const current = f.state
      if (current.includes(s)) {
        return { ...f, state: current.filter(x => x !== s) }
      }
      return { ...f, state: [...current, s] }
    })
  }

  function toggleEmpType(t: string) {
    setForm(f => {
      const current = f.empTypes
      if (current.includes(t)) {
        return { ...f, empTypes: current.filter(x => x !== t) }
      }
      return { ...f, empTypes: [...current, t] }
    })
  }

  async function completeOnboarding() {
    setSaving(true)
    setError('')

    try {
      // Server-side route uses service-role to insert the business row and
      // link the profile, sidestepping client-side RLS races during the
      // single moment in the user's lifecycle when profile.business_id is
      // still null. See app/api/onboarding/route.ts.
      // The /api/onboarding route stores `state` as a single text column.
      // Join the multi-select array into a comma-separated string so the
      // API contract stays identical to its current shape (matches the
      // same pattern already used for awards and empTypes server side).
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

      const json = await res.json().catch(() => ({}))

      if (!res.ok) {
        const detail = (json as any)?.detail ? ` (${(json as any).detail})` : ''
        setError(((json as any)?.error ?? 'Could not complete onboarding') + detail)
        setSaving(false)
        return
      }

      window.location.replace('/dashboard')
    } catch (err: any) {
      console.error('Onboarding error:', err)
      setError('Something went wrong: ' + (err?.message ?? 'unknown'))
      setSaving(false)
    }
  }

  // Text inputs use the underline pattern; selects keep a subtle box
  // because a bare underline + browser chevron reads inconsistently
  // across OSes.
  const inputCls = "w-full border-b border-ink/30 bg-transparent px-1 py-2.5 text-sm text-ink placeholder-ink-muted outline-none transition-colors focus:border-ink focus:ring-2 focus:ring-accent/30"
  const selectCls = "w-full px-3 py-2.5 bg-bg-elevated border border-border rounded-lg text-sm text-ink placeholder-ink-muted outline-none transition-colors appearance-none focus:border-ink focus:ring-2 focus:ring-accent/30"

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

          {/* Progress.
              Below sm: a plain "Step N of 3" label + thin linear bar -
              the per-step dot/segment indicator compresses badly on
              narrow screens. At sm and up: the richer hairline-connector
              + ink-pill indicator. */}
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
              <h2 className="font-display text-[28px] font-bold tracking-tight text-ink leading-[1.1] mb-1.5">Tell us about your business</h2>
              <p className="text-sm text-mid mb-6">HQ uses this to tailor every response to your specific situation.</p>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-mid mb-1.5">Business name</label>
                  <input className={inputCls} value={form.bizName} onChange={e => update('bizName', e.target.value)} placeholder="e.g. Sunrise Pharmacy" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-mid mb-1.5">Industry</label>
                  <select className={selectCls} value={form.industry} onChange={e => update('industry', e.target.value)}>
                    <option value="">Select industry</option>
                    {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
                  </select>
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

          {/* Step 2 - Employment */}
          {step === 2 && (
            <div>
              <h2 className="font-display text-[28px] font-bold tracking-tight text-ink leading-[1.1] mb-1.5">Employment details</h2>
              <p className="text-sm text-mid mb-6">HQ already detects the likely award from your industry. Confirm or fine-tune it here so every response is accurate from day one - you can change all of this any time in Settings.</p>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-mid mb-1.5">Applicable Modern Awards (select all that apply)</label>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto scrollbar-thin pr-1">
                    {AWARDS.map(a => (
                      <button key={a} type="button" onClick={() => toggleAward(a)}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all
                          ${form.awards.includes(a) ? 'border-ink bg-ink/5' : 'border-border hover:border-mid'}`}>
                        <div className={`w-4 h-4 rounded flex-shrink-0 flex items-center justify-center border-2 transition-colors
                          ${form.awards.includes(a) ? 'border-ink bg-ink' : 'border-border'}`}>
                          {form.awards.includes(a) && (
                            <svg className="w-2.5 h-2.5 text-bg-elevated" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                            </svg>
                          )}
                        </div>
                        <span className="text-sm text-charcoal">{a}</span>
                      </button>
                    ))}
                  </div>
                  {form.awards.length > 0 && (
                    <p className="text-[10px] text-ink font-bold mt-2">{form.awards.length} award{form.awards.length > 1 ? 's' : ''} selected</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-bold text-mid mb-2">Employment types in your business (select all that apply)</label>
                  <div className="space-y-2">
                    {EMP_TYPES.map(t => (
                      <button key={t} type="button" onClick={() => toggleEmpType(t)}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all
                          ${form.empTypes.includes(t) ? 'border-ink bg-ink/5' : 'border-border hover:border-mid'}`}>
                        <div className={`w-4 h-4 rounded flex-shrink-0 flex items-center justify-center border-2 transition-colors
                          ${form.empTypes.includes(t) ? 'border-ink bg-ink' : 'border-border'}`}>
                          {form.empTypes.includes(t) && (
                            <svg className="w-2.5 h-2.5 text-bg-elevated" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                            </svg>
                          )}
                        </div>
                        <span className="text-sm text-charcoal">{t}</span>
                      </button>
                    ))}
                  </div>
                  {form.empTypes.length > 0 && (
                    <p className="text-[10px] text-ink font-bold mt-2">{form.empTypes.length} type{form.empTypes.length > 1 ? 's' : ''} selected</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 3 - Advisor */}
          {step === 3 && (
            <div>
              <h2 className="font-display text-[28px] font-bold tracking-tight text-ink leading-[1.1] mb-1.5">Meet your AI Advisor</h2>
              <p className="text-sm text-mid mb-6">
                Give your AI Advisor a name - it&apos;s the assistant that handles your day-to-day HR questions inside HQ.ai. When something complex comes up, your AI Advisor hands off to your real Humanistiqs human advisor automatically.
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
                  <label className="block text-xs font-bold text-mid mb-1.5">Your name</label>
                  <input className={inputCls} value={form.userName} onChange={e => update('userName', e.target.value)} placeholder="e.g. James" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-mid mb-1.5">Name your AI Advisor</label>
                  <input className={inputCls} value={form.advisorName} onChange={e => update('advisorName', e.target.value)} placeholder="Hugo, Sarah, anything you like" />
                  <p className="text-[10px] text-muted mt-1">Pick something friendly - this is what shows up in chat when your AI Advisor talks to you. You can change it any time in Settings.</p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-mid mb-2">Your HQ.ai plan</label>
                  <div className="space-y-2">
                    {PLANS.map(p => (
                      <button key={p.id} type="button" onClick={() => update('plan', p.id)}
                        className={`w-full flex items-start gap-3 p-3 rounded-xl border text-left transition-all
                          ${form.plan === p.id ? 'border-ink bg-ink/5' : 'border-border hover:border-mid'}`}>
                        <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors
                          ${form.plan === p.id ? 'border-ink bg-ink' : 'border-border'}`}>
                          {form.plan === p.id && <div className="w-1.5 h-1.5 bg-bg-elevated rounded-full" />}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-ink">{p.label}</span>
                            {p.recommended && <span className="text-[10px] bg-accent-soft text-accent border border-accent/30 px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider">Popular</span>}
                            <span className="text-sm font-semibold text-ink ml-auto">{p.price}</span>
                          </div>
                          <p className="text-xs text-ink-muted mt-0.5">{p.desc}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="mt-4 bg-danger/10 border border-danger/30 rounded-lg px-3 py-2 text-sm text-danger">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-between mt-8">
            {step > 1 ? (
              <button type="button" onClick={() => setStep(s => s - 1)}
                className="px-5 py-2.5 bg-bg-elevated hover:bg-bg-soft text-ink-soft rounded-full text-sm font-semibold border border-border transition-colors">
                ← Back
              </button>
            ) : <div />}
            {step < 3 ? (
              <button type="button" onClick={() => setStep(s => s + 1)}
                className="px-6 py-2.5 bg-ink hover:bg-ink/90 text-bg-elevated rounded-full text-sm font-semibold transition-colors">
                Continue →
              </button>
            ) : (
              // Final celebratory CTA - the ONE Clay accent moment in
              // the whole wizard (rule 4 of the kit).
              <div className="flex flex-col items-end gap-1.5">
                <button type="button" onClick={completeOnboarding} disabled={saving}
                  className="px-6 py-2.5 bg-accent hover:bg-accent-hover text-ink-on-accent rounded-full text-sm font-semibold transition-colors disabled:opacity-60">
                  {saving ? 'Setting up…' : 'Launch HQ.ai →'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
