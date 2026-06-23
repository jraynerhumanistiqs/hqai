'use client'

// Inquiry capture form for /enterprise. Posts to /api/enterprise-inquiry
// which writes to enterprise_inquiries and fires founder + inquirer
// transactional emails. No phone number field by design - the founder
// books the discovery call by replying to the confirmation email.

import { useState } from 'react'

type Status = 'idle' | 'submitting' | 'success' | 'error'

interface FormState {
  full_name: string
  work_email: string
  business_name: string
  staff_headcount: string
  variant_interest: 'people' | 'recruit' | 'full' | 'unsure' | ''
  current_spend: string
  urgency: 'this-month' | 'next-month' | 'this-quarter' | 'exploring' | ''
  notes: string
  consent: boolean
  // Multiplier-relevant optional fields (May 2026). Empty = not provided.
  // See docs/research/enterprise-sliding-scale-analysis.md §6.
  entity_count: '' | '1' | '2-3' | '4-5' | '6+'
  annual_hiring_volume: '' | 'under-30' | '30-60' | '60-100' | '100-plus'
}

const INITIAL: FormState = {
  full_name: '',
  work_email: '',
  business_name: '',
  staff_headcount: '',
  variant_interest: '',
  current_spend: '',
  urgency: '',
  notes: '',
  consent: false,
  entity_count: '',
  annual_hiring_volume: '',
}

