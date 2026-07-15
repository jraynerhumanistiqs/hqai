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

interface ToolItem {
  name: string
  desc: string
}

interface Tab {
  id: string
  tag: string
  title: string
  desc: string
  bullets: string[]
  tools: ToolItem[]
  cta: { label: string; href: string }
}

const TABS: Tab[] = [
  {
    id: 'people',
    tag: 'HQ People',
    title: 'Answers to any HR question, in plain English. Based on Australian legislation only.',
    desc: 'Ask anything about your staff, pay or the rules. You get the right answer for your business in under a minute, in plain English.',
    bullets: [
      'Clear answers to your everyday HR questions',
      'Drafts every HR document you are likely to need',
      'A real human advisor steps in when it gets tricky',
    ],
    tools: [
      { name: 'AI Assistant chat', desc: 'Plain-English answers to your everyday people questions.' },
      { name: 'AI Administrator', desc: 'Drafts the documents you need - offer letters, contracts, warnings, performance plans, policies - filled in with your details.' },
      { name: 'A real advisor on call', desc: 'HR365 steps in for the hard calls, with the same person every time.' },
    ],
    cta: { label: 'See HQ People', href: '/product/people' },
  },
  {
    id: 'recruit',
    tag: 'HQ Recruit',
    title: 'Hire the right person, without your own time cost or extra spend on agency fees.',
    desc: 'HQ Recruit runs the grunt work of hiring from start to finish - the job ad, sorting applicants, the first interviews and a clean shortlist - so you fill the role faster and back yourself with the right choice, even if hiring is not your day job.',
    bullets: [
      'Score every CV against what the job needs',
      'Video and phone interviews from one link',
      'Every CV scored the same way, with the evidence shown',
    ],
    tools: [
      { name: 'CV scoring', desc: 'Rank every applicant against the role, the same way.' },
      { name: 'Video + phone pre-screen', desc: 'Candidates answer on their own time, from one link.' },
      { name: 'Shortlist + share', desc: 'Send a clean shortlist straight to the decision maker.' },
      { name: 'Campaign Coach', desc: 'Writes the job ad for you, ready for SEEK.' },
    ],
    cta: { label: 'See HQ Recruit', href: '/product/recruit' },
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
    <section id="tools" className="bg-bg py-14 md:py-20" aria-labelledby="tools-heading">
      <div className="mx-auto max-w-6xl px-6 md:px-10">
        <p className="mb-4 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.06em] text-clay">
          <span aria-hidden className="h-px w-5 bg-clay" />
          Explore the tools
        </p>
        <h2
          id="tools-heading"
          className="max-w-3xl font-display text-3xl font-bold leading-tight tracking-tight text-ink md:text-[40px]"
        >
          One login. Everything people and hiring.
        </h2>
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-ink-soft md:text-lg">
          Two tools, one location. Tap through to see each one in action.
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
            <p className="font-mono text-[11px] uppercase tracking-[0.06em] text-ink-muted">{tab.tag}</p>
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

            {/* The key tools in this product, one line each - a lighter
                version of the product page. */}
            <div className="mt-7 rounded-2xl border border-border bg-bg-soft p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
                What is inside
              </p>
              <ul className="mt-3 space-y-2.5">
                {tab.tools.map((t) => (
                  <li key={t.name} className="flex items-start gap-2.5">
                    <Tick />
                    <span className="text-sm leading-snug text-ink-soft">
                      <strong className="font-semibold text-ink">{t.name}.</strong> {t.desc}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <Link
              href={tab.cta.href}
              className="mt-7 inline-flex h-11 items-center justify-center rounded-full border border-ink px-6 text-sm font-semibold text-ink transition-colors hover:bg-bg-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              {tab.cta.label} -&gt;
            </Link>
          </div>

          {/* RIGHT: animated preview (re-keys per tab so it replays) */}
          <div key={`preview-${tab.id}`} className="tool-fade">
            {tab.id === 'people' && <PeoplePreview reduced={reduced} />}
            {tab.id === 'recruit' && <RecruitPreview reduced={reduced} />}
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
            Yes, with notice. Usually one week if they have been with you under a year. Your award may add to that - we will flag it.
          </p>
          <div
            className={[
              'mt-2.5 inline-flex items-center gap-1.5 rounded-full border border-clay bg-clay-soft px-2.5 py-1 text-[10px] font-medium text-clay transition-opacity duration-500',
              phase >= 2 ? 'opacity-100' : 'opacity-0',
            ].join(' ')}
          >
            <svg aria-hidden viewBox="0 0 12 12" className="h-3 w-3">
              <circle cx="6" cy="6" r="4.6" fill="none" stroke="currentColor" strokeWidth="1" />
              <path d="M6 3.4V6l1.7 1" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Answered in seconds
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
              'mt-1 inline-flex rounded-full border border-border bg-bg-soft px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-soft transition-opacity duration-700',
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
                className="h-full rounded-full bg-ink-muted transition-[width] duration-[900ms] ease-out"
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

function Tick() {
  return (
    <svg viewBox="0 0 16 16" className="mt-1 h-3.5 w-3.5 shrink-0 text-ink-soft" aria-hidden>
      <path fill="currentColor" d="M6.2 11.4 3 8.2l1.1-1.1 2.1 2.1 5.7-5.7 1.1 1.1z" />
    </svg>
  )
}
