// Metrics strip - "before -> after" delta proof rendered as a single
// typographic stat band (not three more bordered cards). Each stat sits
// in a hairline-divided row: the painful old number struck through, a
// neutral arrow, then the HQ.ai number large in ink. The gold is rationed
// out of this section - the numbers carry the weight on their own.

export default function MetricsStrip() {
  const deltas = [
    { from: 'Half a day', to: '3 minutes', label: 'to sort a typical HR question' },
    { from: '$850/mo', to: 'from $59', label: 'for everyday HR help' },
    { from: '80 CVs by hand', to: 'minutes', label: 'to score a stack of applicants' },
  ]

  return (
    <section className="bg-bg py-12 md:py-16" aria-labelledby="metrics-heading">
      <div className="mx-auto max-w-6xl px-6 md:px-10">
        <p
          id="metrics-heading"
          className="flex items-center justify-center gap-2 text-center font-mono text-[11px] uppercase tracking-[0.06em] text-clay"
        >
          <span aria-hidden className="h-px w-5 bg-clay" />
          The difference
        </p>

        {/* Typographic stat band - hairline-divided, no card chrome. */}
        <dl className="mt-10 grid divide-y divide-border border-y border-border md:grid-cols-3 md:divide-x md:divide-y-0">
          {deltas.map((d) => (
            <div key={d.label} className="px-6 py-8 text-center md:px-8">
              <div className="flex items-baseline justify-center gap-2.5">
                <dd className="font-display text-base font-medium text-ink-muted line-through decoration-ink-muted/50">
                  {d.from}
                </dd>
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0 self-center text-ink-muted" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
                <dd className="font-display text-[32px] font-semibold leading-none tracking-[-0.02em] text-ink md:text-[40px]">
                  {d.to}
                </dd>
              </div>
              <dt className="mt-4 text-sm leading-relaxed text-ink-soft">{d.label}</dt>
            </div>
          ))}
        </dl>

        <p className="mt-6 text-center text-[11px] text-ink-muted">
          Estimates based on our own modelling against typical Australian retainer prices.
        </p>
      </div>
    </section>
  )
}
