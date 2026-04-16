'use client'
import { useState, useEffect } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const INDUSTRIES = ['Retail','Hospitality & Food Service','Healthcare & Aged Care','Pharmacy','Construction & Trades','Professional Services','Education & Childcare','Community Services & NFP','Technology','Other']
const AWARDS = ['General Retail Industry Award','Hospitality Industry (General) Award','Restaurant Industry Award','Pharmacy Industry Award 2020','Aged Care Award','SCHADS Award','Nurses Award','Building & Construction Award','Clerks Private Sector Award','Professional Employees Award','Award-free / Enterprise Agreement','Multiple awards apply','Not sure']
const STATES = ['QLD','NSW','VIC','SA','WA','TAS','ACT','NT']
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
    bizName: '', industry: '', state: '', awards: [] as string[], headcount: '',
    empTypes: '',
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
          state: form.state,
          award: form.awards.join(', '),
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

      window.location.replace('/dashboard')

    } catch (err: any) {
      console.error('Onboarding error:', err)
      setError('Something went wrong: ' + err.message)
      setSaving(false)
    }
  }

  const inputCls = "w-full px-3 py-2.5 bg-[#1a1a1a] border border-[#333333] rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#fd7325] transition-colors"
  const selectCls = inputCls + " appearance-none"

  if (!authReady) {
    return (
      <div className="min-h-screen bg-[#000000] flex items-center justify-center">
        <div className="text-sm text-gray-500">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#000000] flex items-center justify-center p-4">
      <div className="w-full max-w-lg">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-block">
            <Image src="/logo.svg" alt="HQ.ai" width={150} height={150} className="opacity-90 w-[140px] h-auto" />
          </div>
        </div>

        <div className="bg-[#111111] rounded-2xl border border-[#222222] p-8">

          {/* Progress */}
          <div className="flex items-center gap-2 mb-8">
            {steps.map((s, i) => (
              <div key={i} className="flex items-center gap-2 flex-1">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 transition-colors
                  ${step > i + 1 ? 'bg-[#fd7325] text-white' : step === i + 1 ? 'bg-[#fd7325] text-white' : 'bg-[#1a1a1a] text-gray-500 border border-[#333333]'}`}>
                  {step > i + 1 ? '✓' : i + 1}
                </div>
                <span className={`text-xs font-bold ${step === i + 1 ? 'text-white' : 'text-gray-500'}`}>{s.label}</span>
                {i < steps.length - 1 && <div className={`flex-1 h-px ${step > i + 1 ? 'bg-[#fd7325]' : 'bg-[#333333]'}`} />}
              </div>
            ))}
          </div>

          {/* Step 1 — Business */}
          {step === 1 && (
            <div>
              <h2 className="font-display text-2xl font-bold text-white uppercase tracking-wider mb-1">Tell us about your business</h2>
              <p className="text-sm text-gray-500 mb-6">HQ uses this to tailor every response to your specific situation.</p>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1.5">Business name</label>
                  <input className={inputCls} value={form.bizName} onChange={e => update('bizName', e.target.value)} placeholder="e.g. Sunrise Pharmacy" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1.5">Industry</label>
                  <select className={selectCls} value={form.industry} onChange={e => update('industry', e.target.value)}>
                    <option value="">Select industry</option>
                    {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1.5">Number of employees</label>
                  <input
                    className={inputCls}
                    type="text"
                    value={form.headcount}
                    onChange={e => update('headcount', e.target.value)}
                    placeholder="e.g. 25"
                  />
                  <p className="text-[10px] text-gray-600 mt-1">Enter an approximate number</p>
                </div>
              </div>
            </div>
          )}

          {/* Step 2 — Employment */}
          {step === 2 && (
            <div>
              <h2 className="font-display text-2xl font-bold text-white uppercase tracking-wider mb-1">Employment details</h2>
              <p className="text-sm text-gray-500 mb-6">HQ applies the right awards and compliance rules automatically.</p>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1.5">State / Territory</label>
                  <div className="flex flex-wrap gap-2">
                    {STATES.map(s => (
                      <button key={s} type="button" onClick={() => update('state', s)}
                        className={`px-4 py-2 rounded-lg text-sm border font-bold transition-colors
                          ${form.state === s ? 'bg-[#fd7325] text-white border-[#fd7325]' : 'bg-[#1a1a1a] border-[#333333] text-gray-400 hover:border-[#fd7325]'}`}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1.5">Applicable Modern Awards (select all that apply)</label>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto scrollbar-thin pr-1">
                    {AWARDS.map(a => (
                      <button key={a} type="button" onClick={() => toggleAward(a)}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all
                          ${form.awards.includes(a) ? 'border-[#fd7325] bg-[#fd7325]/10' : 'border-[#333333] hover:border-[#444444]'}`}>
                        <div className={`w-4 h-4 rounded flex-shrink-0 flex items-center justify-center border-2 transition-colors
                          ${form.awards.includes(a) ? 'border-[#fd7325] bg-[#fd7325]' : 'border-[#444444]'}`}>
                          {form.awards.includes(a) && (
                            <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                            </svg>
                          )}
                        </div>
                        <span className="text-sm text-gray-300">{a}</span>
                      </button>
                    ))}
                  </div>
                  {form.awards.length > 0 && (
                    <p className="text-[10px] text-[#fd7325] mt-2">{form.awards.length} award{form.awards.length > 1 ? 's' : ''} selected</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-2">Employment types in your business</label>
                  <div className="space-y-2">
                    {EMP_TYPES.map(t => (
                      <button key={t} type="button" onClick={() => update('empTypes', t)}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all
                          ${form.empTypes === t ? 'border-[#fd7325] bg-[#fd7325]/10' : 'border-[#333333] hover:border-[#444444]'}`}>
                        <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors
                          ${form.empTypes === t ? 'border-[#fd7325] bg-[#fd7325]' : 'border-[#444444]'}`}>
                          {form.empTypes === t && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                        </div>
                        <span className="text-sm text-gray-300">{t}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3 — Advisor */}
          {step === 3 && (
            <div>
              <h2 className="font-display text-2xl font-bold text-white uppercase tracking-wider mb-1">Your Humanistiqs advisor</h2>
              <p className="text-sm text-gray-500 mb-6">When HQ detects something complex, it connects you directly — same advisor every time.</p>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1.5">Your name</label>
                  <input className={inputCls} value={form.userName} onChange={e => update('userName', e.target.value)} placeholder="e.g. James" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1.5">Your advisor&apos;s name</label>
                  <input className={inputCls} value={form.advisorName} onChange={e => update('advisorName', e.target.value)} placeholder="e.g. Hugo" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-2">Your HQ.ai plan</label>
                  <div className="space-y-2">
                    {PLANS.map(p => (
                      <button key={p.id} type="button" onClick={() => update('plan', p.id)}
                        className={`w-full flex items-start gap-3 p-3 rounded-xl border text-left transition-all
                          ${form.plan === p.id ? 'border-[#fd7325] bg-[#fd7325]/10' : 'border-[#333333] hover:border-[#444444]'}`}>
                        <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors
                          ${form.plan === p.id ? 'border-[#fd7325] bg-[#fd7325]' : 'border-[#444444]'}`}>
                          {form.plan === p.id && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-white">{p.label}</span>
                            {p.recommended && <span className="text-xs bg-[#fd7325] text-white px-2 py-0.5 rounded-full font-bold">Popular</span>}
                            <span className="text-sm font-bold text-white ml-auto">{p.price}</span>
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">{p.desc}</p>
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
            <div className="mt-4 bg-[#fd7325]/10 border border-[#fd7325]/30 rounded-lg px-3 py-2 text-sm text-[#fd7325]">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-between mt-8">
            {step > 1 ? (
              <button type="button" onClick={() => setStep(s => s - 1)}
                className="px-5 py-2.5 bg-[#1a1a1a] hover:bg-[#222222] text-gray-400 rounded-lg text-sm font-bold border border-[#333333] transition-colors">
                ← Back
              </button>
            ) : <div />}
            {step < 3 ? (
              <button type="button" onClick={() => setStep(s => s + 1)}
                className="px-6 py-2.5 bg-[#fd7325] hover:bg-[#e5671f] text-white rounded-lg text-sm font-bold transition-colors">
                Continue →
              </button>
            ) : (
              <button type="button" onClick={completeOnboarding} disabled={saving}
                className="px-6 py-2.5 bg-[#fd7325] hover:bg-[#e5671f] text-white rounded-lg text-sm font-bold transition-colors disabled:opacity-60">
                {saving ? 'Setting up…' : 'Launch HQ.ai →'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
