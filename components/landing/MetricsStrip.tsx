// Metrics strip - qase-modelled "before -> after" delta proof. Each card
// shows the painful old number struck through, an arrow, then the HQ.ai
// number in Clay. Quantifies the value in a glance.

export default function MetricsStrip() {
  const deltas = [
    { from: 'Half a day', to: '3 minutes', label: 'to sort a typical HR question' },
    { from: '$850/mo', to: 'from $89', label: 'for everyday HR and hiring help' },
    { from: '80 CVs by hand', to: 'minutes', label: 'to score a stack of applicants' },
  ]

  return (
    <section className="bg-bg py-16 md:py-20" aria-labelledby="metrics-heading">
      <div className="mx-auto max-w-6xl px-6 md:px-10">
        <p
          id="metrics-heading"
          className="text-center text-xs font-medium uppercase tracking-[0.18em] text-clay"
        >
          The difference
        </p>

        <div className="mt-10 grid gap-4 md:grid-cols-3 md:gap-6">
          {deltas.map((d) => (
            <article
              key={d.label}
              className="rounded-3xl border border-border bg-bg-elevated p-7 text-center shadow-card md:p-8"
            >
              <div className="flex items-center justify-center gap-3">
                <span className="font-display text-lg font-medium text-ink-muted line-through decoration-ink-muted/50">
                  {d.from}
                </span>
                <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-clay" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
                <span className="font-display text-[28px] font-bold leading-none tracking-tight text-clay md:text-[32px]">
                  {d.to}
                </span>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-ink-soft">{d.label}</p>
            </article>
          ))}
        </div>

        <p className="mt-6 text-center text-[11px] text-ink-muted">
          Estimates based on our own modelling against typical Australian retainer prices.
        </p>
      </div>
    </section>
  )
}
