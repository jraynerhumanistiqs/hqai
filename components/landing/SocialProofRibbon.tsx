// Section 2: social-proof ribbon. Thin strip beneath the hero with the
// brief's headline and five industry icons in grayscale Ink.

export default function SocialProofRibbon() {
  const industries = [
    { label: 'Pubs', icon: PubIcon },
    { label: 'Trades', icon: TradesIcon },
    { label: 'Retail', icon: RetailIcon },
    { label: 'Allied health', icon: HealthIcon },
    { label: 'Professional services', icon: ProServicesIcon },
  ]
  return (
    <section className="border-y border-border bg-bg-soft" aria-label="Social proof">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-6 py-10 md:flex-row md:justify-between md:px-10">
        <p className="text-center text-sm font-medium text-ink-soft md:text-left">
          Trusted by Australian SMEs from Penrith to Perth
        </p>
        <ul className="flex flex-wrap items-center justify-center gap-6 text-ink-muted md:gap-9">
          {industries.map((it) => {
            const Icon = it.icon
            return (
              <li key={it.label} className="flex flex-col items-center gap-2 text-xs">
                <Icon />
                <span>{it.label}</span>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}

function PubIcon() {
  return (
    <svg aria-hidden viewBox="0 0 32 32" className="h-7 w-7 stroke-current" fill="none" strokeWidth={1.5}>
      <path d="M9 6h14l-1 13a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4L9 6Z" />
      <path d="M22 10h2a3 3 0 0 1 0 6h-2" />
      <path d="M13 26h6" />
    </svg>
  )
}
function TradesIcon() {
  return (
    <svg aria-hidden viewBox="0 0 32 32" className="h-7 w-7 stroke-current" fill="none" strokeWidth={1.5}>
      <path d="m6 24 9-9" />
      <path d="m13 13 6 6" />
      <path d="M19 7h6v6l-3 3-6-6 3-3Z" />
    </svg>
  )
}
function RetailIcon() {
  return (
    <svg aria-hidden viewBox="0 0 32 32" className="h-7 w-7 stroke-current" fill="none" strokeWidth={1.5}>
      <path d="M6 10h20l-2 14H8L6 10Z" />
      <path d="M12 10a4 4 0 0 1 8 0" />
    </svg>
  )
}
function HealthIcon() {
  return (
    <svg aria-hidden viewBox="0 0 32 32" className="h-7 w-7 stroke-current" fill="none" strokeWidth={1.5}>
      <path d="M16 6v20" />
      <path d="M6 16h20" />
      <circle cx="16" cy="16" r="11" />
    </svg>
  )
}
function ProServicesIcon() {
  return (
    <svg aria-hidden viewBox="0 0 32 32" className="h-7 w-7 stroke-current" fill="none" strokeWidth={1.5}>
      <path d="M6 12h20v14H6z" />
      <path d="M12 12V8h8v4" />
    </svg>
  )
}
