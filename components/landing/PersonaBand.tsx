'use client'

// Persona band - "self-segment" section. A broad set of Australian
// industries, each with the one HR/hiring pain HQ.ai takes off their
// plate. An arrowed carousel (prev/next + dots) shows a few at a time so
// a visitor sees themselves on the page in a glance. Mirrors the carousel
// pattern in PricingSection's DOC_CATEGORIES.
//
// Accessible: arrow buttons + dots are real buttons with aria labels, the
// region is keyboard-reachable (left/right arrows move it), and the fade
// is disabled under prefers-reduced-motion.

import { useEffect, useRef, useState } from 'react'

interface Persona {
  label: string
  pain: string
  icon: () => React.ReactElement
}

const PERSONAS: Persona[] = [
  { label: 'Pubs and hospitality', pain: 'Casuals, split shifts and the right penalty rates - sorted without a phone call.', icon: PubIcon },
  { label: 'Cafes and restaurants', pain: 'Rosters, junior pay and quick casual hiring, handled between services.', icon: CafeIcon },
  { label: 'Trades and construction', pain: 'Apprentice pay, contracts and warnings, drafted between jobs.', icon: TradesIcon },
  { label: 'Retail', pain: 'Rosters, probation and quick seasonal hiring, handled in minutes.', icon: RetailIcon },
  { label: 'Clinics and allied health', pain: 'Classifications and safe records, without the admin pile-up.', icon: HealthIcon },
  { label: 'Medical and dental', pain: 'Onboarding, leave and policies for a busy practice, done in minutes.', icon: MedicalIcon },
  { label: 'Fitness and gyms', pain: 'Casual trainers, contracts and shift cover, sorted on the spot.', icon: FitnessIcon },
  { label: 'Beauty and salons', pain: 'Junior pay, contracts and warnings, written for you in minutes.', icon: SalonIcon },
  { label: 'Childcare and early learning', pain: 'Onboarding, records and policies for your educators, kept tidy.', icon: ChildcareIcon },
  { label: 'Professional services', pain: 'Offer letters, performance plans and policies, drafted in your voice.', icon: ProfessionalIcon },
  { label: 'Real estate', pain: 'Commission roles, contracts and quick hiring, handled in minutes.', icon: RealEstateIcon },
  { label: 'Automotive', pain: 'Apprentices, shift cover and warnings, drafted between jobs.', icon: AutoIcon },
  { label: 'Transport and logistics', pain: 'Driver onboarding, contracts and records, kept in order.', icon: TransportIcon },
  { label: 'Not-for-profits', pain: 'Volunteers, casual staff and policies, handled without the overhead.', icon: NfpIcon },
  { label: 'Agriculture', pain: 'Seasonal workers, contracts and records, sorted before the season starts.', icon: AgIcon },
]

// How many cards show at once at each breakpoint informs the page count.
// We page in groups of 3 (the lg layout); on smaller screens the grid just
// wraps the same group.
const PER_PAGE = 3
const PAGES = Math.ceil(PERSONAS.length / PER_PAGE)

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(mq.matches)
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches)
    mq.addEventListener?.('change', handler)
    return () => mq.removeEventListener?.('change', handler)
  }, [])
  return reduced
}

export default function PersonaBand() {
  const [page, setPage] = useState(0)
  const reduced = usePrefersReducedMotion()
  const regionRef = useRef<HTMLDivElement>(null)

  const move = (dir: 1 | -1) => setPage((p) => (p + dir + PAGES) % PAGES)

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault()
      move(1)
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      move(-1)
    }
  }

  const start = page * PER_PAGE
  const shown = PERSONAS.slice(start, start + PER_PAGE)

  return (
    <section className="bg-bg py-14 md:py-20" aria-labelledby="persona-heading">
      <div className="mx-auto max-w-6xl px-6 md:px-10">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-4 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.06em] text-clay">
              <span aria-hidden className="h-px w-5 bg-clay" />
              Who it&apos;s for
            </p>
            <h2
              id="persona-heading"
              className="max-w-3xl font-display text-3xl font-bold leading-tight tracking-tight text-ink md:text-[40px]"
            >
              Built for your industry, not a corporate HR team.
            </h2>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-ink-soft md:text-lg">
              No matter the industry or the types of everyday people challenges you face, HQ.ai has the answers.
            </p>
          </div>

          {/* Arrow controls */}
          <div className="flex items-center gap-1.5">
            <CarouselBtn dir="prev" onClick={() => move(-1)} />
            <CarouselBtn dir="next" onClick={() => move(1)} />
          </div>
        </div>

        <div
          ref={regionRef}
          role="group"
          aria-label="Industries HQ.ai is built for"
          tabIndex={0}
          onKeyDown={onKeyDown}
          className="mt-10 rounded-3xl outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
        >
          <div
            key={page}
            className={[
              'grid gap-4 sm:grid-cols-2 lg:grid-cols-3 md:gap-6',
              reduced ? '' : 'persona-fade',
            ].join(' ')}
          >
            {shown.map((p) => {
              const Icon = p.icon
              return (
                <article
                  key={p.label}
                  className="flex flex-col rounded-2xl border border-border bg-bg-soft p-6 transition-colors hover:border-border-strong"
                >
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border text-ink-soft">
                    <Icon />
                  </span>
                  <h3 className="mt-4 font-display text-lg font-bold tracking-tight text-ink">{p.label}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-soft">{p.pain}</p>
                </article>
              )
            })}
          </div>
        </div>

        {/* Dots */}
        <div className="mt-8 flex items-center justify-center gap-1.5" role="tablist" aria-label="Industry pages">
          {Array.from({ length: PAGES }).map((_, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === page}
              aria-label={`Industries page ${i + 1}`}
              onClick={() => setPage(i)}
              className={`h-1.5 rounded-full transition-all ${i === page ? 'w-6 bg-ink-soft' : 'w-1.5 bg-border hover:bg-ink-muted'}`}
            />
          ))}
        </div>
      </div>

      <style jsx>{`
        .persona-fade { animation: personaFade 360ms ease-out both; }
        @keyframes personaFade { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @media (prefers-reduced-motion: reduce) { .persona-fade { animation: none; } }
      `}</style>
    </section>
  )
}

