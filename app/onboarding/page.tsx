'use client'
import { useState, useEffect } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const INDUSTRIES = ['Retail','Hospitality & Food Service','Healthcare & Aged Care','Pharmacy','Construction & Trades','Professional Services','Education & Childcare','Community Services & NFP','Technology','Other']
const AWARDS = ['General Retail Industry Award','Hospitality Industry (General) Award','Restaurant Industry Award','Pharmacy Industry Award 2020','Aged Care Award','SCHADS Award','Nurses Award','Building & Construction Award','Clerks Private Sector Award','Professional Employees Award','Award-free / Enterprise Agreement','Multiple awards apply','Not sure']
const COUNTRIES = ['Australia','New Zealand','United Kingdom','United States','Canada','Singapore','Other']
const STATES_BY_COUNTRY: Record<string, string[]> = {
  Australia: ['QLD','NSW','VIC','SA','WA','TAS','ACT','NT'],
  'New Zealand': ['Auckland','Wellington','Canterbury','Waikato','Bay of Plenty','Manawatū-Whanganui','Otago','Northland','Hawke’s Bay','Taranaki','Southland','Tasman','Nelson','Marlborough','West Coast','Gisborne'],
  'United Kingdom': ['England','Scotland','Wales','Northern Ireland'],
  'United States': ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC'],
  Canada: ['AB','BC','MB','NB','NL','NS','NT','NU','ON','PE','QC','SK','YT'],
  Singapore: ['Singapore'],
  Other: [],
}
// Multi-select. A business can run any mix of employment types in
// parallel - many SMEs have a few FT employees, a couple of PT, and a
// pool of casuals or contractors all at once. Mirror that reality at
// onboarding so the AI prompts can target the right awards for each.
const EMP_TYPES = ['Full-time','Part-time','Casual','Fixed-term contract','Independent contractor','Apprentice or trainee']
const PLANS = [
  { id: 'free', label: 'Free Trial', price: 'Free for 14 days', desc: 'Full access, no credit card required' },
  { id: 'essentials', label: 'Essentials', price: '$99/month', desc: 'Up to 3 seats, 50 AI queries/month' },
  { id: 'growth', label: 'Growth', price: '$199/month', desc: 'Up to 6 seats, unlimited queries + 1 advisor hr', recommended: true },
  { id: 'scale', label: 'Scale', price: '$379/month', desc: 'Up to 12 seats, dedicated advisor, priority SLA' },
]

