'use client'

// Section 8: FAQ. 8 Q&A pairs in the brief's kill-rate order
// (section 6 of docs/research/landing-page-research-brief.md).
// Single-open accordion with native <details> behaviour for JS-off
// reachability + custom styling.

import { useState } from 'react'

const FAQS: Array<{ q: string; a: string }> = [
  {
    q: 'Is the AI legally accurate?',
    a: "Every answer cites the specific Fair Work Act section, NES standard, or Modern Award clause it's drawn from. When the question is too complex for the AI, you get handed off to a human Humanistiqs advisor on the same call - no repeating yourself.",
  },
  {
    q: 'Why would I pay for this when I can Google it?',
    a: 'Google gives you 47 American results and three Fair Work pages buried on page two. HQ.ai gives you the right answer for your award in 30 seconds, with the citation. Your hourly rate is more than $99/month.',
  },
  {
    q: 'I only need one letter. Do I have to subscribe?',
    a: 'No. Reserve your spot on the pay-as-you-go marketplace - first 100 reservations get $10 off the $25 Letter of Offer when it launches. No subscription, no card today.',
  },
  {
    q: 'Where is my data stored?',
    a: 'In Sydney. On Supabase Australian infrastructure. Compliant with Australian Privacy Principles 1-13.',
  },
  {
    q: 'What happens after my 14-day trial?',
    a: "You pick a plan or you don't. Your data stays in your account whether you subscribe or not. We never sell it, ever.",
  },
  {
    q: 'How long does it take to learn?',
    a: 'Three minutes. The chat is just chat. Tell it what you need and it asks the right follow-up questions.',
  },
  {
    q: 'Does it know my Modern Award?',
    a: 'It knows all 122 Modern Awards on the Fair Work register. Tell it your industry on signup; it picks the right award and remembers it.',
  },
  {
    q: 'Is this another Employsure?',
    a: 'No. No 5-year contract. No phone tree. No cold-call team. Cancel any time. The full pricing is on this page.',
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