function CarouselBtn({ dir, onClick }: { dir: 'prev' | 'next'; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={dir === 'prev' ? 'Previous industries' : 'Next industries'}
      className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-ink-soft transition-colors hover:border-ink hover:text-ink"
    >
      <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        {dir === 'prev' ? <path d="M10 3 5 8l5 5" /> : <path d="M6 3l5 5-5 5" />}
      </svg>
    </button>
  )
}

/* ------------------------------------------------------------------ icons */

function PubIcon() {
  return (
    <svg aria-hidden viewBox="0 0 32 32" className="h-6 w-6 stroke-current" fill="none" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 6h14l-1 13a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4L9 6Z" />
      <path d="M22 10h2a3 3 0 0 1 0 6h-2" />
      <path d="M13 26h6" />
    </svg>
  )
}
function CafeIcon() {
  return (
    <svg aria-hidden viewBox="0 0 32 32" className="h-6 w-6 stroke-current" fill="none" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 12h16v6a6 6 0 0 1-6 6h-4a6 6 0 0 1-6-6v-6Z" />
      <path d="M23 14h2a3 3 0 0 1 0 6h-2" />
      <path d="M11 5c0 2-1 2-1 4M16 5c0 2-1 2-1 4" />
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
function MedicalIcon() {
  return (
    <svg aria-hidden viewBox="0 0 32 32" className="h-6 w-6 stroke-current" fill="none" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 5l9 3v7c0 6-4 10-9 12-5-2-9-6-9-12V8l9-3Z" />
      <path d="M16 12v8M12 16h8" />
    </svg>
  )
}
function FitnessIcon() {
  return (
    <svg aria-hidden viewBox="0 0 32 32" className="h-6 w-6 stroke-current" fill="none" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 12v8M25 12v8M10 16h12M5 14v4M27 14v4" />
    </svg>
  )
}
function SalonIcon() {
  return (
    <svg aria-hidden viewBox="0 0 32 32" className="h-6 w-6 stroke-current" fill="none" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="9" r="4" />
      <circle cx="9" cy="23" r="4" />
      <path d="M12 12l14 11M12 20L26 9" />
    </svg>
  )
}
function ChildcareIcon() {
  return (
    <svg aria-hidden viewBox="0 0 32 32" className="h-6 w-6 stroke-current" fill="none" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="16" cy="11" r="5" />
      <path d="M7 26a9 9 0 0 1 18 0" />
      <path d="M13 10h.01M19 10h.01" />
    </svg>
  )
}
function ProfessionalIcon() {
  return (
    <svg aria-hidden viewBox="0 0 32 32" className="h-6 w-6 stroke-current" fill="none" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 12h20v12H6z" />
      <path d="M12 12v-3a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v3" />
      <path d="M6 17h20" />
    </svg>
  )
}
function RealEstateIcon() {
  return (
    <svg aria-hidden viewBox="0 0 32 32" className="h-6 w-6 stroke-current" fill="none" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 15l10-8 10 8" />
      <path d="M9 13v12h14V13" />
      <path d="M14 25v-6h4v6" />
    </svg>
  )
}
function AutoIcon() {
  return (
    <svg aria-hidden viewBox="0 0 32 32" className="h-6 w-6 stroke-current" fill="none" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 19l2-6a3 3 0 0 1 3-2h12a3 3 0 0 1 3 2l2 6v4H5v-4Z" />
      <circle cx="10" cy="23" r="2" />
      <circle cx="22" cy="23" r="2" />
    </svg>
  )
}
function TransportIcon() {
  return (
    <svg aria-hidden viewBox="0 0 32 32" className="h-6 w-6 stroke-current" fill="none" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 9h14v13H4z" />
      <path d="M18 13h5l3 4v5h-8V13Z" />
      <circle cx="9" cy="23" r="2" />
      <circle cx="22" cy="23" r="2" />
    </svg>
  )
}
function NfpIcon() {
  return (
    <svg aria-hidden viewBox="0 0 32 32" className="h-6 w-6 stroke-current" fill="none" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 26s-9-5-9-12a5 5 0 0 1 9-3 5 5 0 0 1 9 3c0 7-9 12-9 12Z" />
    </svg>
  )
}
function AgIcon() {
  return (
    <svg aria-hidden viewBox="0 0 32 32" className="h-6 w-6 stroke-current" fill="none" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 26V14" />
      <path d="M16 16c-4 0-7-2-7-6 4 0 7 2 7 6Z" />
      <path d="M16 14c4 0 7-2 7-6-4 0-7 2-7 6Z" />
      <path d="M9 26h14" />
    </svg>
  )
}
