'use client'

// Inquiry capture form for /enterprise. Posts to /api/enterprise-inquiry
// which writes to enterprise_inquiries and fires founder + inquirer
// transactional emails. No phone number field by design - the founder
// books the discovery call by replying to the confirmation email.

import { useId, useRef, useState } from 'react'

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

// Client-side validation. The form carries `noValidate` so that errors are
// reported in our own styling rather than as browser bubbles - which means
// the `required` attributes below are NOT enforced by the browser and this
// is the only thing standing between a blank form and a POST.
//
// These rules mirror app/api/enterprise-inquiry/route.ts (its EMAIL_RE,
// STAFF_BUCKETS, VARIANT_VALUES, URGENCY_VALUES and the order of its checks)
// so the client never accepts something the server will reject, and never
// rejects something the server would accept. Change them together.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const STAFF_BUCKETS = ['Under 30', '30-50', '50-150', '150+']
const VARIANT_VALUES = ['people', 'recruit', 'full', 'unsure']
const URGENCY_VALUES = ['this-month', 'next-month', 'this-quarter', 'exploring']

// Required fields in the order they appear in the form, which is also the
// order the server checks them. The first entry with an error takes focus.
type RequiredField =
  | 'full_name'
  | 'work_email'
  | 'business_name'
  | 'staff_headcount'
  | 'variant_interest'
  | 'urgency'
  | 'consent'

const REQUIRED_ORDER: RequiredField[] = [
  'full_name',
  'work_email',
  'business_name',
  'staff_headcount',
  'variant_interest',
  'urgency',
  'consent',
]

type FieldErrors = Partial<Record<RequiredField, string>>

