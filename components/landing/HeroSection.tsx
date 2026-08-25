'use client'

// Section 1: hero.
//
// Aug 2026 - the reveal choreography is now hero-26's
// (registry.watermelon.sh/r/hero-26.json): one motion variant tree with
// staggered children, plus an optional full-bleed background image that
// settles in behind the copy. What was NOT taken from hero-26: its own
// nav bar (MarketingHeader already owns that, and it is load-bearing -
// it sets data-app="marketing" on <html>), its App Store / Play buttons,
// and its "5 stars, over 3k creators" strip. HQ.ai has no mobile apps
// and no review count to quote, so neither is invented here.
//
// The HQ People chat preview is still the star; the HQ Recruit scorecard
// stays a quiet secondary tile beneath it.
//
// prefers-reduced-motion renders the final state instantly (no reveal).
//
// Copy rules: Australian English, plain hyphens only, ASCII apostrophes.

import Link from 'next/link'
import { motion, useReducedMotion, type Variants } from 'motion/react'
import HeroChatPreview from './HeroChatPreview'

interface HeroFeature {
  title: string
  subtitle: string
}

// hero-26 ends on a strip of feature cards. Same shape, real content -
// the three jobs HQ.ai actually does.
const FEATURES: HeroFeature[] = [
  { title: 'Answers, not templates', subtitle: 'Ask in plain English, get advice for your business' },
  { title: 'Hiring end to end', subtitle: 'Score CVs, pre-screen and shortlist in one place' },
  { title: 'A real advisor', subtitle: 'A person picks up the hard 20 per cent' },
]

const container: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.09, delayChildren: 0.04 } },
}

const rise: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 200, damping: 30, mass: 0.9 } },
}

const heading: Variants = {
  hidden: { opacity: 0, y: 40, x: -8 },
  visible: { opacity: 1, y: 0, x: 0, transition: { type: 'spring', stiffness: 160, damping: 24, mass: 1.2 } },
}

const backdrop: Variants = {
  hidden: { opacity: 0, x: 30, scale: 1.04 },
  visible: { opacity: 1, x: 0, scale: 1, transition: { duration: 1.5, ease: [0.22, 1, 0.36, 1] } },
}

interface Props {
  /**
   * Optional full-bleed backdrop, hero-26 style. Left unset the hero
   * keeps its clean slab - there is deliberately no default, because
   * hero-26's own image is hotlinked from the registry's CDN and this
   * app has no equivalent asset yet. Drop a file in public/ and pass
   * its path to turn the treatment on.
   */
  backgroundImage?: string
}

export default function HeroSection({ backgroundImage }: Props) {
  const reduced = useReducedMotion()
  // With reduced motion we skip straight to the resting state rather
  // than animating to it, so nothing moves on load.
  const motionProps = reduced
    ? { initial: 'visible' as const, animate: 'visible' as const }
    : { initial: 'hidden' as const, animate: 'visible' as const }

  return (
    <section className="relative isolate overflow-hidden" aria-labelledby="hero-heading">
      {backgroundImage && (
        <>
          <motion.img
            src={backgroundImage}
            alt=""
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 h-full w-full object-cover object-center"
            variants={backdrop}
            {...motionProps}
          />
          {/* Scrim - the copy has to keep its contrast over any photo. */}
          <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-bg/70" />
        </>
      )}

      <motion.div
        className="mx-auto grid max-w-7xl items-center gap-12 px-6 pb-14 pt-8 md:grid-cols-[1fr_1.05fr] md:gap-12 md:px-10 md:pb-20 md:pt-12 lg:gap-16"
        variants={container}
        {...motionProps}
      >
        {/* Left: copy block.
            relative z-20 lifts this column's stacking context above the
            right-hand preview column. Both columns get a transform from the
            reveal animation, so each is its own stacking context painting in
            DOM order - without this the HQ People card (later in the DOM)
            covers the "busywork off your plate" popover where it opens into
            the gap between the columns. */}
        <div className="relative z-20 max-w-xl">
          <motion.p
            variants={rise}
            className="mb-6 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.06em] text-clay"
          >
            <span aria-hidden className="h-px w-5 bg-clay" />
            Built for Australian small business
          </motion.p>

          <motion.h1
            id="hero-heading"
            variants={heading}
            className="font-display text-[34px] font-semibold leading-[1.06] tracking-[-0.02em] text-ink sm:text-[42px] md:text-[52px]"
          >
            HR and hiring are complicated. HQ.ai makes it{' '}
            <span className="text-clay">easy, quick and accurate.</span>
          </motion.h1>

          <motion.p variants={rise} className="mt-6 text-lg leading-relaxed text-ink-soft md:text-xl">
            HQ.ai handles the everyday HR work and hiring processes that cost you time and money. Ask a question, get a clear answer for your business, and get back to work - so the jobs that used to take hours now take minutes. No HR background needed, and a real advisor is there for the hard calls. From $59/month. Cancel any time.
          </motion.p>

          <motion.div variants={rise} className="mt-9 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-4">
            <Link
              href="/signup"
              className="inline-flex h-12 items-center justify-center rounded-full bg-clay px-7 text-sm font-semibold text-ink-on-accent shadow-card transition-colors hover:bg-clay-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay"
            >
              Get started
            </Link>
          </motion.div>

          <motion.p variants={rise} className="mt-4 text-sm text-ink-muted">
            Three minutes to set up. Answers from day one.
          </motion.p>
        </div>

        {/* Right: HQ People is the star; HQ Recruit is a quiet secondary tile. */}
        <motion.div variants={rise} className="relative w-full">
          {/* Feature surface (Tier B) - the signature live preview. */}
          <HeroChatPreview />

          {/* HQ Recruit - quiet tile (Tier A), secondary + smaller. */}
          <div
            className="mt-4 rounded-2xl border border-border bg-bg-soft p-4"
            role="group"
            aria-label="HQ Recruit preview"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span aria-hidden className="h-2 w-2 rounded-full bg-ink-muted" />
                <span className="font-mono text-[11px] uppercase tracking-[0.06em] text-ink-muted">HQ Recruit</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-display text-base font-semibold tracking-tight text-ink">Sarah K.</span>
                <span className="font-display text-base font-semibold tracking-tight text-ink">
                  4.2<span className="text-xs font-normal text-ink-muted"> / 5</span>
                </span>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-3">
              {[
                { label: 'Experience', score: 88 },
                { label: 'Communication', score: 82 },
                { label: 'Role fit', score: 74 },
              ].map((row) => (
                <div key={row.label} className="flex-1">
                  <div className="h-1 w-full overflow-hidden rounded-full bg-border">
                    <div className="h-full rounded-full bg-ink-muted" style={{ width: `${row.score}%` }} />
                  </div>
                  <p className="mt-1 text-[10px] text-ink-muted">{row.label}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Feature strip - hero-26's closing row, carried over. */}
      <motion.ul
        className="mx-auto grid max-w-7xl gap-px overflow-hidden border-t border-border px-6 md:grid-cols-3 md:px-10"
        variants={container}
        {...motionProps}
      >
        {FEATURES.map((f) => (
          <motion.li key={f.title} variants={rise} className="py-6 md:px-6 md:first:pl-0 md:last:pr-0">
            <p className="font-display text-base font-semibold tracking-tight text-ink">{f.title}</p>
            <p className="mt-1 text-sm leading-relaxed text-ink-soft">{f.subtitle}</p>
          </motion.li>
        ))}
      </motion.ul>
    </section>
  )
}