export default function OnboardingPage() {
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    bizName: '', industry: '', country: 'Australia', state: '', awards: [] as string[], headcount: '',
    empTypes: [] as string[],
    advisorName: 'Hugo', userName: '', plan: 'free'
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
      const { data: { user }, error: userError } = await supabase.auth.getUser()

      if (userError || !user) {
        setError('Your session expired. Please sign in again.')
        window.location.href = '/login'
        return
      }

      const { data: business, error: bizError } = await supabase
        .from('businesses')
        .insert({
          name: form.bizName || 'My Business',
          industry: form.industry,
          country: form.country,
          state: form.state,
          award: form.awards.join(', '),
          headcount: form.headcount,
          // Stored as a comma-separated string for backward compatibility
          // with existing AI prompts that interpolate "employment_types"
          // verbatim. The settings UI also reads/writes this shape.
          employment_types: form.empTypes.join(', '),
          advisor_name: form.advisorName || 'Hugo',
          plan: form.plan,
        })
        .select()
        .single()

      if (bizError) {
        console.error('Business error:', bizError.message)
        setError('Could not save business details: ' + bizError.message)
        setSaving(false)
        return
      }

      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          business_id: business.id,
          full_name: form.userName || '',
          email: user.email,
          role: 'owner',
        })

      if (profileError) {
        console.error('Profile error:', profileError.message)
        setError('Could not save profile: ' + profileError.message)
        setSaving(false)
        return
      }

      window.location.replace('/dashboard')

    } catch (err: any) {
      console.error('Onboarding error:', err)
      setError('Something went wrong: ' + err.message)
      setSaving(false)
    }
  }

  const inputCls = "w-full px-3 py-2.5 bg-white border border-border rounded-lg text-sm text-charcoal placeholder-muted focus:outline-none focus:border-black transition-colors"
  const selectCls = inputCls + " appearance-none"

  if (!authReady) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-sm text-muted">Loading...</div>
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

        <div className="bg-white shadow-modal rounded-2xl border border-border p-8">

          {/* Progress */}
          <div className="flex items-center gap-2 mb-8">
            {steps.map((s, i) => (
              <div key={i} className="flex items-center gap-2 flex-1">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 transition-colors
                  ${step > i + 1 ? 'bg-accent text-ink-on-accent' : step === i + 1 ? 'bg-accent text-ink-on-accent' : 'bg-light text-muted border border-border'}`}>
                  {step > i + 1 ? '✓' : i + 1}
                </div>
                <span className={`text-xs font-bold ${step === i + 1 ? 'text-charcoal' : 'text-muted'}`}>{s.label}</span>
                {i < steps.length - 1 && <div className={`flex-1 h-px ${step > i + 1 ? 'bg-black' : 'bg-border'}`} />}
              </div>
            ))}
          </div>

          {/* Step 1 - Business */}
          {step === 1 && (
            <div>
              <h2 className="font-display text-2xl font-bold text-charcoal uppercase tracking-wider mb-1">Tell us about your business</h2>
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
                  <label className="block text-xs font-bold text-mid mb-1.5">Country</label>
                  <select
                    className={selectCls}
                    value={form.country}
                    onChange={e => {
                      const next = e.target.value
                      setForm(f => ({ ...f, country: next, state: '' }))
                    }}
                  >
                    {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                {STATES_BY_COUNTRY[form.country]?.length > 0 && (
                  <div>
                    <label className="block text-xs font-bold text-mid mb-1.5">State / Territory</label>
                    <div className="flex flex-wrap gap-2">
                      {STATES_BY_COUNTRY[form.country].map(s => (
                        <button key={s} type="button" onClick={() => update('state', s)}
                          className={`px-4 py-2 rounded-lg text-sm border font-bold transition-colors
                            ${form.state === s ? 'bg-black text-white border-black' : 'bg-white border-border text-mid hover:border-black'}`}>
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
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
              <h2 className="font-display text-2xl font-bold text-charcoal uppercase tracking-wider mb-1">Employment details</h2>
              <p className="text-sm text-mid mb-6">HQ applies the right awards and compliance rules automatically.</p>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-mid mb-1.5">Applicable Modern Awards (select all that apply)</label>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto scrollbar-thin pr-1">
                    {AWARDS.map(a => (
                      <button key={a} type="button" onClick={() => toggleAward(a)}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all
                          ${form.awards.includes(a) ? 'border-ink bg-ink/5' : 'border-border hover:border-mid'}`}>
                        <div className={`w-4 h-4 rounded flex-shrink-0 flex items-center justify-center border-2 transition-colors
                          ${form.awards.includes(a) ? 'border-black bg-black' : 'border-border'}`}>
                          {form.awards.includes(a) && (
                            <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 20 20" fill="currentColor">
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
                          ${form.empTypes.includes(t) ? 'border-black bg-black' : 'border-border'}`}>
                          {form.empTypes.includes(t) && (
                            <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 20 20" fill="currentColor">
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
              <h2 className="font-display text-2xl font-bold text-charcoal uppercase tracking-wider mb-1">Meet your AI Advisor</h2>
              <p className="text-sm text-mid mb-6">Give your AI Advisor a name - it&apos;s the assistant that handles your day-to-day HR questions inside HQ.ai. When something complex comes up, your AI Advisor hands off to your real Humanistiqs human advisor automatically.</p>
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
                          ${form.plan === p.id ? 'border-black bg-black' : 'border-border'}`}>
                          {form.plan === p.id && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-charcoal">{p.label}</span>
                            {p.recommended && <span className="text-xs bg-black text-white px-2 py-0.5 rounded-full font-bold">Popular</span>}
                            <span className="text-sm font-bold text-charcoal ml-auto">{p.price}</span>
                          </div>
                          <p className="text-xs text-muted mt-0.5">{p.desc}</p>
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
                className="px-5 py-2.5 bg-white hover:bg-light text-mid rounded-full text-sm font-bold border border-border transition-colors">
                ← Back
              </button>
            ) : <div />}
            {step < 3 ? (
              <button type="button" onClick={() => setStep(s => s + 1)}
                className="px-6 py-2.5 bg-accent hover:bg-accent-hover text-ink-on-accent rounded-full text-sm font-bold transition-colors">
                Continue →
              </button>
            ) : (
              <button type="button" onClick={completeOnboarding} disabled={saving}
                className="px-6 py-2.5 bg-accent hover:bg-accent-hover text-ink-on-accent rounded-full text-sm font-bold transition-colors disabled:opacity-60">
                {saving ? 'Setting up…' : 'Launch HQ.ai →'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
