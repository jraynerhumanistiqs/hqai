'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const INDUSTRIES = ['Retail','Hospitality & Food Service','Healthcare & Aged Care','Pharmacy','Construction & Trades','Professional Services','Education & Childcare','Community Services & NFP','Technology','Other']
const AWARDS = ['General Retail Industry Award','Hospitality Industry (General) Award','Restaurant Industry Award','Pharmacy Industry Award 2020','Aged Care Award','SCHADS Award','Nurses Award','Building & Construction Award','Clerks Private Sector Award','Professional Employees Award','Award-free / Enterprise Agreement','Multiple awards apply','Not sure']
const STATES = ['QLD','NSW','VIC','SA','WA','TAS','ACT','NT']
const SIZES = ['1–10','11–30','31–80','81–150','151–250']

export default function OnboardingPage() {
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    bizName: '', industry: '', state: '', award: '', headcount: '',
    empTypes: 'Mix of full-time, part-time and casual',
    advisorName: 'Sarah', userName: '', plan: 'growth'
  })
  const supabase = createClient()
  const router = useRouter()
const steps = [
  { label: 'Business' },
  { label: 'Employment' },
  { label: 'Advisor' },
]
  const update = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

async function completeOnboarding() {
  setSaving(true)

  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      console.error('No user found:', userError)
      router.push('/login')
      return
    }

    // Create business record
    const { data: business, error: bizError } = await supabase
      .from('businesses')
      .insert({
        name: form.bizName || 'My Business',
        industry: form.industry,
        state: form.state,
        award: form.award,
        headcount: form.headcount,
        employment_types: form.empTypes,
        advisor_name: form.advisorName,
        plan: form.plan,
      })
      .select()
      .single()

    if (bizError) {
  console.error('Business error code:', bizError.code)
  console.error('Business error message:', bizError.message)
  console.error('Business error details:', bizError.details)
  console.error('Business error hint:', bizError.hint)
  alert('Error: ' + bizError.message + ' | ' + bizError.hint)
  setSaving(false)
  return
}

    // Create or update profile record
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
      console.error('Profile error:', profileError)
      setSaving(false)
      return
    }

    router.push('/dashboard')

  } catch (err) {
    console.error('Onboarding error:', err)
    setSaving(false)
  }
}

  return (
    <div className="min-h-screen bg-sand flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2">
            <div className="w-9 h-9 bg-teal rounded-xl flex items-center justify-center text-white font-serif">HQ</div>
            <span className="font-serif text-xl text-ink">HQ.ai</span>
          </div>
        </div>

        <div className="bg-cream rounded-2xl border border-sand3 p-8 shadow-sm">
          {/* Progress */}
          <div className="flex items-center gap-2 mb-8">
            {steps.map((s, i) => (
              <div key={i} className="flex items-center gap-2 flex-1">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 transition-colors
                  ${step > i + 1 ? 'bg-teal text-white' : step === i + 1 ? 'bg-teal text-white' : 'bg-sand2 text-stone border border-sand3'}`}>
                  {step > i + 1 ? '✓' : i + 1}
                </div>
                <span className={`text-xs font-medium ${step === i + 1 ? 'text-ink' : 'text-stone'}`}>{s.label}</span>
                {i < steps.length - 1 && <div className={`flex-1 h-px ${step > i + 1 ? 'bg-teal' : 'bg-sand3'}`} />}
              </div>
            ))}
          </div>

          {/* Step 1 — Business basics */}
          {step === 1 && (
            <div>
              <h2 className="font-serif text-2xl font-normal text-ink mb-1">Tell us about your business</h2>
              <p className="text-sm text-ink3 mb-6">HQ uses this to tailor every response to your specific business — no generic advice.</p>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-ink2 mb-1.5">Business name</label>
                  <input className="w-full px-3 py-2.5 bg-sand border border-sand3 rounded-lg text-sm text-ink placeholder-stone focus:outline-none focus:border-teal2 transition-colors"
                    value={form.bizName} onChange={e => update('bizName', e.target.value)} placeholder="e.g. Sunrise Pharmacy" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink2 mb-1.5">Industry</label>
                  <select className="w-full px-3 py-2.5 bg-sand border border-sand3 rounded-lg text-sm text-ink focus:outline-none focus:border-teal2 transition-colors appearance-none"
                    value={form.industry} onChange={e => update('industry', e.target.value)}>
                    <option value="">Select industry</option>
                    {INDUSTRIES.map(i => <option key={i}>{i}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink2 mb-1.5">Number of employees</label>
                  <div className="flex flex-wrap gap-2">
                    {SIZES.map(s => (
                      <button key={s} onClick={() => update('headcount', s)}
                        className={`px-4 py-2 rounded-lg text-sm border transition-colors ${form.headcount === s ? 'bg-teal text-white border-teal' : 'bg-sand border-sand3 text-ink2 hover:border-teal2'}`}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2 — Employment details */}
          {step === 2 && (
            <div>
              <h2 className="font-serif text-2xl font-normal text-ink mb-1">Employment details</h2>
              <p className="text-sm text-ink3 mb-6">HQ applies the right awards and compliance rules automatically.</p>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-ink2 mb-1.5">State / Territory</label>
                  <div className="flex flex-wrap gap-2">
                    {STATES.map(s => (
                      <button key={s} onClick={() => update('state', s)}
                        className={`px-4 py-2 rounded-lg text-sm border transition-colors ${form.state === s ? 'bg-teal text-white border-teal' : 'bg-sand border-sand3 text-ink2 hover:border-teal2'}`}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink2 mb-1.5">Primary Modern Award (if applicable)</label>
                  <select className="w-full px-3 py-2.5 bg-sand border border-sand3 rounded-lg text-sm text-ink focus:outline-none focus:border-teal2 transition-colors appearance-none"
                    value={form.award} onChange={e => update('award', e.target.value)}>
                    <option value="">Select or skip</option>
                    {AWARDS.map(a => <option key={a}>{a}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink2 mb-1.5">Employment types in your business</label>
                  {['Full-time only','Full-time and part-time','Full-time, part-time and casual','Primarily casual'].map(t => (
                    <label key={t} className="flex items-center gap-2.5 py-2 cursor-pointer group">
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors
                        ${form.empTypes === t ? 'border-teal bg-teal' : 'border-sand3 group-hover:border-teal2'}`}>
                        {form.empTypes === t && <div className="w-2 h-2 bg-white rounded-full" />}
                      </div>
                      <span className="text-sm text-ink2">{t}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 3 — Advisor */}
          {step === 3 && (
            <div>
              <h2 className="font-serif text-2xl font-normal text-ink mb-1">Your Humanistiqs advisor</h2>
              <p className="text-sm text-ink3 mb-6">When HQ detects something complex, it connects you directly — same advisor every time, no repeating yourself.</p>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-ink2 mb-1.5">Your name</label>
                  <input className="w-full px-3 py-2.5 bg-sand border border-sand3 rounded-lg text-sm text-ink placeholder-stone focus:outline-none focus:border-teal2 transition-colors"
                    value={form.userName} onChange={e => update('userName', e.target.value)} placeholder="e.g. James" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink2 mb-1.5">Your advisor's name</label>
                  <input className="w-full px-3 py-2.5 bg-sand border border-sand3 rounded-lg text-sm text-ink placeholder-stone focus:outline-none focus:border-teal2 transition-colors"
                    value={form.advisorName} onChange={e => update('advisorName', e.target.value)} placeholder="e.g. Sarah" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink2 mb-2">Your HQ.ai plan</label>
                  <div className="space-y-2">
                    {[
                      { id: 'essentials', label: 'Essentials', price: '$99/month', desc: 'Up to 3 seats, 50 AI queries/month' },
                      { id: 'growth', label: 'Growth', price: '$199/month', desc: 'Up to 6 seats, unlimited queries + 1 advisor hr', recommended: true },
                      { id: 'scale', label: 'Scale', price: '$379/month', desc: 'Up to 12 seats, dedicated advisor, priority SLA' },
                    ].map(p => (
                      <label key={p.id} onClick={() => update('plan', p.id)}
                        className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all
                          ${form.plan === p.id ? 'border-teal bg-teal3' : 'border-sand3 hover:border-teal2'}`}>
                        <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors
                          ${form.plan === p.id ? 'border-teal bg-teal' : 'border-sand3'}`}>
                          {form.plan === p.id && <div className="w-2 h-2 bg-white rounded-full" />}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-ink">{p.label}</span>
                            {p.recommended && <span className="text-xs bg-teal text-white px-2 py-0.5 rounded-full">Popular</span>}
                            <span className="text-sm text-teal font-medium ml-auto">{p.price}</span>
                          </div>
                          <p className="text-xs text-ink3 mt-0.5">{p.desc}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-between mt-8">
            {step > 1 ? (
              <button onClick={() => setStep(s => s - 1)}
                className="px-5 py-2.5 bg-sand2 hover:bg-sand3 text-ink2 rounded-lg text-sm font-medium border border-sand3 transition-colors">
                ← Back
              </button>
            ) : <div />}
            {step < 3 ? (
              <button onClick={() => setStep(s => s + 1)}
                className="px-6 py-2.5 bg-teal hover:bg-teal2 text-white rounded-lg text-sm font-medium transition-colors">
                Continue →
              </button>
            ) : (
              <button onClick={completeOnboarding} disabled={saving}
                className="px-6 py-2.5 bg-teal hover:bg-teal2 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-60">
                {saving ? 'Setting up…' : 'Launch HQ.ai →'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
