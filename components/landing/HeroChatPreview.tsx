// HQ People chat preview - the landing page's "signature moment" from the
// research brief. A transcript of everyday HR questions with their
// answers, the way a real session in the product looks: several unrelated
// things asked in a row and each one answered on the spot.
//
// STATIC, AND SHOWS EVERYTHING AT ONCE - do not turn this back into a
// carousel. Its history, so it does not get relitigated:
//   1. It auto-advanced every 4.8s, which WCAG 2.2.2 treats as moving
//      content needing a pause, stop or hide mechanism once it runs past
//      five seconds. A row of 6px dots was technically that mechanism but
//      is not a pause control anyone recognises, and on touch the card
//      swapped under a reader mid-sentence.
//   2. With the rotation gone the dots were the only way through, so
//      three of the four answers went unseen by anyone who scrolled past
//      - the pitch was hiding its own evidence behind an interaction
//      almost nobody performs.
// Showing the whole transcript fixes both at once. Nov 2026, after the
// Web Interface Guidelines audit - see docs/audits/web-interface-guidelines.md.
//
// Three things follow from being static, and all of them are wins:
//   - No client state, so no 'use client'. The hero's signature element
//     now ships zero JS and server-renders complete, which also puts it
//     permanently out of reach of the blank-hero failure mode CLAUDE.md
//     records (content must never depend on an animation or a frame loop
//     to become visible).
//   - Nothing moves, so there is no prefers-reduced-motion branch to
//     carry.
//   - Every answer is in the DOM for crawlers and for assistive tech,
//     not just the one that happened to be showing.
//
// Height is the live trade-off: this card is the tallest thing in the
// hero's right column. EXCHANGES is the only lever - drop an entry to
// shorten it. Keep the answers short enough to stay about three lines.
//
// Copy rules: Australian English, plain hyphens only, no competitor
// names, ASCII apostrophes. Answers are illustrative and helpful, in
// plain English - not legal advice.

interface Exchange {
  q: string
  a: string
}

// The speed marker that used to sit on every answer now appears once, in
// the footer. Four identical "Answered in seconds" chips in one card read
// as padding rather than proof, and they cost ~130px of hero height.
const EXCHANGES: Exchange[] = [
  {
    q: 'Can I let someone go during probation?',
    a: 'Yes, with notice - usually one week if they have been with you under a year. Your award may add to that - we will flag it.',
  },
  {
    q: 'What notice does a casual get?',
    a: 'A true casual on an irregular basis usually gets none. If the work has become regular and systematic, your award may add to that - we will flag it.',
  },
  {
    q: 'How much annual leave do full-timers accrue?',
    a: 'Four weeks a year, building up from day one - plus an extra week for some shift workers.',
  },
  {
    q: 'Do I have to pay out unused annual leave?',
    a: 'Yes. When someone leaves, their unused annual leave is paid out, at the rate they would have been paid.',
  },
]

export default function HeroChatPreview() {
  return (
    <div
      className="rounded-3xl border border-border bg-bg-elevated p-5 shadow-float"
      role="group"
      aria-label="HQ People - example HR answers"
    >
      <div className="flex items-center gap-2 border-b border-border pb-3">
        <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-accent" />
        <span className="font-mono text-[11px] uppercase tracking-[0.06em] text-ink-muted">HQ People</span>
        <span className="ml-auto inline-flex items-center gap-1 text-[10px] text-ink-muted">
          <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-accent" />
          Live
        </span>
      </div>

      {/* The transcript. An ordered list because the exchanges read as a
          sequence - one session, several questions - and it gives screen
          readers a count up front ("list of 4 items") rather than a wall
          of bubbles. */}
      <ol className="mt-4 space-y-4">
        {EXCHANGES.map((ex) => (
          <li key={ex.q}>
            {/* Question - right-aligned, the visitor's side. */}
            <p className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-tr-sm border border-accent bg-accent-soft px-3 py-2 text-xs text-ink">
              {ex.q}
            </p>
            {/* Answer - left-aligned, the product's side. */}
            <p className="mt-2 w-fit max-w-[92%] rounded-2xl rounded-tl-sm bg-bg px-3 py-2.5 text-xs leading-relaxed text-ink">
              {ex.a}
            </p>
          </li>
        ))}
      </ol>

      {/* One speed marker for the whole transcript. The count is derived so
          it cannot go stale when an exchange is added or removed. */}
      <p className="mt-4 flex items-center gap-1.5 border-t border-border pt-3.5 text-[10px] font-medium text-clay">
        <svg aria-hidden viewBox="0 0 12 12" className="h-3 w-3 shrink-0">
          <circle cx="6" cy="6" r="4.6" fill="none" stroke="currentColor" strokeWidth="1" />
          <path d="M6 3.4V6l1.7 1" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {EXCHANGES.length} questions, answered in seconds
      </p>
    </div>
  )
}
