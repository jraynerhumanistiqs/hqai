'use client'

// Client-side landing-page form. Collects the inputs a Letter of Offer
// needs, posts to /api/stripe/one-off with the offer id + inputs +
// email, redirects the browser to Stripe Checkout.
//
// Form design choices:
//   - Single-column form, every field labelled, no inline help.
//     If the publican-test fails on a label, the label is wrong.
//   - Required-ness drawn from the typical Fair Work Letter of Offer
//     minimums: candidate name, employer name, role title, start
//     date, employment type, pay rate, hours, location, award.
//   - Email is captured separately above the form (it's the delivery
//     handle, not a field on the letter itself).

import { useState } from 'react'
import Link from 'next/link'

interface FormState {
  candidate_name: string
  candidate_address: string
  employer_name: string
  employer_abn: string
  role_title: string
  start_date: string
  employment_type: 'full_time' | 'part_time' | 'casual' | 'fixed_term'
  hours_per_week: string
  pay_rate: string
  pay_unit: 'annual' | 'hourly'
  award: string
  state: 'QLD' | 'NSW' | 'VIC' | 'SA' | 'WA' | 'TAS' | 'ACT' | 'NT'
  location: string
  notes: string
}

const STATE_OPTIONS: FormState['state'][] = ['QLD', 'NSW', 'VIC', 'SA', 'WA', 'TAS', 'ACT', 'NT']

const inputCls = 'w-full bg-bg-elevated border border-border rounded-md px-3 py-2.5 text-small text-ink placeholder-ink-muted focus:outline-none focus:border-ink transition-colors'
const labelCls = 'block text-xs font-bold uppercase tracking-wider text-ink-soft mb-1.5'

