// FAQ - decision-making rewrite (May 2026). Nine Q&A pairs, less
// Fair-Work-heavy, more time/cost/trust framing. Native <details>/<summary>
// disclosure accordion: one markup block works with or without JS, so the
// copy is served to the DOM exactly once (no <noscript> duplicate, no
// client-side state). Shared name="faq" keeps it single-open natively.

const FAQS: Array<{ q: string; a: string }> = [
  {
    q: 'Will it actually save me time?',
    a: "Yes. That's the whole point. A job that used to eat half a day - Googling, calling an advisor, drafting a document - takes three minutes here. We track it for every customer in their first month.",
  },
  {
    q: 'Why pay when I can just Google it?',
    a: 'Google gives you 47 American answers and a few Fair Work pages buried on page two. We give you the right answer for your business in 30 seconds, and show you where it comes from. Your time is worth more than $59 a month.',
  },
  {
    q: 'I only need one document. Do I have to subscribe?',
    a: 'No. One-off documents are pay-as-you-go - buy just the document you need from $25, with no subscription and no account.',
  },
  {
    q: 'Can I trust the AI on real decisions?',
    a: 'Every answer is in plain English with the working shown, so you can sanity-check it yourself. And when it gets tricky, the same real advisor steps in - you never repeat yourself.',
  },
  {
    q: 'What does it cost?',
    a: 'Pick what you need. HQ People (HR help) is from $59 a month. HQ Recruit (hiring) is a $40 add-on. Or take the HQ Business bundle - $89 a month for a small team, $269 for a bigger one. Every plan has unlimited logins. Cancel any time. One-off documents start at $25 with no signup.',
  },
  {
    q: 'Do you offer a dedicated advisor?',
    a: 'Yes. HR365 gives you a dedicated Humanistiqs HR advisor on call; Recruit365 is the recruitment equivalent. HR365 starts at $799 a month and includes 3 advisor hours, with extra time at $250 an hour. We only take on 10 in 2026. See our outsourced HR & recruitment page for more.',
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
  return (
    <section className="bg-bg py-14 md:py-20" aria-labelledby="faq-heading">
      <div className="mx-auto max-w-3xl px-6 md:px-10">
        <p className="mb-4 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.06em] text-clay">
          <span aria-hidden className="h-px w-5 bg-clay" />
          Questions
        </p>
        <h2 id="faq-heading" className="font-display text-3xl font-bold leading-tight tracking-tight text-ink md:text-[40px]">
          The stuff you&apos;re wondering.
        </h2>

        <div className="mt-10 divide-y divide-border border-y border-border">
          {FAQS.map((item) => (
            <details key={item.q} name="faq" className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 text-left transition-colors hover:text-accent [&::-webkit-details-marker]:hidden">
                <span className="text-base font-medium text-ink md:text-lg">{item.q}</span>
                <svg
                  aria-hidden
                  viewBox="0 0 20 20"
                  className="h-5 w-5 shrink-0 text-ink-muted group-open:rotate-180"
                >
                  <path d="M5 7l5 6 5-6" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </summary>
              <div className="pb-6">
                <p className="text-sm leading-relaxed text-ink-soft md:text-base">{item.a}</p>
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}
