'use client'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const INDUSTRIES = ['Retail','Hospitality & Food Service','Healthcare & Aged Care','Pharmacy','Construction & Trades','Professional Services','Education & Childcare','Community Services & NFP','Technology','Other']
const AWARDS = ['General Retail Industry Award','Hospitality Industry (General) Award','Restaurant Industry Award','Pharmacy Industry Award 2020','Aged Care Award','SCHADS Award','Nurses Award','Building & Construction Award','Clerks Private Sector Award','Professional Employees Award','Award-free / Enterprise Agreement','Multiple awards apply','Not sure']
const STATES = ['QLD','NSW','VIC','SA','WA','TAS','ACT','NT']

const PLAN_DETAILS: Record<string, { name: string; price: string; seats: number }> = {
  free: { name: 'Free Trial', price: '$0', seats: 1 },
  essentials: { name: 'Essentials', price: '$99/mo', seats: 3 },
  growth: { name: 'Growth', price: '$199/mo', seats: 6 },
  scale: { name: 'Scale', price: '$379/mo', seats: 12 },
}

const inputCls = "w-full px-3 py-2.5 bg-[#1a1a1a] border border-[#333333] rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#fd7325] transition-colors"
const selectCls = inputCls + " appearance-none"

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-bold text-gray-400 mb-1.5">{label}</label>
      {children}
    </div>
  )
}

