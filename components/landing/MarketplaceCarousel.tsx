'use client'

// Section 5: the marketplace tease. The page's signature delight moment.
// Built to the motion prescription in section 9 of
// docs/research/landing-page-research-brief.md.
//
// - Horizontal carousel, 5 cards visible desktop, 1.5 on mobile (CSS
//   scroll-snap peek pattern).
// - 280 x 360 cards with Clay icon, Inter bold title, Inter price, teaser,
//   "Coming soon" badge top-right.
// - GSAP auto-play at 1 card / 4s, power2.inOut, 1.2s slide transition.
// - Pause on hover, resume 2s after mouseleave.
// - Hover scale 1.03x in 200ms power2.out.
// - "What's inside" tooltip slides up 240ms expo.out with 3 bullets.
// - prefers-reduced-motion: reduce disables auto-play AND scale/slide.
// - ARIA carousel role, live region, full keyboard nav.

import { useEffect, useMemo, useRef, useState } from 'react'
import { gsap } from 'gsap'

interface Item {
  name: string
  price: string
  teaser: string
  bullets: string[]
  launch: string
}

// Lifted verbatim from Appendix B of the brief.
const ITEMS: Item[] = [
  { name: 'Letter of Offer',              price: 'from $25',        teaser: 'A signed-ready offer letter, Fair Work compliant, in 3 minutes.',           bullets: ['Position, pay, hours, start date', 'NES + Modern Award references', 'Probation + notice clauses'],     launch: 'Launch (week 1)' },
  { name: 'Employment Contract',          price: 'from $49',        teaser: 'A full contract with all NES + Award clauses, your business details filled in.', bullets: ['All 11 NES entitlements', 'Restraint + confidentiality', 'Award classification + pay'],                       launch: 'Launch (week 2)' },
  { name: 'Termination Letter',           price: 'from $45',        teaser: 'A safe termination letter, with the notice + final-pay maths done.',         bullets: ['Notice calculator built-in', 'Final pay + leave reconciliation', 'Reason-of-termination framing'],     launch: 'Launch (week 4)' },
  { name: 'First-and-Final Warning',      price: 'from $35',        teaser: 'A defensible warning letter that holds up if it ends up at Fair Work.',       bullets: ['Conduct + consequences spelled out', 'Right of response noted', 'Filed-ready for the personnel file'],     launch: 'Launch (week 6)' },
  { name: 'Position Description',         price: 'from $29',        teaser: 'A clean PD with the duties, classification, and award rate.',                  bullets: ['Award classification matched', 'Duties + KPIs', 'Reporting line + key relationships'],                       launch: 'Launch (week 8)' },
  { name: 'Performance Improvement Plan', price: 'from $55',        teaser: 'A structured PIP with measurable goals and review dates.',                    bullets: ['SMART-style goals', 'Weekly review cadence', '30/60/90 day check-ins'],                                       launch: 'v1.5' },
  { name: 'Single Job Ad (SEEK-ready)',   price: 'from $39',        teaser: 'A SEEK-ready ad written in your voice, with all the compliance checks.',      bullets: ['EEO + inclusion check', 'Pay range guidance', 'Voice-matched to your brand'],                              launch: 'v1.5' },
  { name: 'CV Reformatting',              price: 'from $19/CV',     teaser: 'Your candidate CVs reformatted into a clean, anonymised house layout.',       bullets: ['Anonymisation on request', '5-pack discount ($79)', 'Humanistiqs house layout'],                            launch: 'v1.5' },
  { name: 'Flexible Work Refusal Letter', price: 'from $29',        teaser: 'A compliant refusal under s.65 Fair Work Act with the required reasons.',     bullets: ['s 65 reasonable grounds set out', 'Alternatives considered', '21-day response window respected'],          launch: 'v2' },
  { name: 'Single Reference Check',       price: 'from $15',        teaser: 'A structured reference-check script with the right competency questions.',   bullets: ['10 competency questions', 'Behavioural + situational mix', 'Notes template for your file'],               launch: 'v2' },
]

interface Props {
  onReserve: () => void
}

