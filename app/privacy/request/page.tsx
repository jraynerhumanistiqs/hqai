'use client'
import { useState } from 'react'
import Link from 'next/link'

// Data-subject request landing page. APP 12 (access) and APP 13
// (correction) require us to provide a way for individuals - both
// candidates and business users - to request access to, correction of,
// or deletion of their personal information.
//
// v1 is a structured email form. The form sends a tagged email to
// privacy@humanistiqs.com.au via the support contact endpoint and
// shows the user a reference number they can quote in follow-ups.
// Future v2 will replace this with a magic-link verified self-service
// portal that returns a JSON export and supports erasure inline.

const REQUEST_TYPES: { id: string; label: string; hint: string }[] = [
  { id: 'access', label: 'Access my data', hint: 'See a copy of everything HQ.ai holds about you.' },
  { id: 'correction', label: 'Correct my data', hint: 'Update something we have wrong (name, email, scoring evidence, etc.).' },
  { id: 'erasure', label: 'Delete my data', hint: 'Remove your record and any video / transcript we hold.' },
  { id: 'withdraw_consent', label: 'Withdraw consent', hint: 'I withdraw consent for my video pre-screen to be used.' },
  { id: 'other', label: 'Other privacy question', hint: 'I have a privacy concern that does not fit the above.' },
]

export default function PrivacyRequestPage() {
  const [type, setType] = useState('access')
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [detail, setDetail] = useState('')
  const [busy, setBusy] = useState(false)
  const [submitted, setSubmitted] = useState<{ ref: string } | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    if (!email || !name) {
      setError('Please provide your name and email so we can verify the request.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/privacy/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, name, email, detail }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`)
      setSubmitted({ ref: data.reference })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send request')
    }
    setBusy(false)
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-2xl mx-auto px-6 py-16">
          <Link href="/privacy" className="text-xs font-bold text-mid hover:text-black uppercase tracking-wider">
            &larr; Back to Privacy Policy
          </Link>
          <h1 className="font-display text-3xl font-bold text-charcoal mt-6 mb-4">Request received</h1>
          <p className="text-sm text-mid leading-relaxed mb-4">
            Thanks {name.split(' ')[0]}. We&apos;ve received your privacy request and will respond
            within 30 days as required under the Australian Privacy Principles.
          </p>
          <p className="text-sm text-mid leading-relaxed mb-4">
            Your reference number is <span className="font-mono font-bold text-charcoal">{submitted.ref}</span>.
            Quote this if you need to follow up.
          </p>
          <p className="text-sm text-mid leading-relaxed">
            If you do not receive a reply within 30 days, please email{' '}
            <a className="underline font-bold text-charcoal" href="mailto:privacy@humanistiqs.com.au">privacy@humanistiqs.com.au</a>{' '}
            and we will escalate immediately.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto px-6 py-12 sm:py-16">
        <Link href="/privacy" className="text-xs font-bold text-mid hover:text-black uppercase tracking-wider">
          &larr; Back to Privacy Policy
        </Link>
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-charcoal mt-6 mb-2">
          Privacy request
        </h1>
        <p className="text-sm text-mid mb-8 leading-relaxed">
          Use this form to ask us to access, correct, or delete the personal information
          we hold about you. We respond within 30 days. We may need to verify your
          identity before fulfilling the request.
        </p>

        <div className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-mid uppercase tracking-wider mb-1.5">What do you need?</label>
            <div className="space-y-2">
              {REQUEST_TYPES.map(rt => (
                <label
                  key={rt.id}
                  className={`block border rounded-2xl px-4 py-3 cursor-pointer transition-colors ${type === rt.id ? 'border-black bg-light' : 'border-border hover:bg-light/40'}`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="type"
                      value={rt.id}
                      checked={type === rt.id}
                      onChange={e => setType(e.target.value)}
                      className="mt-1 accent-black"
                    />
                    <div>
                      <p className="text-sm font-bold text-charcoal">{rt.label}</p>
                      <p className="text-xs text-mid mt-0.5">{rt.hint}</p>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-mid uppercase tracking-wider mb-1.5">Your name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Full name"
              className="w-full text-sm bg-white border border-border rounded-lg px-3 py-2 outline-none focus:border-black"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-mid uppercase tracking-wider mb-1.5">Email used with HQ.ai</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full text-sm bg-white border border-border rounded-lg px-3 py-2 outline-none focus:border-black"
            />
            <p className="text-[11px] text-muted mt-1">We use this to find your record and to email our reply. Please use the same address you applied or signed up with.</p>
          </div>
          <div>
            <label className="block text-xs font-bold text-mid uppercase tracking-wider mb-1.5">Anything else? (optional)</label>
            <textarea
              value={detail}
              onChange={e => setDetail(e.target.value)}
              placeholder="If your request is about a specific role or video, include the role name or invitation link to speed things up."
              rows={4}
              className="w-full text-sm bg-white border border-border rounded-lg px-3 py-2 outline-none focus:border-black resize-none"
              maxLength={1000}
            />
          </div>

          {error && <p className="text-xs text-danger bg-danger/10 rounded-lg px-3 py-2">{error}</p>}

          <button
            onClick={submit}
            disabled={busy}
            className="w-full bg-black text-white font-bold py-3 rounded-full hover:bg-charcoal disabled:opacity-50 text-sm transition-colors"
          >
            {busy ? 'Sending...' : 'Send request'}
          </button>
        </div>
      </div>
    </div>
  )
}
