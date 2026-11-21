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
        {/* The eyebrow sits on the page's left line, like every other
            section's. Centred, it was the only off-axis block on the
            page: the 20px rule is part of the flex row, so centring the
            row put the words themselves 14px right of the page's middle,
            and it was the one section that did not start where the rest
            of the page starts. The three stat cells stay centred inside
            their own columns - that is the band's own composition. */}
        <p
          id="metrics-heading"
          className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.06em] text-clay"
        >
          <span aria-hidden className="h-px w-5 bg-clay" />
          The difference
        </p>

        {/* Typographic stat band - hairline-divided, no card chrome. */}
        <dl className="mt-10 grid divide-y divide-border border-y border-border md:grid-cols-3 md:divide-x md:divide-y-0">
          {deltas.map((d) => (
            <div key={d.label} className="px-6 py-8 text-center md:px-8">
              {/* The struck-through "before" wraps to two lines in the third
                  cell and one in the others, which dropped that cell's
                  label below its neighbours'. A floor on the row keeps
                  the three labels on one line. */}
              <div className="flex h-10 items-baseline justify-center gap-2.5 md:h-14">
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

        <p className="mt-6 text-[11px] text-ink-muted">
          Estimates based on our own modelling against typical Australian retainer prices.
        </p>
      </div>
    </section>
  )
}
