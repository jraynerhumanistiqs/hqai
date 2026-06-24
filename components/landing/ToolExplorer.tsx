'use client'

// "Explore the tools" - the homepage centerpiece (qase-modelled tabbed
// switcher). Three tabs (HQ People / HQ Recruit / Pay-as-you-go); clicking
// a tab swaps the copy AND an animated in-browser preview. Auto-advances
// slowly to invite exploration, pauses on hover/focus, and honours
// prefers-reduced-motion (no auto-advance, previews render in final state).
//
// Copy rules: Australian English, plain hyphens only, ASCII apostrophes.

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'

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

interface Tab {
  id: string
  tag: string
  title: string
  desc: string
  bullets: string[]
  cta: { label: string; href: string }
}

const TABS: Tab[] = [
  {
    id: 'people',
    tag: 'HQ People',
    title: 'Answers to any HR question, in plain English.',
    desc: 'Ask anything about your staff, pay or the rules. You get the right answer for your business in under a minute - and it shows you the law it used.',
    bullets: [
      'Built on the Fair Work Act and your award',
      'Writes 33 HR documents, filled in with your details',
      'A real human advisor steps in when it gets tricky',
    ],
    cta: { label: 'See HQ People', href: '/product/people' },
  },
  {
    id: 'recruit',
    tag: 'HQ Recruit',
    title: 'Score a pile of CVs in minutes, not hours.',
    desc: 'Set what the job needs and the AI scores every CV the same way, with the proof pulled straight from the page. Then run quick interviews and share a clean shortlist.',
    bullets: [
      'Score every CV against what the job needs',
      'Video and phone interviews from one link',
      'Hides names and photos to keep hiring fair',
    ],
    cta: { label: 'See HQ Recruit', href: '/product/recruit' },
  },
  {
    id: 'payg',
    tag: 'Pay-as-you-go',
    title: 'Just need one document today? From $25.',
    desc: 'No subscription. Pick the document you need, answer a few questions, and it is ready to sign in three minutes.',
    bullets: [
      'One-off HR documents from $25',
      'Done right, with your details filled in',
      'No card needed until it launches',
    ],
    cta: { label: 'See the documents', href: '#marketplace' },
  },
]

const DWELL_MS = 6500

