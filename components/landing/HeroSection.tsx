'use client'

// Section 1: hero. Treatment A (compliance-fear lead) from
// docs/research/landing-page-research-brief.md section 1.
//
// Left column: eyebrow + Fraunces headline + Inter subhead + twin CTAs.
// Right column: interactive Fair Work chat preview that cycles three
// pre-canned Q&A pairs every 6s, pauses on hover. No API call - answers
// are hardcoded. Honours prefers-reduced-motion (no auto-cycle).

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'

interface QA {
  q: string
  a: string
  cite: string
}

const QAS: QA[] = [
  {
    q: 'Can I fire someone in probation?',
    a: 'Yes - during a minimum employment period (6 months, or 12 months for businesses with fewer than 15 employees) an employee cannot bring an unfair dismissal claim. You still need to give the notice in their contract or the NES, and you cannot dismiss for a protected reason like a workers comp claim.',
    cite: 's 383 Fair Work Act 2009',
  },
  {
    q: "What's the notice period for a casual?",
    a: 'A true casual employed on an irregular, as-needed basis is not entitled to notice of termination under the NES. If the casual has become a regular and systematic employee, the contract or the relevant Modern Award may require notice - check the award before ending the engagement.',
    cite: 's 123 Fair Work Act 2009',
  },
  {
    q: 'Do I have to approve a flexible-work request?',
    a: "You must consider the request and can only refuse on reasonable business grounds. You have 21 days to respond in writing. If you refuse, the response has to set out the grounds and discuss alternatives you've considered.",
    cite: 's 65 Fair Work Act 2009',
  },
]

export default function HeroSection() {
  const [active, setActive] = useState(0)
  const [expanded, setExpanded] = useState(false)
  const pausedRef = useRef(false)
  const reducedRef = useRef(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    reducedRef.current = mq.matches
    const onChange = () => { reducedRef.current = mq.matches }
    mq.addEventListener?.('change', onChange)
    return () => mq.removeEventListener?.('change', onChange)
  }, [])

  useEffect(() => {
    // Gate reduced-motion INSIDE the tick rather than at scheduling.
    // The reducedRef.current read at schedule time races the
    // matchMedia useEffect above - it may run first or second
    // depending on commit order. Checking inside the tick removes the
    // race entirely, and also honours a user who toggles their
    // system preference mid-session without a reload.
    const id = window.setInterval(() => {
      if (reducedRef.current) return
      if (pausedRef.current) return
      setActive((a) => (a + 1) % QAS.length)
      setExpanded(true)
    }, 6000)
    // Expand the first answer after a beat so the panel doesn't look
    // empty on first paint. Honour reduced-motion here too.
    const initial = window.setTimeout(() => {
      if (reducedRef.current) return
      setExpanded(true)
    }, 600)
    return () => {
      window.clearInterval(id)
      window.clearTimeout(initial)
    }
  }, [])

  const current = QAS[active]

  return (
    <section className="relative isolate overflow-hidden" aria-labelledby="hero-heading">
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 pb-20 pt-16 md:grid-cols-2 md:gap-16 md:px-10 md:pb-28 md:pt-24 lg:gap-20">
        {/* Left: copy block */}
        <div className="max-w-xl">
          <p className="mb-6 text-xs font-medium uppercase tracking-[0.18em] text-ink-muted">
            For Australian businesses under 250 staff
          </p>
          <h1
            id="hero-heading"
            className="font-serif text-[40px] leading-[1.05] tracking-tight text-ink sm:text-5xl md:text-[56px]"
          >
            Fair Work is complicated. Your HR doesn&apos;t have to be.
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-ink-soft md:text-xl">
            The AI HR advisor built on the Fair Work Act, the NES, and your Modern Award. Cites every answer. Hands off to a human when it matters.
          </p>

          <div className="mt-9 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-4">
            <Link
              href="/signup"
              className="inline-flex h-12 items-center justify-center rounded-full bg-accent px-7 text-sm font-semibold text-ink-on-accent shadow-card transition-colors hover:bg-accent-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              Start the 14-day trial
            </Link>
            <a
              href="#marketplace"
              className="inline-flex h-12 items-center justify-center rounded-full border border-accent bg-transparent px-6 text-sm font-medium text-accent transition-colors hover:bg-accent-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              Or grab one document from $25 -&gt;
            </a>
          </div>
          <p className="mt-4 text-sm text-ink-muted">No card needed. Three minutes to first document.</p>
        </div>

        {/* Right: animated chat preview */}
        <div
          className="relative w-full max-w-xl justify-self-stretch"
          onMouseEnter={() => { pausedRef.current = true }}
          onMouseLeave={() => { pausedRef.current = false }}
        >
          <div
            className="rounded-3xl border border-border bg-bg-elevated p-5 shadow-float md:p-7"
            role="group"
            aria-label="Live preview - AI advisor"
          >
            <div className="flex items-center gap-2 border-b border-border pb-4">
              <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-accent" />
              <span className="text-xs font-medium uppercase tracking-[0.16em] text-ink-muted">HQ People - Fair Work advisor</span>
            </div>

            <div className="mt-5 flex flex-col gap-3">
              {QAS.map((qa, i) => (
                <button
                  key={qa.q}
                  type="button"
                  onClick={() => { setActive(i); setExpanded(true); pausedRef.current = true }}
                  className={[
                    'group w-full rounded-2xl border px-4 py-3 text-left text-sm transition-colors',
                    i === active
                      ? 'border-accent bg-accent-soft text-ink'
                      : 'border-border bg-bg text-ink-soft hover:border-border-strong hover:text-ink',
                  ].join(' ')}
                  aria-pressed={i === active}
                >
                  {qa.q}
                </button>
              ))}
            </div>

            <div
              className={[
                'mt-5 overflow-hidden rounded-2xl bg-bg p-4 transition-[max-height,opacity] duration-500 ease-out',
                expanded ? 'max-h-[480px] opacity-100' : 'max-h-0 opacity-0',
              ].join(' ')}
              aria-live="polite"
              aria-atomic="true"
            >
              <p className="text-sm leading-relaxed text-ink">
                {current.a}
              </p>
              <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-accent bg-bg-elevated px-3 py-1.5 text-xs font-medium text-accent">
                <svg aria-hidden viewBox="0 0 12 12" className="h-3 w-3"><path fill="currentColor" d="M6 1l1.5 3 3.3.5-2.4 2.3.6 3.3L6 8.5l-3 1.6.6-3.3L1.2 4.5l3.3-.5z" /></svg>
                Cited: {current.cite}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