export default function EnterpriseInquiryForm() {
  const [state, setState] = useState<FormState>(INITIAL)
  const [status, setStatus] = useState<Status>('idle')
  const [errorMsg, setErrorMsg] = useState<string>('')

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setState((s) => ({ ...s, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setStatus('submitting')
    setErrorMsg('')
    try {
      const res = await fetch('/api/enterprise-inquiry', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(state),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setStatus('error')
        setErrorMsg(typeof json?.error === 'string' ? json.error : 'Something went wrong. Try again in a moment.')
        return
      }
      setStatus('success')
    } catch {
      setStatus('error')
      setErrorMsg('Network error. Please try again.')
    }
  }

  if (status === 'success') {
    return (
      <div
        role="status"
        className="rounded-3xl border border-accent bg-bg-elevated p-8 text-center shadow-card"
      >
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-accent">Received</p>
        <h3 className="mt-3 font-display text-2xl font-bold tracking-tight text-ink">
          Thanks - Jimmy will be in touch within 48 hours.
        </h3>
        <p className="mt-3 text-sm text-ink-soft">
          A confirmation has gone to your inbox. If you don&apos;t see it within five minutes, check spam or
          reply to <span className="font-medium text-ink">jrayner@humanistiqs.com.au</span> directly.
        </p>
      </div>
    )
  }

  const fieldCls =
    'h-11 w-full rounded-xl border border-border bg-bg-elevated px-4 text-sm text-ink placeholder:text-ink-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20'
  const selectCls = fieldCls + ' appearance-none pr-10'
  const labelCls = 'text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted'

  return (
    <form onSubmit={handleSubmit} noValidate className="rounded-3xl border border-border bg-bg-elevated p-6 shadow-card md:p-8">
      <div className="grid gap-5 md:grid-cols-2">
        <label className="flex flex-col gap-2">
          <span className={labelCls}>Your name</span>
          <input
            required
            type="text"
            autoComplete="name"
            value={state.full_name}
            onChange={(e) => update('full_name', e.target.value)}
            className={fieldCls}
            placeholder="Sam Citizen"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className={labelCls}>Work email</span>
          <input
            required
            type="email"
            autoComplete="email"
            value={state.work_email}
            onChange={(e) => update('work_email', e.target.value)}
            className={fieldCls}
            placeholder="you@yourbusiness.com.au"
          />
        </label>

        <label className="flex flex-col gap-2 md:col-span-2">
          <span className={labelCls}>Business name</span>
          <input
            required
            type="text"
            autoComplete="organization"
            value={state.business_name}
            onChange={(e) => update('business_name', e.target.value)}
            className={fieldCls}
            placeholder="Your Pty Ltd"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className={labelCls}>Staff headcount</span>
          <select
            required
            value={state.staff_headcount}
            onChange={(e) => update('staff_headcount', e.target.value)}
            className={selectCls}
          >
            <option value="" disabled>Select a band</option>
            <option value="Under 30">Under 30</option>
            <option value="30-50">30-50</option>
            <option value="50-150">50-150</option>
            <option value="150+">150+</option>
          </select>
        </label>

        <label className="flex flex-col gap-2">
          <span className={labelCls}>Which variant interests you?</span>
          <select
            required
            value={state.variant_interest}
            onChange={(e) => update('variant_interest', e.target.value as FormState['variant_interest'])}
            className={selectCls}
          >
            <option value="" disabled>Choose one</option>
            <option value="people">HQ People Enterprise</option>
            <option value="recruit">HQ Recruit Enterprise</option>
            <option value="full">Full Enterprise</option>
            <option value="unsure">Not sure - want to talk it through</option>
          </select>
        </label>

        <label className="flex flex-col gap-2 md:col-span-2">
          <span className={labelCls}>Current spend on HR and recruitment, ballpark</span>
          <input
            type="text"
            value={state.current_spend}
            onChange={(e) => update('current_spend', e.target.value)}
            className={fieldCls}
            placeholder="e.g. an HR retainer at $850/mo + occasional agency"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className={labelCls}>When do you need this in place?</span>
          <select
            required
            value={state.urgency}
            onChange={(e) => update('urgency', e.target.value as FormState['urgency'])}
            className={selectCls}
          >
            <option value="" disabled>Choose one</option>
            <option value="this-month">This month</option>
            <option value="next-month">Next month</option>
            <option value="this-quarter">This quarter</option>
            <option value="exploring">Just exploring</option>
          </select>
        </label>

        {/* Optional multiplier-relevant fields. Sourced from the published
            schedule in lib/pricing-config.ts (PRICING.enterprise.enterpriseMultipliers).
            Capturing these pre-call lets the founder quote the effective
            price on the discovery call, not after. */}
        <div className="md:col-span-2 mt-2 rounded-2xl border border-border bg-bg-soft p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-muted">
            Optional - helps us quote your exact price before the call
          </p>
          <div className="mt-4 grid gap-5 md:grid-cols-2">
            <label className="flex flex-col gap-2">
              <span className={labelCls}>How many entities does the business operate as?</span>
              <select
                value={state.entity_count}
                onChange={(e) => update('entity_count', e.target.value as FormState['entity_count'])}
                className={selectCls}
              >
                <option value="">Not specified</option>
                <option value="1">1 (single entity)</option>
                <option value="2-3">2-3 entities</option>
                <option value="4-5">4-5 entities</option>
                <option value="6+">6+ entities</option>
              </select>
            </label>

            {(state.variant_interest === 'recruit' ||
              state.variant_interest === 'full' ||
              state.variant_interest === 'unsure') && (
              <label className="flex flex-col gap-2">
                <span className={labelCls}>Annual hiring volume estimate</span>
                <select
                  value={state.annual_hiring_volume}
                  onChange={(e) =>
                    update('annual_hiring_volume', e.target.value as FormState['annual_hiring_volume'])
                  }
                  className={selectCls}
                >
                  <option value="">Not specified</option>
                  <option value="under-30">Under 30 roles</option>
                  <option value="30-60">30-60 roles</option>
                  <option value="60-100">60-100 roles</option>
                  <option value="100-plus">100+ roles</option>
                </select>
              </label>
            )}
          </div>
        </div>

        <label className="flex flex-col gap-2 md:col-span-2">
          <span className={labelCls}>Anything else?</span>
          <textarea
            value={state.notes}
            onChange={(e) => update('notes', e.target.value)}
            rows={4}
            className="w-full rounded-xl border border-border bg-bg-elevated px-4 py-3 text-sm text-ink placeholder:text-ink-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
            placeholder="Anything about your situation that would make the discovery call more useful"
          />
        </label>

        <label className="flex items-start gap-3 md:col-span-2">
          <input
            required
            type="checkbox"
            checked={state.consent}
            onChange={(e) => update('consent', e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-border text-accent focus:ring-accent"
          />
          <span className="text-sm leading-relaxed text-ink-soft">
            I agree to be contacted by Humanistiqs about HQ.ai Enterprise.
          </span>
        </label>
      </div>

      {status === 'error' && errorMsg && (
        <p role="alert" className="mt-5 rounded-xl border border-danger bg-danger/5 px-4 py-3 text-sm text-danger">
          {errorMsg}
        </p>
      )}

      <div className="mt-6 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="submit"
          disabled={status === 'submitting'}
          className="inline-flex h-12 items-center justify-center rounded-full bg-clay px-7 text-sm font-semibold text-white shadow-card transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {status === 'submitting' ? 'Sending...' : 'Send to Jimmy ->'}
        </button>
        <p className="text-[11px] leading-relaxed text-ink-muted">
          We use this only to contact you about Enterprise. No marketing emails.
        </p>
      </div>
    </form>
  )
}