export default function OfferLandingClient() {
  const [email, setEmail] = useState('')
  const [form, setForm] = useState<FormState>({
    candidate_name: '',
    candidate_address: '',
    employer_name: '',
    employer_abn: '',
    role_title: '',
    start_date: '',
    employment_type: 'full_time',
    hours_per_week: '',
    pay_rate: '',
    pay_unit: 'annual',
    award: '',
    state: 'QLD',
    location: '',
    notes: '',
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Please enter a valid email so we can send your Letter.')
      return
    }
    if (!form.candidate_name.trim() || !form.employer_name.trim() || !form.role_title.trim() || !form.start_date.trim()) {
      setError('Candidate name, employer name, role title and start date are required.')
      return
    }
    setBusy(true)
    try {
      const res = await fetch('/api/stripe/one-off', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          offerId: 'letter_of_offer',
          email: email.trim(),
          inputs: form,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.url) {
        throw new Error(data?.error || data?.detail || `Could not start checkout (HTTP ${res.status}).`)
      }
      window.location.href = data.url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start checkout. Please try again.')
      setBusy(false)
    }
  }

  return (
    <main className="min-h-screen bg-bg text-ink">
      {/* Top bar - light, no sidebar */}
      <header className="border-b border-border">
        <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
          <Link href="/" className="font-display text-lg font-bold text-ink hover:text-accent">
            HQ.ai
          </Link>
          <Link href="/login" className="text-xs font-bold text-ink-soft hover:text-ink">
            Already have an account? Sign in
          </Link>
        </div>
      </header>

      <section className="max-w-5xl mx-auto px-6 pt-14 pb-10 grid lg:grid-cols-[1.1fr_1fr] gap-12 items-start">
        {/* Left: copy */}
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-accent mb-3">
            One letter. No signup. $25.
          </p>
          <h1 className="font-display text-display sm:text-[64px] font-bold leading-[1.05] text-ink mb-5">
            I'll draft a Fair Work compliant Letter of Offer for your new hire.
          </h1>
          <p className="text-body text-ink-soft mb-3 max-w-xl">
            Fill the form. Pay $25. I'll email you a Word doc and a PDF
            in around three minutes. Every clause references the Fair
            Work Act, the National Employment Standards, or the
            relevant Modern Award.
          </p>
          <p className="text-body text-ink-soft mb-8 max-w-xl">
            One letter, one fee. No subscription. No consultant on the
            other end of an email chain. Built for the publican, the
            tradie and the retailer who needs to hire someone this
            week.
          </p>

          <ul className="space-y-3 mb-10 max-w-xl">
            {[
              {
                t: 'Cited to Fair Work',
                d: 'The Act, the NES, and the right Modern Award - listed as footnotes on the letter itself.',
              },
              {
                t: 'Three minutes, end to end',
                d: 'Form fills, payment, email. No back and forth.',
              },
              {
                t: 'Word + PDF + shareable link',
                d: 'Edit in Word, send in PDF, or share a link the candidate can view in their browser.',
              },
              {
                t: 'No signup, no subscription',
                d: 'One job, one fee. If you want more, the subscription is right there - but you do not need it for this.',
              },
            ].map(item => (
              <li key={item.t} className="flex items-start gap-3">
                <span aria-hidden className="mt-1.5 w-2 h-2 rounded-full bg-accent flex-shrink-0" />
                <div>
                  <p className="text-small font-bold text-ink">{item.t}</p>
                  <p className="text-small text-ink-soft">{item.d}</p>
                </div>
              </li>
            ))}
          </ul>

          <p className="text-xs text-ink-muted max-w-md">
            Australian employment law only. Fair Work Act 2009 (Cth),
            the NES, and the current Modern Awards. Not legal advice -
            if your situation is complex, talk to an advisor.
          </p>
        </div>

        {/* Right: form card */}
        <form onSubmit={submit} className="bg-bg-elevated border border-border rounded-panel p-6 shadow-card">
          <h2 className="font-display text-h2 font-bold text-ink mb-1">
            Tell me about the role
          </h2>
          <p className="text-small text-ink-soft mb-5">
            I will use these details verbatim. Add notes at the bottom
            if there is something unusual.
          </p>

          <div className="space-y-3">
            <div>
              <label className={labelCls} htmlFor="email">Your email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@yourbusiness.com.au"
                required
                className={inputCls}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelCls} htmlFor="candidate_name">Candidate full name</label>
                <input id="candidate_name" value={form.candidate_name} onChange={e => set('candidate_name', e.target.value)} required className={inputCls} />
              </div>
              <div>
                <label className={labelCls} htmlFor="role_title">Role title</label>
                <input id="role_title" value={form.role_title} onChange={e => set('role_title', e.target.value)} required placeholder="Bar Attendant Grade 2" className={inputCls} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelCls} htmlFor="employer_name">Employer (business) name</label>
                <input id="employer_name" value={form.employer_name} onChange={e => set('employer_name', e.target.value)} required className={inputCls} />
              </div>
              <div>
                <label className={labelCls} htmlFor="employer_abn">ABN</label>
                <input id="employer_abn" value={form.employer_abn} onChange={e => set('employer_abn', e.target.value)} placeholder="11 222 333 444" className={inputCls} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelCls} htmlFor="start_date">Start date</label>
                <input id="start_date" type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)} required className={inputCls} />
              </div>
              <div>
                <label className={labelCls} htmlFor="employment_type">Employment type</label>
                <select id="employment_type" value={form.employment_type} onChange={e => set('employment_type', e.target.value as FormState['employment_type'])} className={inputCls}>
                  <option value="full_time">Full time</option>
                  <option value="part_time">Part time</option>
                  <option value="casual">Casual</option>
                  <option value="fixed_term">Fixed term</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelCls} htmlFor="hours_per_week">Hours per week</label>
                <input id="hours_per_week" value={form.hours_per_week} onChange={e => set('hours_per_week', e.target.value)} placeholder="38" className={inputCls} />
              </div>
              <div>
                <label className={labelCls} htmlFor="award">Award (or "Award free")</label>
                <input id="award" value={form.award} onChange={e => set('award', e.target.value)} placeholder="Hospitality Industry (General) Award" className={inputCls} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-[1fr_120px] gap-3">
              <div>
                <label className={labelCls} htmlFor="pay_rate">Pay rate</label>
                <input id="pay_rate" value={form.pay_rate} onChange={e => set('pay_rate', e.target.value)} placeholder="65000 or 28.50" className={inputCls} />
              </div>
              <div>
                <label className={labelCls} htmlFor="pay_unit">Unit</label>
                <select id="pay_unit" value={form.pay_unit} onChange={e => set('pay_unit', e.target.value as FormState['pay_unit'])} className={inputCls}>
                  <option value="annual">/ year</option>
                  <option value="hourly">/ hour</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-[120px_1fr] gap-3">
              <div>
                <label className={labelCls} htmlFor="state">State</label>
                <select id="state" value={form.state} onChange={e => set('state', e.target.value as FormState['state'])} className={inputCls}>
                  {STATE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls} htmlFor="location">Work location</label>
                <input id="location" value={form.location} onChange={e => set('location', e.target.value)} placeholder="Brisbane CBD" className={inputCls} />
              </div>
            </div>

            <div>
              <label className={labelCls} htmlFor="candidate_address">Candidate address (optional)</label>
              <input id="candidate_address" value={form.candidate_address} onChange={e => set('candidate_address', e.target.value)} placeholder="Used in the letter heading" className={inputCls} />
            </div>

            <div>
              <label className={labelCls} htmlFor="notes">Anything unusual?</label>
              <textarea id="notes" value={form.notes} onChange={e => set('notes', e.target.value)} rows={3} placeholder="Probation, sign-on bonus, salary sacrifice, anything that is not standard." className={inputCls} />
            </div>

            {error && (
              <p role="alert" className="text-xs text-danger">{error}</p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full min-h-touch bg-accent hover:bg-accent-hover text-ink-on-accent font-bold rounded-full text-small px-5 py-3 transition-colors disabled:opacity-60"
            >
              {busy ? 'Redirecting to Stripe...' : 'Pay $25 and email me the letter'}
            </button>

            <p className="text-xs text-ink-muted text-center">
              Secure checkout via Stripe. We do not store your card.
              Refunded if the letter does not arrive within 30 minutes.
            </p>
          </div>
        </form>
      </section>

      <section className="border-t border-border bg-bg-soft">
        <div className="max-w-5xl mx-auto px-6 py-12 grid sm:grid-cols-3 gap-8">
          <div>
            <p className="font-display text-h3 font-bold text-ink mb-2">Why $25?</p>
            <p className="text-small text-ink-soft">
              That is what a single document costs to run through our
              pipeline plus the Stripe fee. Subscriptions get cheaper
              per letter, but for one hire, this is the fair price.
            </p>
          </div>
          <div>
            <p className="font-display text-h3 font-bold text-ink mb-2">Why no signup?</p>
            <p className="text-small text-ink-soft">
              You should not have to create an account to buy a Word
              doc. If the letter is good and you want more, sign up
              from there - the link is in the email.
            </p>
          </div>
          <div>
            <p className="font-display text-h3 font-bold text-ink mb-2">Need it tonight?</p>
            <p className="text-small text-ink-soft">
              The pipeline runs in around three minutes. If something
              hangs we will refund automatically. Need help?{' '}
              <a href="mailto:support@humanistiqs.com.au" className="text-accent underline-offset-4 hover:underline">
                Email support
              </a>.
            </p>
          </div>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="max-w-5xl mx-auto px-6 py-6 flex flex-wrap items-center justify-between gap-3 text-xs text-ink-muted">
          <span>HQ.ai - operated by Rayner Consulting Group Pty Ltd</span>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="hover:text-ink">Privacy</Link>
            <Link href="/terms" className="hover:text-ink">Terms</Link>
          </div>
        </div>
      </footer>
    </main>
  )
}
