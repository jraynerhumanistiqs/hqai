// Metrics strip - sits directly below SocialProofRibbon. Three big-number
// cards that quantify what HQ.ai buys back: hours, dollars, decisions.

export default function MetricsStrip() {
  const metrics = [
    {
      figure: '~12 hours',
      label: 'back per month',
      body: 'From admin work HQ.ai handles for you.',
    },
    {
      figure: '$8,400',
      label: 'kept off the legal bill',
      body: 'Average a year vs paying a retainer for the same advice.',
    },
    {
      figure: '33+',
      label: 'decisions made faster',
      body: 'From offer letters to letting someone go to award checks.',
    },
  ]

  return (
    <section className="bg-bg py-16 md:py-20" aria-labelledby="metrics-heading">
      <div className="mx-auto max-w-6xl px-6 md:px-10">
        <p
          id="metrics-heading"
          className="text-center text-xs font-medium uppercase tracking-[0.18em] text-clay"
        >
          What HQ.ai buys you back
        </p>

        <div className="mt-10 grid gap-4 md:grid-cols-3 md:gap-6">
          {metrics.map((m) => (
            <article
              key={m.figure}
              className="rounded-3xl border border-border bg-bg-elevated p-7 shadow-card md:p-8"
            >
              <p className="font-display text-[40px] font-bold leading-none tracking-tight text-clay md:text-[48px]">
                {m.figure}
              </p>
              <p className="mt-3 text-xs font-medium uppercase tracking-[0.16em] text-ink-muted">
                {m.label}
              </p>
              <p className="mt-3 text-sm leading-relaxed text-ink-soft">{m.body}</p>
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
