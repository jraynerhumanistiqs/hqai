// Section 1: hero.
//
// Aug 2026 - keeps hero-26's SHAPE (registry.watermelon.sh/r/hero-26.json):
// a staggered entrance and the closing feature strip, plus an optional
// full-bleed backdrop. What was NOT taken from hero-26: its own nav bar
// (MarketingHeader already owns that, and it is load-bearing - it sets
// data-app="marketing" on <html>), its App Store / Play buttons, and its
// "5 stars, over 3k creators" strip. HQ.ai has no mobile apps and no review
// count to quote, so neither is invented here.
//
// The entrance is CSS, NOT a JS animation library. hero-26 drives its
// reveal through motion variants, which made the hero's visibility depend
// on the frame loop: the copy starts at opacity 0 and is animated up by
// requestAnimationFrame, and rAF does not fire in a background tab. A
// homepage opened in an unfocused tab - cmd-click, "open in new tab",
// session restore - painted a BLANK hero and never recovered when the tab
// was brought forward (measured: still opacity 0 four seconds after
// document.visibilityState flipped to "visible"). CSS animations run on
// the document timeline and `both` fill mode resolves to the end state, so
// the worst case here is a viewer missing the movement, never missing the
// copy. Keyframes live in app/globals.css.
//
// That also makes this a server component again - there is no client state
// left to hold.
//
// The HQ People chat preview is still the star; the HQ Recruit scorecard
// stays a quiet secondary tile beneath it.
//
// Copy rules: Australian English, plain hyphens only, ASCII apostrophes.

import Link from 'next/link'
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

// Stagger, expressed as animation-delay rather than motion's
// staggerChildren. Same cadence: a beat, then ~90ms between elements.
const D = {
  eyebrow: '40ms',
  heading: '130ms',
  preview: '130ms',
  subhead: '220ms',
  cta: '310ms',
  caption: '400ms',
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
  return (
    <section className="relative isolate overflow-hidden" aria-labelledby="hero-heading">
      {backgroundImage && (
        <>
          <img
            src={backgroundImage}
            alt=""
            aria-hidden
            className="hq-hero-backdrop pointer-events-none absolute inset-0 -z-10 h-full w-full object-cover object-center"
          />
          {/* Scrim - the copy has to keep its contrast over any photo. */}
          <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-bg/70" />
        </>
      )}

      <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 pb-14 pt-8 md:grid-cols-[1fr_1.05fr] md:gap-12 md:px-10 md:pb-20 md:pt-12 lg:gap-16">
        {/* Left: copy block.
            relative z-20 lifts this column's stacking context above the
            right-hand preview column. Both columns get a transform from the
            reveal animation, so each is its own stacking context painting in
            DOM order - without this the HQ People card (later in the DOM)
            covers the "busywork off your plate" popover where it opens into
            the gap between the columns. */}
        <div className="relative z-20 max-w-xl">
          <p
            style={{ animationDelay: D.eyebrow }}
            className="hq-hero-rise mb-6 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.06em] text-clay"
          >
            <span aria-hidden className="h-px w-5 bg-clay" />
            Built for Australian small business
          </p>

          <h1
            id="hero-heading"
            style={{ animationDelay: D.heading }}
            className="hq-hero-lead font-display text-[34px] font-semibold leading-[1.06] tracking-[-0.02em] text-ink sm:text-[42px] md:text-[52px]"
          >
            HR and hiring are complicated. HQ.ai makes it{' '}
            <span className="text-clay">easy, quick and accurate.</span>
          </h1>

          <p
            style={{ animationDelay: D.subhead }}
            className="hq-hero-rise mt-6 text-lg leading-relaxed text-ink-soft md:text-xl"
          >
            HQ.ai handles the everyday HR work and hiring processes that cost you time and money. Ask a question, get a clear answer for your business, and get back to work - so the jobs that used to take hours now take minutes. No HR background needed, and a real advisor is there for the hard calls. From $59/month. Cancel any time.
          </p>

          <div
            style={{ animationDelay: D.cta }}
            className="hq-hero-rise mt-9 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-4"
          >
            <Link
              href="/signup"
              className="inline-flex h-12 items-center justify-center rounded-full bg-clay px-7 text-sm font-semibold text-ink-on-accent shadow-card transition-colors hover:bg-clay-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay"
            >
              Get started
            </Link>
          </div>

          <p
            style={{ animationDelay: D.caption }}
            className="hq-hero-rise mt-4 text-sm text-ink-muted"
          >
            Three minutes to set up. Answers from day one.
          </p>
        </div>

        {/* Right: HQ People is the star; HQ Recruit is a quiet secondary tile. */}
        <div style={{ animationDelay: D.preview }} className="hq-hero-rise relative w-full">
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
        </div>
      </div>

      {/* Feature strip - hero-26's closing row, carried over. */}
      <ul className="mx-auto grid max-w-7xl gap-px overflow-hidden border-t border-border px-6 md:grid-cols-3 md:px-10">
        {FEATURES.map((f, i) => (
          <li
            key={f.title}
            style={{ animationDelay: `${480 + i * 90}ms` }}
            className="hq-hero-rise py-6 md:px-6 md:first:pl-0 md:last:pr-0"
          >
            <p className="font-display text-base font-semibold tracking-tight text-ink">{f.title}</p>
            <p className="mt-1 text-sm leading-relaxed text-ink-soft">{f.subtitle}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}
