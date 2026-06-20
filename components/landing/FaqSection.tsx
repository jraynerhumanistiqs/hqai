'use client'

// FAQ - decision-making rewrite (May 2026). Eight Q&A pairs, less
// Fair-Work-heavy, more time/cost/trust framing. Single-open
// accordion with native <details> behaviour for JS-off reachability
// + custom styling.

import { useState } from 'react'

const FAQS: Array<{ q: string; a: string }> = [
  {
    q: 'Will it actually save me time?',
    a: "Yes. That's the whole point. A job that used to eat half a day - Googling, calling an advisor, drafting a document - takes three minutes here. We track it for every customer in their first month.",
  },
  {
    q: 'Why pay when I can just Google it?',
    a: 'Google gives you 47 American answers and a few Fair Work pages buried on page two. We give you the right answer for your business in 30 seconds, and show you where it comes from. Your time is worth more than $89 a month.',
  },
  {
    q: 'I only need one document. Do I have to subscribe?',
    a: 'No. Reserve a spot for pay-as-you-go. The first 100 people get $10 off the $25 Letter of Offer when it launches. No subscription. No card today.',
  },
  {
    q: 'Can I trust the AI on real decisions?',
    a: 'Every answer shows where it comes from - the exact Fair Work Act section or your award - so you can check it yourself. And when it gets tricky, the same real advisor steps in. You never repeat yourself.',
  },
  {
    q: 'What does it cost?',
    a: 'Two plans. Solo is $89 a month - 3 seats and 500 AI credits. Business is $249 a month - 15 seats and 2,500 credits. Both come with a 14-day free trial, no card needed. Cancel any time. One-off documents start at $25 for a Letter of Offer, with no signup.',
  },
  {
    q: 'Do you offer a dedicated advisor?',
    a: 'Yes. HQ People Enterprise gives you your own Humanistiqs advisor. HQ Recruit Enterprise gives you a talent partner to run your hiring for you. From $1,495 a month on an annual plan, or a bit more month-to-month. We only take on 10 in 2026. See the Enterprise page for more.',
  },
  {
    q: 'How long does setup take?',
    a: "Three minutes. Sign up, tell us your industry, and we pick the right award for you and remember it. Nothing to install. The chat just works.",
  },
  {
    q: 'Where is my data stored?',
    a: 'In Sydney, on Australian servers. We follow the Australian Privacy Principles 1-13. We never sell it.',
  },
  {
    q: 'Why trust an Aussie startup over the big HR platforms?',
    a: "Because we are built to help you make decisions - not to run payroll or sell you a panic-button contract. Different problem, different tool. And the same real advisor is there when the AI hits its limit, not a new person every call.",
  },
]

export default function FaqSection() {
  const [open, setOpen] = useState<number | null>(0)
  return (
    <section className="bg-bg py-20 md:py-28" aria-labelledby="faq-heading">
      <div className="mx-auto max-w-3xl px-6 md:px-10">
        <p className="mb-4 text-xs font-medium uppercase tracking-[0.18em] text-clay">Questions</p>
        <h2 id="faq-heading" className="font-display text-3xl font-bold leading-tight tracking-tight text-ink md:text-[40px]">
          The stuff you&apos;re wondering.
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
