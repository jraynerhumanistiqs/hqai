'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const INDUSTRIES = ['Retail','Hospitality & Food Service','Healthcare & Aged Care','Pharmacy','Construction & Trades','Professional Services','Education & Childcare','Community Services & NFP','Technology','Other']
const AWARDS = ['General Retail Industry Award','Hospitality Industry (General) Award','Restaurant Industry Award','Pharmacy Industry Award 2020','Aged Care Award','SCHADS Award','Nurses Award','Building & Construction Award','Clerks Private Sector Award','Professional Employees Award','Award-free / Enterprise Agreement','Multiple awards apply','Not sure']
const STATES = ['QLD','NSW','VIC','SA','WA','TAS','ACT','NT']
const SIZES = ['1–10','11–30','31–80','81–150','151–250']
const EMP_TYPES = ['Full-time only','Full-time and part-time','Full-time, part-time and casual','Primarily casual']
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
    bizName: '', industry: '', state: '', award: '', headcount: '',
    empTypes: '',
    advisorName: 'Hugo', userName: '', plan: 'free'
  })
  const [authReady, setAuthReady] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  // Check auth on page load — redirect to login if no session
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

  async function completeOnboarding() {
  setSaving(true)
  setError('')

  try {
    // Verify user is still authenticated
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
        state: form.state,
        award: form.award,
        headcount: form.headcount,
        employment_types: form.empTypes,
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

    // Force hard navigation to dashboard
    window.location.replace('/dashboard')

  } catch (err: any) {
    console.error('Onboarding error:', err)
    setError('Something went wrong: ' + err.message)
    setSaving(false)
  }
}

  const inputCls = "w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-black transition-colors"
  const selectCls = inputCls + " appearance-none"

  if (!authReady) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-sm text-gray-400">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2">
            <div className="w-9 h-9 bg-black rounded-xl flex items-center justify-center text-white font-serif text-sm">HQ</div>
            <span className="font-serif text-xl text-gray-900">HQ.ai</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">

          {/* Progress */}
          <div className="flex items-center gap-2 mb-8">
            {steps.map((s, i) => (
              <div key={i} className="flex items-center gap-2 flex-1">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 transition-colors
                  ${step > i + 1 ? 'bg-black text-white' : step === i + 1 ? 'bg-black text-white' : 'bg-gray-100 text-gray-400 border border-gray-200'}`}>
                  {step > i + 1 ? '✓' : i + 1}
                </div>
                <span className={`text-xs font-medium ${step === i + 1 ? 'text-gray-900' : 'text-gray-400'}`}>{s.label}</span>
                {i < steps.length - 1 && <div className={`flex-1 h-px ${step > i + 1 ? 'bg-black' : 'bg-gray-200'}`} />}
              </div>
            ))}
          </div>

          {/* Step 1 — Business */}
          {step === 1 && (
            <div>
              <h2 className="font-serif text-2xl font-normal text-gray-900 mb-1">Tell us about your business</h2>
              <p className="text-sm text-gray-500 mb-6">HQ uses this to tailor every response to your specific situation.</p>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Business name</label>
                  <input className={inputCls} value={form.bizName} onChange={e => update('bizName', e.target.value)} placeholder="e.g. Sunrise Pharmacy" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Industry</label>
                  <select className={selectCls} value={form.industry} onChange={e => update('industry', e.target.value)}>
                    <option value="">Select industry</option>
                    {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Number of employees</label>
                  <div className="flex flex-wrap gap-2">
                    {SIZES.map(s => (
                      <button key={s} type="button" onClick={() => update('headcount', s)}
                        className={`px-4 py-2 rounded-lg text-sm border transition-colors
                          ${form.headcount === s ? 'bg-black text-white border-black' : 'bg-white border-gray-200 text-gray-700 hover:border-black'}`}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2 — Employment */}
          {step === 2 && (
            <div>
              <h2 className="font-serif text-2xl font-normal text-gray-900 mb-1">Employment details</h2>
              <p className="text-sm text-gray-500 mb-6">HQ applies the right awards and compliance rules automatically.</p>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">State / Territory</label>
                  <div className="flex flex-wrap gap-2">
                    {STATES.map(s => (
                      <button key={s} type="button" onClick={() => update('state', s)}
                        className={`px-4 py-2 rounded-lg text-sm border transition-colors
                          ${form.state === s ? 'bg-black text-white border-black' : 'bg-white border-gray-200 text-gray-700 hover:border-black'}`}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Primary Modern Award (if applicable)</label>
                  <select className={selectCls} value={form.award} onChange={e => update('award', e.target.value)}>
                    <option value="">Select or skip</option>
                    {AWARDS.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2">Employment types in your business</label>
                  <div className="space-y-2">
                    {EMP_TYPES.map(t => (
                      <label key={t} onClick={() => update('empTypes', t)}
                        className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all
                          ${form.empTypes === t ? 'border-black bg-gray-50' : 'border-gray-200 hover:border-gray-400'}`}>
                        <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors
                          ${form.empTypes === t ? 'border-black bg-black' : 'border-gray-300'}`}>
                          {form.empTypes === t && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                        </div>
                        <span className="text-sm text-gray-700">{t}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3 — Advisor */}
          {step === 3 && (
            <div>
              <h2 className="font-serif text-2xl font-normal text-gray-900 mb-1">Your Humanistiqs advisor</h2>
              <p className="text-sm text-gray-500 mb-6">When HQ detects something complex, it connects you directly — same advisor every time.</p>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Your name</label>
                  <input className={inputCls} value={form.userName} onChange={e => update('userName', e.target.value)} placeholder="e.g. James" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Your advisor's name</label>
                  <input className={inputCls} value={form.advisorName} onChange={e => update('advisorName', e.target.value)} placeholder="e.g. Hugo" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2">Your HQ.ai plan</label>
                  <div className="space-y-2">
                    {PLANS.map(p => (
                      <label key={p.id} onClick={() => update('plan', p.id)}
                        className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all
                          ${form.plan === p.id ? 'border-black bg-gray-50' : 'border-gray-200 hover:border-gray-400'}`}>
                        <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors
                          ${form.plan === p.id ? 'border-black bg-black' : 'border-gray-300'}`}>
                          {form.plan === p.id && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-900">{p.label}</span>
                            {p.recommended && <span className="text-xs bg-black text-white px-2 py-0.5 rounded-full">Popular</span>}
                            <span className="text-sm font-medium text-gray-900 ml-auto">{p.price}</span>
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">{p.desc}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-between mt-8">
            {step > 1 ? (
              <button type="button" onClick={() => setStep(s => s - 1)}
                className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium border border-gray-200 transition-colors">
                ← Back
              </button>
            ) : <div />}
            {step < 3 ? (
              <button type="button" onClick={() => setStep(s => s + 1)}
                className="px-6 py-2.5 bg-black hover:bg-gray-800 text-white rounded-lg text-sm font-medium transition-colors">
                Continue →
              </button>
            ) : (
              <button type="button" onClick={completeOnboarding} disabled={saving}
                className="px-6 py-2.5 bg-black hover:bg-gray-800 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-60">
                {saving ? 'Setting up…' : 'Launch HQ.ai →'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}