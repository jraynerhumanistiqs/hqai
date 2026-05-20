'use client'

// FAQ - decision-making rewrite (May 2026). Eight Q&A pairs, less
// Fair-Work-heavy, more time/cost/trust framing. Single-open
// accordion with native <details> behaviour for JS-off reachability
// + custom styling.

import { useState } from 'react'

const FAQS: Array<{ q: string; a: string }> = [
  {
    q: 'Will it actually save me time?',
    a: "Yes - that's the whole pitch. Most decisions that used to take a half-day of Googling, calling an advisor, and drafting a document take three minutes inside HQ.ai. We track that for every customer in their first month.",
  },
  {
    q: 'Why pay for this when I can just Google it?',
    a: 'Google gives you 47 American answers and three Fair Work pages buried on page two. HQ.ai gives you the right answer for your business in 30 seconds, with the citation. Your hourly rate is worth more than $99 a month.',
  },
  {
    q: 'I only need one document. Do I have to subscribe?',
    a: 'No. Reserve a spot on the pay-as-you-go marketplace - first 100 reservations get $10 off the $25 Letter of Offer when it launches. No subscription, no card today.',
  },
  {
    q: 'Is the AI good enough to trust on real decisions?',
    a: 'Every answer cites the specific Fair Work Act section, NES standard, or Modern Award clause it is drawn from. When the question is too complex, you get handed off to the same human advisor every time - no repeating yourself.',
  },
  {
    q: 'What does it actually cost?',
    a: '$99 a month for 3 seats, $199 for 6, $379 for 12. 14-day free trial, no card. Cancel any time. The pay-as-you-go items start at $15.',
  },
  {
    q: 'How long does setup take?',
    a: "Three minutes. You sign up, tell HQ.ai your industry, and it picks the right Modern Award and remembers it. There's nothing to install. The chat just works.",
  },
  {
    q: 'Where is my data stored?',
    a: 'In Sydney, on Supabase Australian infrastructure. Compliant with Australian Privacy Principles 1-13. We never sell it.',
  },
  {
    q: 'Why would I trust an AU startup over Employment Hero or Employsure?',
    a: 'Because HQ.ai is built for decision-making, not payroll administration or panic-button advisory. Different problem, different tool. And the same human advisor is on the line when the AI hits its limit - not a fresh agent every call.',
  },
]

export default function FaqSection() {
  const [open, setOpen] = useState<number | null>(0)
  return (
    <section className="bg-bg py-20 md:py-28" aria-labelledby="faq-heading">
      <div className="mx-auto max-w-3xl px-6 md:px-10">
        <p className="mb-4 text-xs font-medium uppercase tracking-[0.18em] text-ink-muted">Questions</p>
        <h2 id="faq-heading" className="font-serif text-3xl leading-tight tracking-tight text-ink md:text-[40px]">
          The eight things you&apos;re wondering.
        </h2>

        <ul className="mt-10 divide-y divide-border border-y border-border">
          {FAQS.map((item, i) => {
            const isOpen = open === i
            return (
              <li key={item.q}>
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : i)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between gap-6 py-5 text-left transition-colors hover:text-accent"
                >
                  <span className="text-base font-medium text-ink md:text-lg">{item.q}</span>
                  <svg
                    aria-hidden
                    viewBox="0 0 20 20"
                    className={[
                      'h-5 w-5 shrink-0 text-ink-muted transition-transform duration-300',
                      isOpen ? 'rotate-180' : 'rotate-0',
                    ].join(' ')}
                  >
                    <path d="M5 7l5 6 5-6" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                <div
                  className={[
                    'overflow-hidden transition-[max-height,opacity] duration-300 ease-out',
                    isOpen ? 'max-h-96 opacity-100 pb-6' : 'max-h-0 opacity-0',
                  ].join(' ')}
                >
                  <p className="text-sm leading-relaxed text-ink-soft md:text-base">{item.a}</p>
                </div>
              </li>
            )
          })}
        </ul>

        {/* JS-off fallback: show all answers natively below the accordion. */}
        <noscript>
          <ul className="mt-10 space-y-6">
            {FAQS.map((f) => (
              <li key={f.q}>
                <p className="font-medium text-ink">{f.q}</p>
                <p className="mt-1 text-sm text-ink-soft">{f.a}</p>
              </li>
            ))}
          </ul>
        </noscript>
      </div>
    </section>
  )
}
