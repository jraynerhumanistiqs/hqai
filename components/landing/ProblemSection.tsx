// Problem section - qase-modelled "Without -> With" comparison. Three
// topics (people, hiring, cost), each shown as the painful old way next to
// the HQ.ai way. Scannable, contrast-driven, plain language.

export default function ProblemSection() {
  const rows = [
    {
      topic: 'People decisions',
      without: 'Googling for an hour, then second-guessing the answer anyway.',
      with: 'The right answer in under a minute, in plain English.',
    },
    {
      topic: 'Hiring',
      without: '80 CVs, six interviews, and a hire you picked on gut feel.',
      with: 'Every CV scored in minutes. Quick interviews. A clear shortlist.',
    },
    {
      topic: 'The cost',
      without: 'A retainer you pay every month and use twice a year.',
      with: 'From $59 a month. No lock-in. Cancel any time.',
    },
  ]

  return (
    <section className="bg-bg py-20 md:py-28" aria-labelledby="problem-heading">
      <div className="mx-auto max-w-6xl px-6 md:px-10">
        <p className="mb-4 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.06em] text-clay">
          <span aria-hidden className="h-px w-5 bg-clay" />
          The problem
        </p>
        <h2
          id="problem-heading"
          className="max-w-3xl font-display text-3xl font-bold leading-tight tracking-tight text-ink md:text-[40px]"
        >
          Business got busier. HR and hiring didn&apos;t get easier.
        </h2>
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-ink-soft md:text-lg">
          You did not start a business to become an HR manager. Here is the old way, next to the HQ.ai way.
        </p>

        <div className="mt-12 grid gap-4 md:grid-cols-3 md:gap-6">
          {rows.map((r) => (
            <article
              key={r.topic}
              className="flex flex-col overflow-hidden rounded-3xl border border-border bg-bg-elevated shadow-card"
            >
              <div className="border-b border-border px-6 py-4">
                <h3 className="font-display text-lg font-bold tracking-tight text-ink">{r.topic}</h3>
              </div>

              {/* Without */}
              <div className="flex items-start gap-3 px-6 py-5">
                <CrossIcon />
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-[0.06em] text-ink-muted">Without HQ.ai</p>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{r.without}</p>
                </div>
              </div>

              {/* With - the resolved half, on the soft surface (neutral). */}
              <div className="mt-auto flex items-start gap-3 border-t border-border bg-bg-soft px-6 py-5">
                <TickIcon />
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-[0.06em] text-ink-soft">With HQ.ai</p>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink">{r.with}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

function CrossIcon() {
  return (
    <span
      aria-hidden
      className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-border text-ink-muted"
    >
      <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
        <path d="M3 3l6 6M9 3l-6 6" />
      </svg>
    </span>
  )
}

function TickIcon() {
  return (
    <span
      aria-hidden
      className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-border text-ink"
    >
      <svg viewBox="0 0 16 16" className="h-3 w-3" aria-hidden>
        <path fill="currentColor" d="M6.2 11.4 3 8.2l1.1-1.1 2.1 2.1 5.7-5.7 1.1 1.1z" />
      </svg>
    </span>
  )
}
