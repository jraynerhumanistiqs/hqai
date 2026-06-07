'use client'

// General enquiry form for the public /contact page. Posts to
// /api/contact (Resend). Honest success/error states.

import { useState } from 'react'

export default function ContactForm() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [company, setCompany] = useState('')
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [error, setError] = useState('')

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('sending')
    setError('')
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, company, message }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError((data as { error?: string })?.error || `Something went wrong (HTTP ${res.status}).`)
        setStatus('error')
        return
      }
      setStatus('sent')
    } catch {
      setError('Could not reach the server. Please check your connection and try again.')
      setStatus('error')
    }
  }

  const inputCls =
    'w-full rounded-xl border border-border bg-bg-elevated px-3.5 py-2.5 text-sm text-ink placeholder-ink-muted outline-none transition-colors focus:border-ink'

  if (status === 'sent') {
    return (
      <div className="rounded-3xl border border-border bg-bg-elevated p-8 shadow-card">
        <h2 className="font-display text-xl font-bold tracking-tight text-ink">Thanks - your message is on its way.</h2>
        <p className="mt-3 text-sm leading-relaxed text-ink-soft">
          We read every enquiry and will get back to you, usually within one business day. If it is urgent,
          email us directly at{' '}
          <a href="mailto:jrayner@humanistiqs.com.au" className="font-semibold text-accent hover:underline">
            jrayner@humanistiqs.com.au
          </a>.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} className="rounded-3xl border border-border bg-bg-elevated p-6 shadow-card sm:p-8">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="c-name" className="mb-1.5 block text-xs font-bold text-ink-soft">Your name</label>
          <input id="c-name" required value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="Jane Smith" />
        </div>
        <div>
          <label htmlFor="c-email" className="mb-1.5 block text-xs font-bold text-ink-soft">Work email</label>
          <input id="c-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} placeholder="jane@business.com.au" />
        </div>
      </div>
      <div className="mt-4">
        <label htmlFor="c-company" className="mb-1.5 block text-xs font-bold text-ink-soft">Business name <span className="font-normal text-ink-muted">(optional)</span></label>
        <input id="c-company" value={company} onChange={(e) => setCompany(e.target.value)} className={inputCls} placeholder="Sunrise Pharmacy" />
      </div>
      <div className="mt-4">
        <label htmlFor="c-message" className="mb-1.5 block text-xs font-bold text-ink-soft">How can we help?</label>
        <textarea id="c-message" required rows={5} value={message} onChange={(e) => setMessage(e.target.value)} className={`${inputCls} resize-y`} placeholder="Tell us a little about your business and what you are after." />
      </div>

      {error && (
        <p className="mt-4 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
      )}

      <button
        type="submit"
        disabled={status === 'sending'}
        className="mt-6 inline-flex h-12 items-center justify-center rounded-full bg-accent px-7 text-sm font-semibold text-ink-on-accent transition-colors hover:bg-accent-hover disabled:opacity-60"
      >
        {status === 'sending' ? 'Sending...' : 'Send message'}
      </button>
      <p className="mt-3 text-xs text-ink-muted">
        Prefer email? Reach us at{' '}
        <a href="mailto:jrayner@humanistiqs.com.au" className="font-semibold text-ink hover:underline">jrayner@humanistiqs.com.au</a>.
      </p>
    </form>
  )
}