export default function SettingsPage() {
  const [form, setForm] = useState({ name: '', industry: '', state: '', award: '', headcount: '', employment_types: '', advisor_name: '', advisor_email: '', calendly_link: '' })
  const [userName, setUserName] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [bizId, setBizId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [plan, setPlan] = useState('free')
  const [subscriptionStatus, setSubscriptionStatus] = useState('trialing')
  const [hasStripe, setHasStripe] = useState(false)
  const [billingLoading, setBillingLoading] = useState(false)
  const [billingError, setBillingError] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const searchParams = useSearchParams()
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)
      const { data: profile } = await supabase
        .from('profiles').select('*, businesses(*)').eq('id', user.id).single()
      if (!profile) return
      setUserName(profile.full_name || '')
      const biz = profile.businesses as any
      if (biz) {
        setBizId(biz.id)
        setPlan(biz.plan || 'free')
        setSubscriptionStatus(biz.subscription_status || 'trialing')
        setHasStripe(!!biz.stripe_customer_id)
        setLogoUrl(biz.logo_url || '')
        setForm({
          name: biz.name || '', industry: biz.industry || '', state: biz.state || '',
          award: biz.award || '', headcount: biz.headcount || '',
          employment_types: biz.employment_types || '', advisor_name: biz.advisor_name || '',
          advisor_email: biz.advisor_email || '', calendly_link: biz.calendly_link || '',
        })
      }
    }
    load()
  }, [])

  async function save() {
    if (!bizId || !userId) return
    setSaving(true)
    await supabase.from('businesses').update(form).eq('id', bizId)
    await supabase.from('profiles').update({ full_name: userName }).eq('id', userId)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const [logoUploading, setLogoUploading] = useState(false)
  const [logoError, setLogoError] = useState('')

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !bizId) return
    if (file.size > 2 * 1024 * 1024) { setLogoError('File must be under 2MB'); return }
    setLogoUploading(true)
    setLogoError('')

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/upload-logo', { method: 'POST', body: formData })
      const data = await res.json()

      if (!res.ok) {
        setLogoError(data.error || 'Upload failed')
        setLogoUploading(false)
        return
      }

      setLogoUrl(data.url)
    } catch (err: any) {
      setLogoError(`Upload failed: ${err?.message || 'Unknown error'}`)
    }
    setLogoUploading(false)
  }

  async function openPortal() {
    setBillingLoading(true)
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else if (data.error === 'No billing account') {
        setBillingError('Stripe billing is being configured. Please contact support@humanistiqs.com.au to upgrade your plan.')
      }
    } catch {
      setBillingError('Something went wrong. Please try again or contact support@humanistiqs.com.au.')
    }
    setBillingLoading(false)
  }

  return (
    <div className="h-full overflow-y-auto scrollbar-thin bg-[#000000]">
      <div className="max-w-2xl mx-auto px-8 py-8">
        <h1 className="font-display text-h1 font-bold text-white uppercase tracking-wide mb-1">Settings</h1>
        <p className="text-sm text-gray-400 mb-8">Update your business profile and advisor details</p>

        {/* Company Logo */}
        <section className="bg-[#111111] border border-[#222222] rounded-2xl p-6 mb-5">
          <h2 className="font-display text-lg font-bold text-white uppercase tracking-wider mb-4">Company logo</h2>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-[#1a1a1a] border-2 border-dashed border-[#333333] rounded-xl flex items-center justify-center overflow-hidden">
              {logoUrl ? (
                <img src={logoUrl} alt="Company logo" className="w-full h-full object-contain rounded-xl" />
              ) : (
                <svg className="w-6 h-6 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd"/>
                </svg>
              )}
            </div>
            <div>
              <label className={`cursor-pointer bg-[#1a1a1a] border border-[#333333] rounded-lg px-4 py-2 text-sm font-bold text-white hover:bg-[#222222] transition-colors inline-block ${logoUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                {logoUploading ? 'Uploading…' : 'Upload logo'}
                <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={logoUploading} />
              </label>
              <p className="text-xs text-gray-500 mt-1">PNG or JPG, max 2MB</p>
              {logoError && (
                <p className="text-xs text-[#fd7325] mt-1">{logoError}</p>
              )}
            </div>
          </div>
        </section>

        {/* Personal */}
        <section className="bg-[#111111] border border-[#222222] rounded-2xl p-6 mb-5">
          <h2 className="font-display text-lg font-bold text-white uppercase tracking-wider mb-4">Your profile</h2>
          <Field label="Your name">
            <input className={inputCls} value={userName} onChange={e => setUserName(e.target.value)} placeholder="James Smith" />
          </Field>
        </section>

        {/* Business */}
        <section className="bg-[#111111] border border-[#222222] rounded-2xl p-6 mb-5">
          <h2 className="font-display text-lg font-bold text-white uppercase tracking-wider mb-4">Business details</h2>
          <div className="space-y-4">
            <Field label="Business name">
              <input className={inputCls} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="My Business Pty Ltd" />
            </Field>
            <Field label="Industry">
              <select className={selectCls} value={form.industry} onChange={e => setForm(f => ({ ...f, industry: e.target.value }))}>
                <option value="">Select industry</option>
                {INDUSTRIES.map(i => <option key={i}>{i}</option>)}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="State / Territory">
                <select className={selectCls} value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))}>
                  <option value="">Select state</option>
                  {STATES.map(s => <option key={s}>{s}</option>)}
                </select>
              </Field>
              <Field label="Headcount">
                <select className={selectCls} value={form.headcount} onChange={e => setForm(f => ({ ...f, headcount: e.target.value }))}>
                  <option value="">Select headcount</option>
                  {['1–10','11–30','31–80','81–150','151–250'].map(s => <option key={s}>{s}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Primary Modern Award">
              <select className={selectCls} value={form.award} onChange={e => setForm(f => ({ ...f, award: e.target.value }))}>
                <option value="">Select or skip</option>
                {AWARDS.map(a => <option key={a}>{a}</option>)}
              </select>
            </Field>
          </div>
        </section>

        {/* Advisor — subscription gated */}
        <section className="bg-[#111111] border border-[#222222] rounded-2xl p-6 mb-5 relative">
          <h2 className="font-display text-lg font-bold text-white uppercase tracking-wider mb-1">Advisor details</h2>
          <p className="text-xs text-gray-500 mb-4">Your named Humanistiqs advisor — HQ will reference them in escalation recommendations</p>
          {plan === 'free' && (
            <div className="absolute inset-0 bg-[#111111]/80 backdrop-blur-sm rounded-2xl flex items-center justify-center z-10">
              <button onClick={openPortal}
                className="bg-[#ffffff] text-[#fd7325] font-display font-bold text-lg px-6 py-3 rounded-xl hover:bg-gray-100 transition-colors uppercase tracking-wider">
                Upgrade to unlock
              </button>
            </div>
          )}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Advisor name">
                <input className={inputCls} value={form.advisor_name} onChange={e => setForm(f => ({ ...f, advisor_name: e.target.value }))} placeholder="Sarah" />
              </Field>
              <Field label="Advisor email">
                <input className={inputCls} value={form.advisor_email} onChange={e => setForm(f => ({ ...f, advisor_email: e.target.value }))} placeholder="sarah@humanistiqs.com.au" />
              </Field>
            </div>
            <Field label="Calendly booking link">
              <input className={inputCls} value={form.calendly_link} onChange={e => setForm(f => ({ ...f, calendly_link: e.target.value }))} placeholder="https://calendly.com/your-advisor" />
            </Field>
          </div>
        </section>

        <button onClick={save} disabled={saving}
          className="bg-[#fd7325] hover:bg-[#e5671f] text-white font-bold px-6 py-2.5 rounded-xl text-sm transition-colors disabled:opacity-60">
          {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save changes'}
        </button>

        {/* Billing */}
        <section className="bg-[#111111] border border-[#222222] rounded-2xl p-6 mt-5">
          <h2 className="font-display text-lg font-bold text-white uppercase tracking-wider mb-1">Billing & subscription</h2>
          <p className="text-xs text-gray-500 mb-4">Manage your HQ.ai plan and payment method</p>

          {billingError && (
            <div className="bg-[#fd7325]/10 border border-[#fd7325]/30 rounded-lg px-4 py-3 text-sm text-[#fd7325] mb-4 flex items-center">
              <span className="flex-1">{billingError}</span>
              <button onClick={() => setBillingError('')} className="ml-2 font-bold text-[#fd7325] hover:text-white">✕</button>
            </div>
          )}

          {searchParams.get('billing') === 'success' && (
            <div className="bg-green-900/30 border border-green-700 rounded-lg px-3 py-2 text-sm text-green-400 mb-4">
              Subscription activated successfully!
            </div>
          )}

          <div className="bg-[#1a1a1a] rounded-xl p-4 flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-bold text-white">{PLAN_DETAILS[plan]?.name || plan} plan</p>
              <p className="text-xs text-gray-500">
                {subscriptionStatus === 'active' ? 'Active' :
                 subscriptionStatus === 'trialing' ? '14-day free trial' :
                 subscriptionStatus === 'cancelled' ? 'Cancelled' : subscriptionStatus}
                {PLAN_DETAILS[plan] && ` · ${PLAN_DETAILS[plan].seats} seats · ${PLAN_DETAILS[plan].price}`}
              </p>
            </div>
            {hasStripe ? (
              <button onClick={openPortal} disabled={billingLoading}
                className="bg-white hover:bg-gray-200 text-black text-xs font-bold px-4 py-2 rounded-lg transition-colors disabled:opacity-60">
                {billingLoading ? 'Loading…' : 'Manage billing'}
              </button>
            ) : (
              <button onClick={openPortal} disabled={billingLoading}
                className="bg-[#fd7325] hover:bg-[#e5671f] text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors disabled:opacity-60">
                {billingLoading ? 'Loading…' : 'Upgrade plan'}
              </button>
            )}
          </div>

          {!hasStripe && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {(['essentials', 'growth', 'scale'] as const).map(pid => {
                const p = PLAN_DETAILS[pid]
                return (
                  <div key={pid} className={`rounded-xl border p-4 ${plan === pid ? 'border-[#fd7325] bg-[#fd7325]/10' : 'border-[#333333]'}`}>
                    <p className="text-sm font-bold text-white">{p.name}</p>
                    <p className="text-lg font-bold text-white mt-1">{p.price}</p>
                    <p className="text-xs text-gray-500 mt-1">{p.seats} seats</p>
                    {pid === 'growth' && <span className="inline-block mt-2 text-[10px] bg-[#fd7325] text-white px-2 py-0.5 rounded-full font-bold">Popular</span>}
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
