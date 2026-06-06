'use client'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const INDUSTRIES = ['Retail','Hospitality & Food Service','Healthcare & Aged Care','Pharmacy','Construction & Trades','Professional Services','Education & Childcare','Community Services & NFP','Technology','Other']
const AWARDS = ['General Retail Industry Award','Hospitality Industry (General) Award','Restaurant Industry Award','Pharmacy Industry Award 2020','Aged Care Award','SCHADS Award','Nurses Award','Building & Construction Award','Clerks Private Sector Award','Professional Employees Award','Award-free / Enterprise Agreement','Multiple awards apply','Not sure']
const STATES = ['QLD','NSW','VIC','SA','WA','TAS','ACT','NT']

// v2 pricing (May 2026). Plan ids MUST match lib/pricing-config.ts +
// the /api/stripe/checkout validator, which only accepts 'solo' and
// 'business'. The retired essentials/growth/scale ids were what caused
// the "Invalid planId. Expected one of: solo, business." error.
const PLAN_DETAILS: Record<string, { name: string; priceMonthly: string; priceAnnual: string; seats: number }> = {
  free:     { name: 'Free Trial', priceMonthly: '$0', priceAnnual: '$0', seats: 1 },
  solo:     { name: 'Solo', priceMonthly: '$89 / month', priceAnnual: '$890 / year', seats: 3 },
  business: { name: 'Business', priceMonthly: '$249 / month', priceAnnual: '$2,490 / year', seats: 15 },
}

type PaidPlanId = 'solo' | 'business'

