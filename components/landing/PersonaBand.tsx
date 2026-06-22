// Persona band - qase-modelled "self-segment" section. Four trades, each
// with the one HR/hiring pain HQ.ai takes off their plate. Helps a visitor
// see themselves on the page in a glance.

export default function PersonaBand() {
  const personas = [
    {
      label: 'Pubs and hospitality',
      pain: 'Casuals, split shifts and the right penalty rates - sorted without a phone call.',
      icon: PubIcon,
    },
    {
      label: 'Trades',
      pain: 'Apprentice pay, contracts and warnings, drafted between jobs.',
      icon: TradesIcon,
    },
    {
      label: 'Retail',
      pain: 'Rosters, probation and quick seasonal hiring, handled in minutes.',
      icon: RetailIcon,
    },
    {
      label: 'Clinics and allied health',
      pain: 'Award classifications and safe records, without the admin pile-up.',
      icon: HealthIcon,
    },
  ]

  return (
    <section className="bg-bg-soft py-20 md:py-28" aria-labelledby="persona-heading">
      <div className="mx-auto max-w-6xl px-6 md:px-10">
        <p className="mb-4 text-xs font-medium uppercase tracking-[0.18em] text-clay">Who it&apos;s for</p>
        <h2
          id="persona-heading"
          className="max-w-3xl font-display text-3xl font-bold leading-tight tracking-tight text-ink md:text-[40px]"
        >
          Built for your trade, not a corporate HR team.
        </h2>
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-ink-soft md:text-lg">
          HQ.ai knows the awards and the everyday calls that small Australian businesses actually face.
        </p>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 md:gap-6">
          {personas.map((p) => {
            const Icon = p.icon
            return (
              <article
                key={p.label}
                className="flex flex-col rounded-3xl border border-border bg-bg-elevated p-6 shadow-card transition-colors hover:border-clay/50"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-clay-soft/30 text-clay">
                  <Icon />
                </span>
                <h3 className="mt-4 font-display text-lg font-bold tracking-tight text-ink">{p.label}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">{p.pain}</p>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function PubIcon() {
  return (
    <svg aria-hidden viewBox="0 0 32 32" className="h-6 w-6 stroke-current" fill="none" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 6h14l-1 13a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4L9 6Z" />
      <path d="M22 10h2a3 3 0 0 1 0 6h-2" />
      <path d="M13 26h6" />
    </svg>
  )
}
function TradesIcon() {
  return (
    <svg aria-hidden viewBox="0 0 32 32" className="h-6 w-6 stroke-current" fill="none" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d="m6 24 9-9" />
      <path d="m13 13 6 6" />
      <path d="M19 7h6v6l-3 3-6-6 3-3Z" />
    </svg>
  )
}
function RetailIcon() {
  return (
    <svg aria-hidden viewBox="0 0 32 32" className="h-6 w-6 stroke-current" fill="none" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 10h20l-2 14H8L6 10Z" />
      <path d="M12 10a4 4 0 0 1 8 0" />
    </svg>
  )
}
function HealthIcon() {
  return (
    <svg aria-hidden viewBox="0 0 32 32" className="h-6 w-6 stroke-current" fill="none" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 6v20" />
      <path d="M6 16h20" />
      <circle cx="16" cy="16" r="11" />
    </svg>
  )
}