export default function MarketplaceCarousel({ onReserve }: Props) {
  const trackRef = useRef<HTMLUListElement | null>(null)
  const [index, setIndex] = useState(0)
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)
  const pausedRef = useRef(false)
  const resumeTimer = useRef<number | null>(null)
  const reduced = useMemo(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }, [])

  // GSAP-driven slide using CSS transform on the track.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const track = trackRef.current
    if (!track) return
    const cardWidth = 280 + 16 // card + gap
    if (reduced) {
      gsap.set(track, { x: -index * cardWidth })
      return
    }
    gsap.to(track, {
      x: -index * cardWidth,
      duration: 1.2,
      ease: 'power2.inOut',
    })
  }, [index, reduced])

  // Auto-play - 1 card / 4 seconds.
  useEffect(() => {
    if (reduced) return
    const id = window.setInterval(() => {
      if (pausedRef.current) return
      setIndex((i) => (i + 1) % ITEMS.length)
    }, 4000)
    return () => window.clearInterval(id)
  }, [reduced])

  const onMouseEnterCarousel = () => {
    pausedRef.current = true
    if (resumeTimer.current) {
      window.clearTimeout(resumeTimer.current)
      resumeTimer.current = null
    }
  }
  const onMouseLeaveCarousel = () => {
    resumeTimer.current = window.setTimeout(() => {
      pausedRef.current = false
    }, 2000)
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault()
      setIndex((i) => (i + 1) % ITEMS.length)
      pausedRef.current = true
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      setIndex((i) => (i - 1 + ITEMS.length) % ITEMS.length)
      pausedRef.current = true
    }
  }

  return (
    <section id="marketplace" className="bg-bg-soft py-20 md:py-28" aria-labelledby="marketplace-heading">
      <div className="mx-auto max-w-6xl px-6 md:px-10">
        <p className="mb-4 text-xs font-medium uppercase tracking-[0.18em] text-accent">Pay-as-you-go - launching soon</p>
        <h2 id="marketplace-heading" className="max-w-3xl font-display text-3xl font-bold leading-tight tracking-tight text-ink md:text-[40px]">
          One letter, one warning, one ad - on tap.
        </h2>
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-ink-soft md:text-lg">
          Not every business needs a subscription. Buy a single HR document or recruitment deliverable, with your logo on the footer, without the monthly commitment. Reserve a spot below - first 100 get $10 off launch pricing.
        </p>
        <div className="mt-7 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-4">
          <button
            type="button"
            onClick={onReserve}
            className="inline-flex h-12 items-center justify-center rounded-full border border-accent bg-transparent px-6 text-sm font-semibold text-accent transition-colors hover:bg-accent-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            Reserve your spot -&gt;
          </button>
          <p className="text-xs text-ink-muted">First 100 reservations get $10 off launch pricing.</p>
        </div>
      </div>

      {/* Carousel viewport - bleeds past the narrative max-width on desktop. */}
      {/* Single className - prior version had a duplicate attribute which
          React silently dropped, losing the mt-12/overflow-hidden styling. */}
      <div
        className="mt-12 w-full overflow-hidden rounded-3xl outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-4 focus-visible:ring-offset-bg"
        role="region"
        aria-roledescription="carousel"
        aria-label="Marketplace document line-up"
        onMouseEnter={onMouseEnterCarousel}
        onMouseLeave={onMouseLeaveCarousel}
        onFocusCapture={onMouseEnterCarousel}
        onBlurCapture={onMouseLeaveCarousel}
        onKeyDown={onKeyDown}
        tabIndex={0}
      >
        <div className="mx-auto max-w-7xl px-6 md:px-10">
          <span className="sr-only" aria-live="polite">
            Showing: {ITEMS[index].name}
          </span>
          <ul
            ref={trackRef}
            className="flex gap-4 will-change-transform marketplace-track"
            style={{ width: 'max-content' }}
          >
            {ITEMS.map((item, i) => (
              <li
                key={item.name}
                role="group"
                aria-roledescription="slide"
                aria-label={`${i + 1} of ${ITEMS.length}: ${item.name}`}
                onMouseEnter={() => setHoverIdx(i)}
                onMouseLeave={() => setHoverIdx((h) => (h === i ? null : h))}
                onFocus={() => setHoverIdx(i)}
                onBlur={() => setHoverIdx((h) => (h === i ? null : h))}
                className={[
                  'marketplace-card relative flex h-[360px] w-[280px] shrink-0 flex-col overflow-hidden rounded-3xl border border-border bg-bg-elevated p-5 shadow-card transition-transform duration-base ease-natural',
                  hoverIdx === i ? 'is-hovered' : '',
                  i === index ? 'is-active' : '',
                ].join(' ')}
                tabIndex={0}
              >
                {/* Coming soon badge */}
                <span className="absolute right-4 top-4 rounded-full border border-accent bg-accent-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-accent">
                  Coming soon
                </span>

                {/* Icon panel */}
                <div className="flex h-44 items-center justify-center rounded-2xl bg-bg-soft">
                  <DocIcon n={i} />
                </div>

                <h3 className="mt-5 font-display text-xl font-bold tracking-tight text-ink">{item.name}</h3>
                <p className="mt-1 text-sm font-semibold text-accent">{item.price}</p>
                <p className="mt-2 text-sm leading-snug text-ink-soft">{item.teaser}</p>

                {/* What's inside panel - slides up on hover */}
                <div
                  className="marketplace-tooltip absolute inset-x-0 bottom-0 translate-y-full rounded-b-3xl bg-ink p-5 text-bg shadow-float"
                  aria-hidden={hoverIdx !== i}
                >
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-bg-soft">What&apos;s inside</p>
                  <ul className="mt-2 space-y-1 text-xs leading-snug text-bg-soft">
                    {item.bullets.map((b) => (<li key={b}>{b}</li>))}
                  </ul>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <style>{`
        /* Hover-driven scale per the brief's motion spec (1.03x, 200ms power2.out).
           We use CSS so prefers-reduced-motion can disable it cleanly. */
        .marketplace-card { transform: scale(1); transition: transform 200ms cubic-bezier(.215,.61,.355,1); }
        .marketplace-card.is-hovered { transform: scale(1.03); }
        .marketplace-tooltip { transition: transform 240ms cubic-bezier(.19,1,.22,1); pointer-events: none; }
        .marketplace-card.is-hovered .marketplace-tooltip,
        .marketplace-card:focus-within .marketplace-tooltip { transform: translateY(0); }

        @media (max-width: 767px) {
          .marketplace-track {
            transform: none !important;
            overflow-x: auto;
            scroll-snap-type: x mandatory;
            -webkit-overflow-scrolling: touch;
            padding-right: 30vw;
          }
          .marketplace-card { scroll-snap-align: start; width: 78vw; }
        }
        @media (prefers-reduced-motion: reduce) {
          .marketplace-card, .marketplace-card.is-hovered { transform: none !important; }
          .marketplace-tooltip { transition: none; }
        }
      `}</style>
    </section>
  )
}

function DocIcon({ n }: { n: number }) {
  // Lightweight set so each card reads slightly differently.
  const variants = [
    <path key="0" d="M14 8h22v32H14z M14 8l6-6h16l6 6 M22 22h12 M22 28h12" />,
    <path key="1" d="M12 10h26v30H12z M18 18h14 M18 24h14 M18 30h10" />,
    <path key="2" d="M12 12h26v28H12z M22 22l-4 4 4 4 M28 22l4 4-4 4" />,
    <path key="3" d="M14 8h22v32H14z M20 18l4 4-4 4 M28 26h-8" />,
    <path key="4" d="M12 10h26v30H12z M18 20h14 M18 26h8 M18 32h11" />,
    <path key="5" d="M14 10h22v30H14z M20 18l3 3 7-7 M20 28l3 3 7-7" />,
    <path key="6" d="M14 10h22v30H14z M20 18h14 M20 24h14 M20 30h8 M30 30h4" />,
    <path key="7" d="M12 12h26v28H12z M19 20h12 M19 26h12 M19 32h12" />,
    <path key="8" d="M14 8h22v32H14z M22 22l4-4 4 4 M22 30h8" />,
    <path key="9" d="M12 10h26v30H12z M20 22h10 M20 28h10 M25 16v18" />,
  ]
  return (
    <svg viewBox="0 0 50 50" className="h-20 w-20 text-accent" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {variants[n] ?? variants[0]}
    </svg>
  )
}