// Premium-minimal underline for text inputs; selects keep a subtle
// box because a bare underline + browser chevron renders inconsistently
// across OSes.
const inputCls = "w-full border-b border-ink/30 focus:border-ink bg-transparent px-1 py-2.5 text-sm text-ink placeholder-ink-muted outline-none transition-colors"
const selectCls = "w-full px-3 py-2.5 bg-bg-elevated border border-border rounded-lg text-sm text-ink placeholder-ink-muted focus:outline-none focus:border-ink transition-colors appearance-none"

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-bold text-mid mb-1.5">{label}</label>
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
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false)
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
    setBillingError('')
    setBillingLoading(true)
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
        return
      }
      setBillingError(data.error || 'Could not open the billing portal. Please try again or contact support.')
    } catch {
      setBillingError('Could not open the billing portal. Please check your connection and try again.')
    }
    setBillingLoading(false)
  }

  // Whether the business is actually on a paid plan. Gate the plan
  // picker on THIS, not on hasStripe - a stripe_customer_id gets created
  // the moment checkout *starts* (before any payment), so gating on it
  // made the picker vanish after one click without a subscription,
  // stranding the user. Active subscription = hide picker, show portal.
  const isSubscribed = subscriptionStatus === 'active'

  const [checkoutBusyFor, setCheckoutBusyFor] = useState<PaidPlanId | null>(null)
  // Billing cycle toggle. Annual is ~2 months free; the checkout route
  // resolves the right Stripe price id from (planId, cycle).
  const [cycle, setCycle] = useState<'monthly' | 'annual'>('monthly')

  async function startCheckout(planId: PaidPlanId, opts?: { foundation?: boolean }) {
    setBillingError('')
    setCheckoutBusyFor(planId)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Foundation 100 is a Business plan on an annual cycle at a
        // locked price - force those when the foundation flag is set.
        body: JSON.stringify(
          opts?.foundation
            ? { planId: 'business', cycle: 'annual', foundation: true }
            : { planId, cycle },
        ),
      })
      const data = await res.json().catch(() => ({} as { url?: string; error?: string }))
      if (res.ok && data.url) {
        window.location.href = data.url
        return
      }
      if (res.status === 503) {
        // Stripe price ids not configured yet - fall back to the
        // existing "email us to upgrade" path so the user is never
        // dead-ended.
        setUpgradeModalOpen(true)
      } else {
        setBillingError(data.error || `Could not start checkout (HTTP ${res.status}).`)
      }
    } catch (err) {
      setBillingError(err instanceof Error ? err.message : 'Could not start checkout. Please try again.')
    }
    setCheckoutBusyFor(null)
  }

  return (
    <div className="h-full overflow-y-auto scrollbar-thin bg-bg">
      <div className="max-w-2xl mx-auto px-4 sm:px-8 py-8">
        {/* Matches the AI Administrator page header pattern - small
            eyebrow label + sans h1 + ink-soft body line. */}
        <p className="text-xs font-bold uppercase tracking-wider text-ink-muted mb-2">
          Settings
        </p>
        <h1 className="font-sans text-h1 font-bold text-ink mb-2 tracking-tight">
          Your HQ.ai workspace.
        </h1>
        <p className="text-body text-ink-soft mb-6 max-w-2xl">
          Update your business profile, advisor handoff details and billing plan.
        </p>

        {/* Company Logo */}
        <section className="bg-bg-elevated border border-border rounded-3xl p-4 sm:p-6 mb-4 sm:mb-5">
          <h2 className="font-display text-lg font-bold text-charcoal uppercase tracking-wider mb-4">Company logo</h2>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-light border-2 border-dashed border-border rounded-xl flex items-center justify-center overflow-hidden">
              {logoUrl ? (
                <img src={logoUrl} alt="Company logo" className="w-full h-full object-contain rounded-xl" />
              ) : (
                <svg className="w-6 h-6 text-muted" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd"/>
                </svg>
              )}
            </div>
            <div>
              <label className={`cursor-pointer bg-bg-elevated border border-border rounded-lg px-4 py-2 text-sm font-bold text-charcoal hover:bg-light transition-colors inline-block ${logoUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                {logoUploading ? 'Uploading…' : 'Upload logo'}
                <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={logoUploading} />
              </label>
              <p className="text-xs text-muted mt-1">PNG or JPG, max 2MB</p>
              {logoError && (
                <p className="text-xs text-danger mt-1">{logoError}</p>
              )}
            </div>
          </div>
        </section>

        {/* Personal */}
        <section className="bg-bg-elevated border border-border rounded-3xl p-4 sm:p-6 mb-4 sm:mb-5">
          <h2 className="font-display text-lg font-bold text-charcoal uppercase tracking-wider mb-4">Your profile</h2>
          <Field label="Your name">
            <input className={inputCls} value={userName} onChange={e => setUserName(e.target.value)} placeholder="James Smith" />
          </Field>
        </section>

        {/* Business */}
        <section className="bg-bg-elevated border border-border rounded-3xl p-4 sm:p-6 mb-4 sm:mb-5">
          <h2 className="font-display text-lg font-bold text-charcoal uppercase tracking-wider mb-4">Business details</h2>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="State / Territory">
                <select className={selectCls} value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))}>
                  <option value="">Select state</option>
                  {STATES.map(s => <option key={s}>{s}</option>)}
                </select>
              </Field>
              <Field label="Headcount">
                <select className={selectCls} value={form.headcount} onChange={e => setForm(f => ({ ...f, headcount: e.target.value }))}>
                  <option value="">Select headcount</option>
                  {['1-10','11-30','31-80','81-150','151-250'].map(s => <option key={s}>{s}</option>)}
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

        {/* Advisor - subscription gated */}
        <section className="bg-bg-elevated border border-border rounded-3xl p-4 sm:p-6 mb-4 sm:mb-5 relative">
          <h2 className="font-display text-lg font-bold text-charcoal uppercase tracking-wider mb-1">Advisor details</h2>
          <p className="text-xs text-muted mb-4">Two advisors looking after you: your AI Advisor (in the app) and your human Humanistiqs Advisor (real person, on call when things get complex).</p>
          {plan === 'free' && (
            <div className="absolute inset-0 bg-bg/40 backdrop-blur-[1.5px] rounded-3xl flex items-center justify-center z-10">
              <button onClick={openPortal}
                className="bg-ink text-bg-elevated font-display text-lg px-6 py-3 rounded-full hover:bg-accent transition-colors tracking-tight">
                Upgrade to unlock
              </button>
            </div>
          )}
          <div className="space-y-4">
            <div>
              <Field label="Your AI Advisor's name (the one in HQ.ai)">
                <input className={inputCls} value={form.advisor_name} onChange={e => setForm(f => ({ ...f, advisor_name: e.target.value }))} placeholder="Hugo, Sarah, anything you like" />
              </Field>
              <p className="text-[10px] text-muted mt-1">This is the name that shows up in chat. Pick something friendly.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-1 gap-4">
              <Field label="Your human Humanistiqs Advisor's email">
                <input className={inputCls} value={form.advisor_email} onChange={e => setForm(f => ({ ...f, advisor_email: e.target.value }))} placeholder="sarah@humanistiqs.com.au" />
              </Field>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div>
                <label className="block text-xs font-bold text-mid mb-1.5">Book a time</label>
                <a
                  href={form.calendly_link || '#'}
                  target={form.calendly_link ? '_blank' : undefined}
                  rel={form.calendly_link ? 'noopener noreferrer' : undefined}
                  onClick={e => { if (!form.calendly_link) e.preventDefault() }}
                  aria-disabled={!form.calendly_link}
                  className={`w-full inline-flex items-center justify-center gap-2 bg-ink text-bg-elevated font-semibold px-4 py-2.5 rounded-full text-sm transition-colors ${form.calendly_link ? 'hover:bg-accent' : 'opacity-50 cursor-not-allowed'}`}
                >
                  <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd"/>
                  </svg>
                  Calendly booking
                </a>
              </div>
              <div>
                <label className="block text-xs font-bold text-mid mb-1.5">Or call them</label>
                <a
                  href={form.advisor_email ? `mailto:${form.advisor_email}?subject=HQ.ai%20advisor%20call` : '#'}
                  onClick={e => { if (!form.advisor_email) e.preventDefault() }}
                  aria-disabled={!form.advisor_email}
                  className={`w-full inline-flex items-center justify-center gap-2 bg-bg-elevated border border-border text-ink font-semibold px-4 py-2.5 rounded-full text-sm transition-colors ${form.advisor_email ? 'hover:bg-bg-soft' : 'opacity-50 cursor-not-allowed'}`}
                >
                  <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z"/>
                  </svg>
                  Call my HQ Advisor
                </a>
              </div>
            </div>
            <Field label="Calendly booking link (URL)">
              <input className={inputCls} value={form.calendly_link} onChange={e => setForm(f => ({ ...f, calendly_link: e.target.value }))} placeholder="https://calendly.com/your-advisor" />
            </Field>
          </div>
        </section>

        <button onClick={save} disabled={saving}
          className="bg-accent hover:bg-accent-hover text-ink-on-accent font-bold px-6 py-2.5 rounded-full text-sm transition-colors disabled:opacity-60">
          {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save changes'}
        </button>


        {/* Billing */}
        <section className="bg-bg-elevated border border-border rounded-3xl p-6 mt-5">
          <h2 className="font-display text-lg font-bold text-charcoal uppercase tracking-wider mb-1">Billing & subscription</h2>
          <p className="text-xs text-muted mb-4">Manage your HQ.ai plan and payment method</p>

          {billingError && (
            <div className="bg-danger/10 border border-danger/30 rounded-lg px-4 py-3 text-sm text-danger mb-4 flex items-center">
              <span className="flex-1">{billingError}</span>
              <button onClick={() => setBillingError('')} className="ml-2 font-bold text-danger hover:text-charcoal">✕</button>
            </div>
          )}

          {searchParams.get('billing') === 'success' && (
            <div className="bg-green-900/30 border border-green-700 rounded-lg px-3 py-2 text-sm text-green-400 mb-4">
              Subscription activated successfully!
            </div>
          )}

          <div className="bg-light rounded-xl p-4 flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-bold text-charcoal">{PLAN_DETAILS[plan]?.name || plan} plan</p>
              <p className="text-xs text-muted">
                {subscriptionStatus === 'active' ? 'Active' :
                 subscriptionStatus === 'trialing' ? '14-day free trial' :
                 subscriptionStatus === 'cancelled' ? 'Cancelled' : subscriptionStatus}
                {PLAN_DETAILS[plan] && plan !== 'free' && ` · ${PLAN_DETAILS[plan].seats} seats · ${PLAN_DETAILS[plan].priceMonthly}`}
              </p>
            </div>
            {hasStripe && (
              <button onClick={openPortal} disabled={billingLoading}
                className="bg-bg-elevated hover:bg-gray-200 text-ink text-xs font-bold px-4 py-2 rounded-lg transition-colors disabled:opacity-60">
                {billingLoading ? 'Loading...' : 'Manage billing'}
              </button>
            )}
          </div>

          {/* Plan picker - shown to anyone not on an ACTIVE paid plan
              (trial / none / cancelled). Gated on subscription status,
              NOT on hasStripe, so starting checkout once (which creates a
              Stripe customer) doesn't hide the picker. Sends the v2 plan
              ids (solo / business) the checkout route accepts. */}
          {!isSubscribed && (
            <>
              {/* Monthly / annual toggle */}
              <div className="flex items-center justify-center gap-1 bg-light rounded-full p-1 w-fit mx-auto mb-4">
                <button
                  type="button"
                  onClick={() => setCycle('monthly')}
                  className={`text-xs font-bold px-4 py-1.5 rounded-full transition-colors ${cycle === 'monthly' ? 'bg-ink text-bg-elevated' : 'text-mid hover:text-ink'}`}
                >Monthly</button>
                <button
                  type="button"
                  onClick={() => setCycle('annual')}
                  className={`text-xs font-bold px-4 py-1.5 rounded-full transition-colors ${cycle === 'annual' ? 'bg-ink text-bg-elevated' : 'text-mid hover:text-ink'}`}
                >Annual <span className="text-accent">save ~2mo</span></button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(['solo', 'business'] as const).map(pid => {
                  const p = PLAN_DETAILS[pid]
                  const busy = checkoutBusyFor === pid
                  const disabled = checkoutBusyFor !== null && !busy
                  return (
                    <button
                      type="button"
                      key={pid}
                      onClick={() => startCheckout(pid)}
                      disabled={disabled}
                      className={`text-left rounded-2xl border p-4 transition-colors hover:border-ink focus:border-ink focus:outline-none disabled:opacity-60 ${plan === pid ? 'border-ink bg-ink/5' : 'border-border'}`}
                    >
                      <p className="text-sm font-bold text-charcoal">{p.name}</p>
                      <p className="text-lg font-bold text-charcoal mt-1">{cycle === 'annual' ? p.priceAnnual : p.priceMonthly}</p>
                      <p className="text-xs text-muted mt-1">{p.seats} seats</p>
                      <div className="mt-3 flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-charcoal">
                          {busy ? 'Redirecting...' : `Choose ${p.name}`}
                        </span>
                        {pid === 'business' && (
                          <span className="text-[10px] bg-accent-soft text-accent border border-accent/30 px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider">Popular</span>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>

              {/* Foundation 100 - locked Business annual at $179/mo equiv
                  for the first 100 customers. Only meaningful on annual. */}
              <button
                type="button"
                onClick={() => startCheckout('business', { foundation: true })}
                disabled={checkoutBusyFor !== null}
                className="mt-3 w-full text-left rounded-2xl border border-accent/40 bg-accent-soft/40 p-4 transition-colors hover:border-accent focus:outline-none disabled:opacity-60"
              >
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-charcoal">Foundation 100</p>
                  <span className="text-[10px] bg-accent text-ink-on-accent px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider">First 100 only</span>
                </div>
                <p className="text-lg font-bold text-charcoal mt-1">$179 / month <span className="text-xs font-normal text-muted">locked for life</span></p>
                <p className="text-xs text-muted mt-1">Business plan, 12-month annual commit. Founder Slack + first access to new modules.</p>
                <span className="mt-3 inline-block text-[10px] font-bold uppercase tracking-wider text-accent">
                  {checkoutBusyFor !== null ? 'Redirecting...' : 'Lock in Foundation pricing'}
                </span>
              </button>
            </>
          )}
        </section>
      </div>

      {upgradeModalOpen && (
        <div
          className="fixed inset-0 bg-ink/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setUpgradeModalOpen(false)}
        >
          <div
            className="bg-bg-elevated border border-border rounded-2xl shadow-card max-w-md w-full p-6"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="font-display text-lg font-bold text-charcoal uppercase tracking-wider mb-1">Upgrades coming soon</h3>
            <p className="text-sm text-mid mb-5">
              Self-serve checkout is on its way. In the meantime, email us and we&apos;ll upgrade your plan manually - usually within one business day.
            </p>
            <div className="flex items-center gap-3">
              <a
                href="mailto:support@humanistiqs.com.au?subject=Upgrade%20my%20HQ.ai%20plan"
                className="flex-1 text-center bg-accent hover:bg-accent-hover text-ink-on-accent font-bold px-5 py-2.5 rounded-full transition-colors text-sm"
              >
                Email support
              </a>
              <button
                onClick={() => setUpgradeModalOpen(false)}
                className="text-sm font-bold text-mid hover:text-charcoal transition-colors px-3 py-2.5"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