export default function ToolExplorer() {
  const [active, setActive] = useState(0)
  const [paused, setPaused] = useState(false)
  const reduced = usePrefersReducedMotion()
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (reduced || paused) return
    timer.current = setInterval(() => {
      setActive((i) => (i + 1) % TABS.length)
    }, DWELL_MS)
    return () => {
      if (timer.current) clearInterval(timer.current)
    }
  }, [reduced, paused])

  const tab = TABS[active]

  return (
    <section id="tools" className="bg-bg py-20 md:py-28" aria-labelledby="tools-heading">
      <div className="mx-auto max-w-6xl px-6 md:px-10">
        <p className="mb-4 text-xs font-medium uppercase tracking-[0.18em] text-clay">Explore the tools</p>
        <h2
          id="tools-heading"
          className="max-w-3xl font-display text-3xl font-bold leading-tight tracking-tight text-ink md:text-[40px]"
        >
          One login. Everything people and hiring.
        </h2>
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-ink-soft md:text-lg">
          Three tools that share one simple home. Tap through to see each one in action.
        </p>

        {/* Tab bar */}
        <div
          role="tablist"
          aria-label="HQ.ai tools"
          className="mt-10 flex flex-wrap gap-2"
        >
          {TABS.map((t, i) => {
            const selected = i === active
            return (
              <button
                key={t.id}
                role="tab"
                type="button"
                aria-selected={selected}
                aria-controls={`tool-panel-${t.id}`}
                id={`tool-tab-${t.id}`}
                onClick={() => setActive(i)}
                className={[
                  'inline-flex h-11 items-center rounded-full px-5 text-sm font-semibold transition-colors',
                  selected
                    ? 'bg-accent text-ink-on-accent'
                    : 'border border-border text-ink-soft hover:border-ink hover:text-ink',
                ].join(' ')}
              >
                {t.tag}
              </button>
            )
          })}
        </div>

        {/* Panel: copy left, animated preview right */}
        <div
          id={`tool-panel-${tab.id}`}
          role="tabpanel"
          aria-labelledby={`tool-tab-${tab.id}`}
          className="mt-8 grid items-center gap-10 rounded-3xl border border-border bg-bg-elevated p-6 shadow-card md:grid-cols-2 md:gap-14 md:p-10"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocusCapture={() => setPaused(true)}
          onBlurCapture={() => setPaused(false)}
        >
          {/* LEFT: copy (re-keys per tab so it fades on switch) */}
          <div key={tab.id} className="tool-fade">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-clay">{tab.tag}</p>
            <h3 className="mt-3 font-display text-[26px] font-bold leading-snug tracking-tight text-ink md:text-[30px]">
              {tab.title}
            </h3>
            <p className="mt-4 text-[15px] leading-relaxed text-ink-soft">{tab.desc}</p>
            <ul className="mt-6 space-y-3 text-sm text-ink-soft">
              {tab.bullets.map((b) => (
                <li key={b} className="flex items-start gap-3">
                  <Tick />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
            <Link
              href={tab.cta.href}
              className="mt-7 inline-flex h-11 items-center justify-center rounded-full bg-clay px-6 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              {tab.cta.label} -&gt;
            </Link>
          </div>

          {/* RIGHT: animated preview (re-keys per tab so it replays) */}
          <div key={`preview-${tab.id}`} className="tool-fade">
            {tab.id === 'people' && <PeoplePreview reduced={reduced} />}
            {tab.id === 'recruit' && <RecruitPreview reduced={reduced} />}
            {tab.id === 'payg' && <DocPreview reduced={reduced} />}
          </div>
        </div>
      </div>

      <style jsx>{`
        .tool-fade {
          animation: toolFade 420ms ease-out both;
        }
        @keyframes toolFade {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .tool-fade {
            animation: none;
          }
        }
      `}</style>
    </section>
  )
}

/* ---------------------------------------------------------------- previews */

// HQ People - a question, then an answer fades in with a citation chip.
function PeoplePreview({ reduced }: { reduced: boolean }) {
  const [phase, setPhase] = useState(reduced ? 2 : 0)
  useEffect(() => {
    if (reduced) return
    const t1 = setTimeout(() => setPhase(1), 600)
    const t2 = setTimeout(() => setPhase(2), 1400)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [reduced])

  return (
    <div className="rounded-3xl border border-border bg-bg-elevated p-5 shadow-float">
      <div className="flex items-center gap-2 border-b border-border pb-3">
        <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-accent" />
        <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-ink-muted">HQ People</span>
        <span className="ml-auto inline-flex items-center gap-1 text-[10px] text-ink-muted">
          <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-accent" />
          Live
        </span>
      </div>
      <div className="mt-4 min-h-[188px]">
        <div className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-tr-sm border border-accent bg-accent-soft px-3 py-2 text-xs text-ink">
          Can I let someone go during probation?
        </div>
        <div
          className={[
            'mt-2 w-fit max-w-[92%] rounded-2xl rounded-tl-sm bg-bg px-3 py-2.5 transition-all duration-500',
            phase >= 1 ? 'opacity-100' : 'translate-y-1 opacity-0',
          ].join(' ')}
        >
          <p className="text-xs leading-relaxed text-ink">
            Yes, with notice. Usually one week if they have been with you under a year. Check your award for anything extra.
          </p>
          <div
            className={[
              'mt-2.5 inline-flex items-center gap-1.5 rounded-full border border-clay bg-clay-soft px-2.5 py-1 text-[10px] font-medium text-clay transition-opacity duration-500',
              phase >= 2 ? 'opacity-100' : 'opacity-0',
            ].join(' ')}
          >
            <svg aria-hidden viewBox="0 0 12 12" className="h-3 w-3">
              <path fill="currentColor" d="M6 1l1.5 3 3.3.5-2.4 2.3.6 3.3L6 8.5l-3 1.6.6-3.3L1.2 4.5l3.3-.5z" />
            </svg>
            Cited: s 117 Fair Work Act 2009
          </div>
        </div>
      </div>
    </div>
  )
}

// HQ Recruit - a CV scorecard whose bars fill on mount.
function RecruitPreview({ reduced }: { reduced: boolean }) {
  const rows = [
    { label: 'Relevant experience', score: 86 },
    { label: 'Communication', score: 80 },
    { label: 'Role fit', score: 74 },
  ]
  const [fill, setFill] = useState(reduced)
  useEffect(() => {
    if (reduced) return
    const t = setTimeout(() => setFill(true), 80)
    return () => clearTimeout(t)
  }, [reduced])

  return (
    <div className="rounded-3xl border border-border bg-bg-elevated p-5 shadow-float md:p-6">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-ink-muted">Candidate scorecard</p>
          <p className="mt-1 font-display text-xl font-bold tracking-tight text-ink">Daniel M.</p>
        </div>
        <div className="text-right">
          <p className="font-display text-3xl font-bold tracking-tight text-ink">
            4.2<span className="text-base font-normal text-ink-muted"> / 5</span>
          </p>
          <span
            className={[
              'mt-1 inline-flex rounded-full border border-clay bg-clay-soft px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-clay transition-opacity duration-700',
              fill ? 'opacity-100' : 'opacity-0',
            ].join(' ')}
          >
            Strong yes
          </span>
        </div>
      </div>
      <div className="mt-6 space-y-4">
        {rows.map((row) => (
          <div key={row.label}>
            <div className="flex items-center justify-between text-xs text-ink-soft">
              <span className="font-medium text-ink">{row.label}</span>
              <span className="tabular-nums">{row.score}</span>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-bg-soft">
              <div
                className="h-full rounded-full bg-clay transition-[width] duration-[900ms] ease-out"
                style={{ width: fill ? `${row.score}%` : '0%' }}
              />
            </div>
          </div>
        ))}
      </div>
      <p className="mt-5 text-xs italic leading-relaxed text-ink-muted">
        &ldquo;7 years running a 12-person front-of-house team.&rdquo;
      </p>
    </div>
  )
}

// Pay-as-you-go - a letter that builds line by line, then a ready stamp.
function DocPreview({ reduced }: { reduced: boolean }) {
  const lines = [
    { w: 'w-2/5', strong: true },
    { w: 'w-full' },
    { w: 'w-11/12' },
    { w: 'w-4/5' },
    { w: 'w-full' },
    { w: 'w-3/5' },
  ]
  const [shown, setShown] = useState(reduced ? lines.length : 0)
  const [stamp, setStamp] = useState(reduced)
  useEffect(() => {
    if (reduced) return
    let n = 0
    const iv = setInterval(() => {
      n += 1
      setShown(n)
      if (n >= lines.length) {
        clearInterval(iv)
        setTimeout(() => setStamp(true), 350)
      }
    }, 260)
    return () => clearInterval(iv)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced])

  return (
    <div className="relative rounded-3xl border border-border bg-bg-elevated p-5 shadow-float md:p-6">
      <div className="flex items-center gap-2 border-b border-border pb-3">
        <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-accent" />
        <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-ink-muted">Letter of Offer</span>
        <span className="ml-auto text-[11px] font-semibold text-clay">from $25</span>
      </div>

      {/* Document sheet */}
      <div className="mt-4 min-h-[196px] rounded-2xl bg-bg p-4">
        <div className="space-y-2.5">
          {lines.map((l, i) => (
            <div
              key={i}
              className={[
                'h-2.5 rounded-full transition-all duration-300',
                l.w,
                l.strong ? 'bg-ink/70' : 'bg-ink/20',
                i < shown ? 'opacity-100' : 'opacity-0',
              ].join(' ')}
            />
          ))}
        </div>
      </div>

      {/* Ready stamp */}
      <div
        className={[
          'mt-4 inline-flex items-center gap-1.5 rounded-full border border-clay bg-clay-soft px-3 py-1 text-[11px] font-semibold text-clay transition-all duration-500',
          stamp ? 'opacity-100' : 'translate-y-1 opacity-0',
        ].join(' ')}
      >
        <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden>
          <path fill="currentColor" d="M6.2 11.4 3 8.2l1.1-1.1 2.1 2.1 5.7-5.7 1.1 1.1z" />
        </svg>
        Ready to sign
      </div>
    </div>
  )
}

function Tick() {
  return (
    <svg viewBox="0 0 16 16" className="mt-1 h-3.5 w-3.5 shrink-0 text-clay" aria-hidden>
      <path fill="currentColor" d="M6.2 11.4 3 8.2l1.1-1.1 2.1 2.1 5.7-5.7 1.1 1.1z" />
    </svg>
  )
}
