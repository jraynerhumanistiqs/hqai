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

  const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div>
      <label className="block text-xs font-medium text-ink2 mb-1.5">{label}</label>
      {children}
    </div>
  )

  const inputCls = "w-full px-3 py-2.5 bg-sand border border-sand3 rounded-lg text-sm text-ink placeholder-stone focus:outline-none focus:border-teal2 transition-colors"
  const selectCls = inputCls + " appearance-none"

  return (
    <div className="h-full overflow-y-auto scrollbar-thin bg-cream">
      <div className="max-w-2xl mx-auto px-8 py-8">
        <h1 className="font-serif text-2xl font-normal text-ink mb-1">Settings</h1>
        <p className="text-sm text-ink3 mb-8">Update your business profile and advisor details</p>

        {/* Personal */}
        <section className="bg-cream border border-sand3 rounded-2xl p-6 mb-5">
          <h2 className="font-medium text-ink mb-4">Your profile</h2>
          <Field label="Your name">
            <input className={inputCls} value={userName} onChange={e => setUserName(e.target.value)} placeholder="James Smith" />
          </Field>
        </section>

        {/* Business */}
        <section className="bg-cream border border-sand3 rounded-2xl p-6 mb-5">
          <h2 className="font-medium text-ink mb-4">Business details</h2>
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

        {/* Advisor */}
        <section className="bg-cream border border-sand3 rounded-2xl p-6 mb-5">
          <h2 className="font-medium text-ink mb-1">Advisor details</h2>
          <p className="text-xs text-ink3 mb-4">Your named Humanistiqs advisor — HQ will reference them in escalation recommendations</p>
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
          className="bg-teal hover:bg-teal2 text-white font-medium px-6 py-2.5 rounded-xl text-sm transition-colors disabled:opacity-60">
          {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save changes'}
        </button>

        {/* Billing */}
        <section className="bg-cream border border-sand3 rounded-2xl p-6 mt-5">
          <h2 className="font-medium text-ink mb-1">Billing & subscription</h2>
          <p className="text-xs text-ink3 mb-4">Manage your HQ.ai plan and payment method</p>

          {searchParams.get('billing') === 'success' && (
            <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-sm text-green-700 mb-4">
              Subscription activated successfully!
            </div>
          )}

          <div className="bg-sand rounded-xl p-4 flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-medium text-ink">{PLAN_DETAILS[plan]?.name || plan} plan</p>
              <p className="text-xs text-ink3">
                {subscriptionStatus === 'active' ? 'Active' :
                 subscriptionStatus === 'trialing' ? '14-day free trial' :
                 subscriptionStatus === 'cancelled' ? 'Cancelled' : subscriptionStatus}
                {PLAN_DETAILS[plan] && ` · ${PLAN_DETAILS[plan].seats} seats · ${PLAN_DETAILS[plan].price}`}
              </p>
            </div>
            {hasStripe ? (
              <button onClick={openPortal} disabled={billingLoading}
                className="bg-ink hover:bg-charcoal text-white text-xs font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-60">
                {billingLoading ? 'Loading…' : 'Manage billing'}
              </button>
            ) : (
              <button onClick={openPortal} disabled={billingLoading}
                className="bg-teal hover:bg-teal2 text-white text-xs font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-60">
                {billingLoading ? 'Loading…' : 'Upgrade plan'}
              </button>
            )}
          </div>

          {!hasStripe && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {(['essentials', 'growth', 'scale'] as const).map(pid => {
                const p = PLAN_DETAILS[pid]
                return (
                  <div key={pid} className={`rounded-xl border p-4 ${plan === pid ? 'border-teal bg-teal/5' : 'border-sand3'}`}>
                    <p className="text-sm font-medium text-ink">{p.name}</p>
                    <p className="text-lg font-semibold text-ink mt-1">{p.price}</p>
                    <p className="text-xs text-ink3 mt-1">{p.seats} seats</p>
                    {pid === 'growth' && <span className="inline-block mt-2 text-[10px] bg-ink text-white px-2 py-0.5 rounded-full">Popular</span>}
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  )

  async function openPortal() {
    setBillingLoading(true)
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else if (data.error === 'No billing account') {
        // No Stripe customer yet — this would need a Stripe price ID configured
        // For now, show a message
        alert('Stripe is not yet configured. Please contact support to upgrade.')
      }
    } catch {
      alert('Something went wrong. Please try again.')
    }
    setBillingLoading(false)
  }
}