function validate(s: FormState): FieldErrors {
  const e: FieldErrors = {}
  if (!s.full_name.trim()) e.full_name = 'Your name is required.'
  const email = s.work_email.trim().toLowerCase()
  if (!email) e.work_email = 'A work email is required.'
  else if (!EMAIL_RE.test(email)) e.work_email = 'Enter a valid work email, like you@yourbusiness.com.au.'
  if (!s.business_name.trim()) e.business_name = 'Business name is required.'
  if (!STAFF_BUCKETS.includes(s.staff_headcount.trim())) e.staff_headcount = 'Select a staff headcount band.'
  if (!VARIANT_VALUES.includes(s.variant_interest)) e.variant_interest = 'Select which plan interests you.'
  if (!URGENCY_VALUES.includes(s.urgency)) e.urgency = 'Tell us when you need this in place.'
  if (!s.consent) e.consent = 'Please confirm you agree to be contacted.'
  return e
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
  const [errors, setErrors] = useState<FieldErrors>({})
  const uid = useId()
  const fieldRefs = useRef<Partial<Record<RequiredField, HTMLElement | null>>>({})

  // One stable id per field error, so aria-describedby can point at it.
  const errId = (f: RequiredField) => `${uid}-${f}-error`

  // Wire a required control up to its error message. Focusing the control
  // then announces the label and the error together, which is what makes
  // the error identifiable to a screen reader (WCAG 3.3.1).
  const errorProps = (f: RequiredField) =>
    errors[f]
      ? { 'aria-invalid': true as const, 'aria-describedby': errId(f) }
      : {}

  // Swap the resting border for the danger token while a field is in error.
  const withError = (base: string, f: RequiredField) =>
    errors[f] ? `${base.replace('border-border', 'border-danger')}` : base

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setState((s) => ({ ...s, [key]: value }))
    // Clear this field's error as soon as the user edits it - re-validated
    // on the next submit.
    setErrors((prev) => {
      if (!(key in prev)) return prev
      const next = { ...prev }
      delete next[key as RequiredField]
      return next
    })
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    const found = validate(state)
    setErrors(found)
    if (Object.keys(found).length > 0) {
      // Nothing is sent, and focus goes to the first field that needs work.
      setStatus('idle')
      setErrorMsg('')
      const first = REQUIRED_ORDER.find((f) => found[f])
      if (first) fieldRefs.current[first]?.focus()
      return
    }

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
          Thanks - our HQ.ai team will be in touch within 48 hours.
        </h3>
        <p className="mt-3 text-sm text-ink-soft">
          A confirmation has gone to your inbox. If you don&apos;t see it within five minutes, check spam or
          reply to <span className="font-medium text-ink">hq.ai@humanistiqs.com.au</span> directly.
        </p>
      </div>
    )
  }

  const fieldCls =
    'h-11 w-full rounded-xl border border-border bg-bg-elevated px-4 text-sm text-ink placeholder:text-ink-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20'
  const selectCls = fieldCls + ' appearance-none pr-10'
  const labelCls = 'text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted'

  // The per-field message aria-describedby points at.
  const renderError = (f: RequiredField) =>
    errors[f] ? (
      <span id={errId(f)} className="text-xs font-medium leading-relaxed text-danger">
        {errors[f]}
      </span>
    ) : null

  return (
    // `noValidate` is deliberate, and this is the second time it has been
    // reasoned about - read before removing it again.
    //
    // The underlying bug was real: seven fields were marked `required`,
    // `noValidate` switched that enforcement off, and nothing replaced it,
    // so a blank form POSTed. Two fixes were written independently. The
    // other dropped `noValidate` and let native validation take over; this
    // one kept it and added validate() above. They cannot both run - native
    // fires first and blocks the submit handler, so the styled messages,
    // aria-invalid/aria-describedby wiring and focus handling below would
    // never execute. One had to win.
    //
    // Native loses on two counts. It only knows `required` and
    // type="email", so it cannot enforce what the server actually checks -
    // STAFF_BUCKETS / VARIANT_VALUES / URGENCY_VALUES membership, and an
    // EMAIL_RE stricter than the browser's - which leaves a client that
    // happily submits payloads the server answers with a 400. And its
    // message is a browser-drawn bubble: unstyleable, gone on blur, with no
    // aria-invalid or aria-describedby behind it. validate() does
    // everything native does (blocks, identifies the field, moves focus)
    // and closes both gaps.
    //
    // Everything else from the native fix was kept: the `name` attributes,
    // inputMode/spellCheck on the email field, and text-ink-on-clay on the
    // submit button.
    <form onSubmit={handleSubmit} noValidate className="rounded-3xl border border-border bg-bg-elevated p-6 shadow-card md:p-8">
      <div className="grid gap-5 md:grid-cols-2">
        <label className="flex flex-col gap-2">
          <span className={labelCls}>Your name</span>
          <input
            required
            name="full_name"
            type="text"
            autoComplete="name"
            ref={(el) => { fieldRefs.current.full_name = el }}
            value={state.full_name}
            onChange={(e) => update('full_name', e.target.value)}
            className={withError(fieldCls, 'full_name')}
            placeholder="Sam Citizen"
            {...errorProps('full_name')}
          />
          {renderError('full_name')}
        </label>

        <label className="flex flex-col gap-2">
          <span className={labelCls}>Work email</span>
          <input
            required
            name="work_email"
            type="email"
            inputMode="email"
            autoComplete="email"
            ref={(el) => { fieldRefs.current.work_email = el }}
            spellCheck={false}
            value={state.work_email}
            onChange={(e) => update('work_email', e.target.value)}
            className={withError(fieldCls, 'work_email')}
            placeholder="you@yourbusiness.com.au"
            {...errorProps('work_email')}
          />
          {renderError('work_email')}
        </label>

        <label className="flex flex-col gap-2 md:col-span-2">
          <span className={labelCls}>Business name</span>
          <input
            required
            name="business_name"
            type="text"
            autoComplete="organization"
            ref={(el) => { fieldRefs.current.business_name = el }}
            value={state.business_name}
            onChange={(e) => update('business_name', e.target.value)}
            className={withError(fieldCls, 'business_name')}
            placeholder="Your Pty Ltd"
            {...errorProps('business_name')}
          />
          {renderError('business_name')}
        </label>

        <label className="flex flex-col gap-2">
          <span className={labelCls}>Staff headcount</span>
          <select
            required
            ref={(el) => { fieldRefs.current.staff_headcount = el }}
            name="staff_headcount"
            value={state.staff_headcount}
            onChange={(e) => update('staff_headcount', e.target.value)}
            className={withError(selectCls, 'staff_headcount')}
            {...errorProps('staff_headcount')}
          >
            <option value="" disabled>Select a band</option>
            <option value="Under 30">Under 30</option>
            <option value="30-50">30-50</option>
            <option value="50-150">50-150</option>
            <option value="150+">150+</option>
          </select>
          {renderError('staff_headcount')}
        </label>

        <label className="flex flex-col gap-2">
          <span className={labelCls}>Which plan interests you?</span>
          <select
            required
            ref={(el) => { fieldRefs.current.variant_interest = el }}
            name="variant_interest"
            value={state.variant_interest}
            onChange={(e) => update('variant_interest', e.target.value as FormState['variant_interest'])}
            className={withError(selectCls, 'variant_interest')}
            {...errorProps('variant_interest')}
          >
            <option value="" disabled>Choose one</option>
            <option value="people">HR365 - dedicated HR advisor</option>
            <option value="recruit">Recruit365 - dedicated talent advisor</option>
            <option value="full">HR365 + Recruit365 - both</option>
            <option value="unsure">Not sure - want to talk it through</option>
          </select>
          {renderError('variant_interest')}
        </label>

        <label className="flex flex-col gap-2 md:col-span-2">
          <span className={labelCls}>Current spend on HR and recruitment, ballpark</span>
          <input
            name="current_spend"
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
            ref={(el) => { fieldRefs.current.urgency = el }}
            name="urgency"
            value={state.urgency}
            onChange={(e) => update('urgency', e.target.value as FormState['urgency'])}
            className={withError(selectCls, 'urgency')}
            {...errorProps('urgency')}
          >
            <option value="" disabled>Choose one</option>
            <option value="this-month">This month</option>
            <option value="next-month">Next month</option>
            <option value="this-quarter">This quarter</option>
            <option value="exploring">Just exploring</option>
          </select>
          {renderError('urgency')}
        </label>

        {/* Optional multiplier-relevant fields. Sourced from the published
            schedule in lib/pricing-config.ts (PRICING.enterprise.enterpriseMultipliers).
            Capturing these pre-call lets the founder quote the effective
            price on the discovery call, not after. */}
        <div className="md:col-span-2 mt-2 rounded-2xl border border-border bg-bg-elevated p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-muted">
            Optional - helps us quote your exact price before the call
          </p>
          <div className="mt-4 grid gap-5 md:grid-cols-2">
            <label className="flex flex-col gap-2">
              <span className={labelCls}>How many entities does the business operate as?</span>
              <select
                name="entity_count"
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
                  name="annual_hiring_volume"
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
            name="notes"
            value={state.notes}
            onChange={(e) => update('notes', e.target.value)}
            rows={4}
            className="w-full rounded-xl border border-border bg-bg-elevated px-4 py-3 text-sm text-ink placeholder:text-ink-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
            placeholder="Anything about your situation that would make the discovery call more useful"
          />
        </label>

        {/* Wrapped in a div so the error message can sit under the row
            without joining the label's flex layout. */}
        <div className="md:col-span-2">
          <label className="flex items-start gap-3">
            <input
              required
              name="consent"
              type="checkbox"
              ref={(el) => { fieldRefs.current.consent = el }}
              checked={state.consent}
              onChange={(e) => update('consent', e.target.checked)}
              className={withError(
                'mt-1 h-4 w-4 rounded border-border text-accent focus:ring-accent',
                'consent',
              )}
              {...errorProps('consent')}
            />
            <span className="text-sm leading-relaxed text-ink-soft">
              I agree to be contacted by Humanistiqs about HR365 and Recruit365.
            </span>
          </label>
          {errors.consent && <p className="mt-2">{renderError('consent')}</p>}
        </div>
      </div>

      {/* Client validation summary. Focus has already moved to the first
          field that needs work; this makes the same thing visible to a
          sighted user who may not notice the focus move. */}
      {Object.keys(errors).length > 0 && (
        <p role="alert" className="mt-5 rounded-xl border border-danger bg-danger/5 px-4 py-3 text-sm text-danger">
          {Object.keys(errors).length === 1
            ? 'One field needs your attention before we can send this.'
            : `${Object.keys(errors).length} fields need your attention before we can send this.`}
        </p>
      )}

      {status === 'error' && errorMsg && (
        <p role="alert" className="mt-5 rounded-xl border border-danger bg-danger/5 px-4 py-3 text-sm text-danger">
          {errorMsg}
        </p>
      )}

      <div className="mt-6 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="submit"
          disabled={status === 'submitting'}
          className="inline-flex h-12 items-center justify-center rounded-full bg-clay px-7 text-sm font-semibold text-ink-on-clay shadow-card transition-colors hover:bg-clay-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay disabled:cursor-not-allowed disabled:opacity-60"
        >
          {status === 'submitting' ? 'Sending...' : 'Send to our team ->'}
        </button>
        <p className="text-[11px] leading-relaxed text-ink-muted">
          We use this only to contact you about HR365 and Recruit365. No marketing emails.
        </p>
      </div>
    </form>
  )
}
