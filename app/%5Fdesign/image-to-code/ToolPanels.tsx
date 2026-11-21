'use client'

// Tabbed tool panel for the image-to-code design pilot.
//
// Reference 03 shows ONE framed panel under two text tabs, with the active
// tab underlined. Both panels are rendered into the DOM and the inactive
// one is hidden with the `hidden` attribute, so the active panel is painted
// on the server and is visible before hydration. There is no animation
// here on purpose - per CLAUDE.md, motion must never own visibility.

import Link from 'next/link'
import { useState } from 'react'

interface Tool {
  name: string
  desc: string
}

interface Tab {
  id: string
  tag: string
  title: string
  tools: Tool[]
  cta: { label: string; href: string }
}

// Copy carried verbatim from components/landing/ToolExplorer.tsx.
const TABS: Tab[] = [
  {
    id: 'people',
    tag: 'HQ People',
    title: 'Answers to your everyday HR questions, in plain English.',
    tools: [
      { name: 'AI Assistant chat', desc: 'Plain-English answers to your everyday people questions.' },
      { name: 'Team register', desc: "A dated record for each person, and a timing check before you end someone's employment." },
      { name: 'A real advisor on call', desc: 'HR365 steps in for the hard calls, with the same person every time.' },
    ],
    cta: { label: 'See HQ People', href: '/product/people' },
  },
  {
    id: 'recruit',
    tag: 'HQ Recruit',
    title: 'Hire the right person, without the hours or the agency fees.',
    tools: [
      { name: 'CV scoring', desc: 'Rank every applicant against the role, the same way.' },
      { name: 'Video + phone pre-screen', desc: 'Candidates answer on their own time, from one link.' },
      { name: 'Shortlist + share', desc: 'Send a clean shortlist straight to the decision maker.' },
      { name: 'Campaign Coach', desc: 'Writes the job ad for you, ready for SEEK.' },
    ],
    cta: { label: 'See HQ Recruit', href: '/product/recruit' },
  },
]

export default function ToolPanels() {
  const [active, setActive] = useState(0)

  return (
    <>
      {/* Text tabs - reference 03 underlines the active one. */}
      <div role="tablist" aria-label="HQ.ai tools" className="mt-10 flex gap-8 border-b border-border">
        {TABS.map((t, i) => {
          const selected = i === active
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              id={`tab-${t.id}`}
              aria-selected={selected}
              aria-controls={`panel-${t.id}`}
              onClick={() => setActive(i)}
              className={[
                '-mb-px border-b-2 pb-3 text-sm font-medium transition-colors',
                selected
                  ? 'border-clay text-ink'
                  : 'border-transparent text-ink-muted hover:text-ink-soft',
              ].join(' ')}
            >
              {t.tag}
            </button>
          )
        })}
      </div>

      {TABS.map((t, i) => (
        <div
          key={t.id}
          role="tabpanel"
          id={`panel-${t.id}`}
          aria-labelledby={`tab-${t.id}`}
          hidden={i !== active}
        >
          {/* ONE container for the whole section - reference 03 frames a
              single panel and puts nothing else inside it but rows. */}
          <div className="mt-10 overflow-hidden rounded-3xl border border-border bg-bg-soft">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border px-6 py-5 md:px-8">
              <p className="max-w-xl font-display text-lg font-semibold tracking-tight text-ink">
                {t.title}
              </p>
              <span className="shrink-0 rounded-full bg-clay px-3 py-1 font-mono text-[11px] uppercase tracking-[0.06em] text-ink-on-clay">
                {t.tag}
              </span>
            </div>

            <dl className="divide-y divide-border">
              {t.tools.map((tool) => (
                <div key={tool.name} className="grid gap-1 px-6 py-5 md:grid-cols-[240px_1fr] md:gap-8 md:px-8">
                  <dt className="font-display text-base font-semibold tracking-tight text-ink">{tool.name}</dt>
                  <dd className="text-sm leading-relaxed text-ink-soft">{tool.desc}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="mt-6">
            <Link
              href={t.cta.href}
              className="text-sm font-medium text-ink underline decoration-border underline-offset-4 transition-colors hover:decoration-ink-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay"
            >
              {t.cta.label}
            </Link>
          </div>
        </div>
      ))}
    </>
  )
}
