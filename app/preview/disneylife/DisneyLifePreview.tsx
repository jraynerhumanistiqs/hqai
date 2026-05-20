'use client'

// Disney Life palette - design notes extracted from the founder's PSD:
//
//   coral  #F3576E   primary panels + primary CTA accent
//   blush  #F8A5B0   soft tint
//   sun    #FFD93D   secondary panel + highlight pill
//   sky    #4FB9D8   nav + accent
//   mint   #9DD984   tertiary panel
//   cream  #FAFAF5   page bg under coloured panels
//   ink    #2D2E33   primary text + heavy headlines
//   slate  #6F7280   secondary text
//
// Typography is heavy / geometric / friendly. Inter Bold at 700-800
// gets us 80% of the way there; the headline rhythm uses tighter
// tracking + larger size to match the PSD's bold-sans feel.
//
// All colour values live as local CSS variables on the section root
// so the rest of the app (and the live dashboard) cannot see them.
// Tailwind arbitrary classes reference these CSS vars rather than
// global tokens.

import Link from 'next/link'
import { useState } from 'react'

const PALETTE: Record<string, string> = {
  '--dl-coral': '#F3576E',
  '--dl-blush': '#F8A5B0',
  '--dl-sun':   '#FFD93D',
  '--dl-sky':   '#4FB9D8',
  '--dl-mint':  '#9DD984',
  '--dl-cream': '#FAFAF5',
  '--dl-ink':   '#2D2E33',
  '--dl-slate': '#6F7280',
}

export default function DisneyLifePreview() {
  const [active, setActive] = useState<'people' | 'recruit' | 'docs' | 'settings'>('people')

  return (
    <div
      className="min-h-screen w-full"
      style={{ ...(PALETTE as React.CSSProperties), background: 'var(--dl-cream)' }}
    >
      <PreviewBanner />

      {/* App shell - sidebar left, surface right */}
      <div className="mx-auto flex max-w-[1320px] gap-6 px-6 py-8">
        <Sidebar active={active} onSelect={setActive} />

        <main className="flex-1 space-y-8 pb-20">
          <TopBar />

          <HeroBand />

          <KpiStrip />

          {/* Two-column: AI advisor chat + CV scorecard */}
          <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <AdvisorCard />
            <ScorecardCard />
          </section>

          <DocumentsTable />

          <PricingPreview />

          <ButtonGallery />

          <TokenLegend />
        </main>
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────
// Banner
// ──────────────────────────────────────────────────────────────────
function PreviewBanner() {
  return (
    <div
      className="border-b border-black/5 px-6 py-3"
      style={{ background: 'var(--dl-ink)', color: 'white' }}
    >
      <div className="mx-auto flex max-w-[1320px] items-center justify-between gap-4">
        <p className="text-xs font-bold uppercase tracking-[0.18em]">
          Theme preview - Disney Life palette
        </p>
        <p className="text-[11px] opacity-70">
          Sandbox only. Live dashboard is unchanged. Compare against{' '}
          <Link href="/dashboard" className="underline">/dashboard</Link>.
        </p>
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────
// Sidebar - coral panel, pill nav
// ──────────────────────────────────────────────────────────────────
function Sidebar({
  active,
  onSelect,
}: {
  active: 'people' | 'recruit' | 'docs' | 'settings'
  onSelect: (k: 'people' | 'recruit' | 'docs' | 'settings') => void
}) {
  const items: Array<{ key: typeof active; label: string }> = [
    { key: 'people',   label: 'HQ People' },
    { key: 'recruit',  label: 'HQ Recruit' },
    { key: 'docs',     label: 'My Documents' },
    { key: 'settings', label: 'Settings' },
  ]
  return (
    <aside
      className="hidden w-[240px] shrink-0 rounded-[28px] p-5 lg:block"
      style={{ background: 'var(--dl-coral)', color: 'white' }}
    >
      <p className="px-2 font-extrabold tracking-tight" style={{ fontSize: 22, letterSpacing: '-0.02em' }}>
        HQ.ai
      </p>
      <p className="mt-1 px-2 text-[11px] uppercase tracking-[0.16em] opacity-80">Workspace</p>

      <nav className="mt-7 space-y-1.5">
        {items.map((it) => {
          const isActive = it.key === active
          return (
            <button
              key={it.key}
              type="button"
              onClick={() => onSelect(it.key)}
              className="flex w-full items-center justify-between rounded-full px-4 py-2.5 text-left text-[13px] font-bold transition-colors"
              style={{
                background: isActive ? 'white' : 'transparent',
                color: isActive ? 'var(--dl-coral)' : 'white',
              }}
            >
              <span>{it.label}</span>
              {isActive && <span aria-hidden>•</span>}
            </button>
          )
        })}
      </nav>

      <div
        className="mt-8 rounded-2xl p-4 text-[12px] leading-snug"
        style={{ background: 'rgba(255,255,255,0.18)' }}
      >
        <p className="font-bold">Need more specific support from a human?</p>
        <button
          type="button"
          className="mt-3 inline-flex items-center justify-center rounded-full px-4 py-1.5 text-[12px] font-bold"
          style={{ background: 'white', color: 'var(--dl-coral)' }}
        >
          Contact HQ Advisor
        </button>
      </div>

      <p className="mt-6 px-2 text-[10px] uppercase tracking-[0.14em] opacity-70">v0.4 preview</p>
    </aside>
  )
}

// ──────────────────────────────────────────────────────────────────
// Top bar - search + plan chip
// ──────────────────────────────────────────────────────────────────
function TopBar() {
  return (
    <div className="flex flex-wrap items-center gap-4">
      <div
        className="flex h-11 flex-1 items-center gap-3 rounded-full bg-white px-5 shadow-[0_2px_8px_rgba(45,46,51,0.06)]"
        style={{ color: 'var(--dl-slate)' }}
      >
        <svg viewBox="0 0 16 16" className="h-4 w-4" aria-hidden><circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" fill="none" /><path d="M11 11l3.5 3.5" stroke="currentColor" strokeWidth="1.5" /></svg>
        <span className="text-[13px]">Ask anything - "What notice for casual"</span>
      </div>
      <span
        className="inline-flex h-9 items-center rounded-full px-4 text-[11px] font-bold uppercase tracking-[0.14em]"
        style={{ background: 'var(--dl-sun)', color: 'var(--dl-ink)' }}
      >
        Growth plan - 6 seats
      </span>
      <button
        type="button"
        className="inline-flex h-11 items-center rounded-full px-5 text-[13px] font-bold text-white"
        style={{ background: 'var(--dl-coral)' }}
      >
        + New document
      </button>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────
// Hero band - the "bold colour ribbon" moment from the PSD
// ──────────────────────────────────────────────────────────────────
function HeroBand() {
  return (
    <section
      className="overflow-hidden rounded-[32px] shadow-[0_8px_24px_rgba(45,46,51,0.08)]"
      style={{ background: 'white' }}
    >
      <div className="grid gap-0 md:grid-cols-[1.2fr_1fr]">
        {/* Left: copy column on cream */}
        <div className="p-8 md:p-10" style={{ background: 'var(--dl-cream)' }}>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--dl-coral)' }}>
            Good morning, James
          </p>
          <h1 className="mt-3 font-extrabold tracking-tight" style={{ color: 'var(--dl-ink)', fontSize: 36, lineHeight: 1.08 }}>
            Two decisions away from a faster Friday.
          </h1>
          <p className="mt-4 max-w-md text-[15px] leading-relaxed" style={{ color: 'var(--dl-slate)' }}>
            You have 3 candidates pending review and 1 unfinished letter of offer.
            Knock both over before lunch.
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <button
              type="button"
              className="inline-flex h-11 items-center rounded-full px-6 text-[13px] font-bold text-white"
              style={{ background: 'var(--dl-coral)' }}
            >
              Open pending CV reviews
            </button>
            <button
              type="button"
              className="inline-flex h-11 items-center rounded-full border-2 px-6 text-[13px] font-bold"
              style={{ borderColor: 'var(--dl-ink)', color: 'var(--dl-ink)', background: 'transparent' }}
            >
              Finish the letter of offer
            </button>
          </div>
        </div>

        {/* Right: bold colour tile collage */}
        <div className="relative grid grid-cols-2 gap-0">
          <div className="flex flex-col justify-between p-7" style={{ background: 'var(--dl-sky)', color: 'white' }}>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] opacity-90">HQ People</p>
            <p className="text-[40px] font-extrabold leading-none">12</p>
            <p className="text-[12px] font-semibold opacity-95">advisor questions this week</p>
          </div>
          <div className="flex flex-col justify-between p-7" style={{ background: 'var(--dl-sun)', color: 'var(--dl-ink)' }}>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em]">HQ Recruit</p>
            <p className="text-[40px] font-extrabold leading-none">38</p>
            <p className="text-[12px] font-semibold">CVs scored</p>
          </div>
          <div className="col-span-2 flex items-center justify-between gap-3 p-7" style={{ background: 'var(--dl-mint)', color: 'var(--dl-ink)' }}>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em]">This month</p>
              <p className="mt-2 text-[20px] font-extrabold leading-tight">8 hrs back. $720 saved.</p>
            </div>
            <button
              type="button"
              className="inline-flex h-9 items-center rounded-full bg-white px-4 text-[12px] font-bold"
              style={{ color: 'var(--dl-ink)' }}
            >
              See the maths
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}

// ──────────────────────────────────────────────────────────────────
// Three big KPI cards
// ──────────────────────────────────────────────────────────────────
function KpiStrip() {
  const cards = [
    { label: 'Hours back this month', value: '12.4', tone: 'sky',   foot: '+2.1 vs last month' },
    { label: 'Documents drafted',     value: '38',   tone: 'sun',   foot: '8 letters of offer, 4 PIPs' },
    { label: 'Advisor handoffs',      value: '3',    tone: 'mint',  foot: 'Avg response 14 minutes' },
  ] as const

  const bg = (t: typeof cards[number]['tone']) => ({
    sky:  'var(--dl-sky)',
    sun:  'var(--dl-sun)',
    mint: 'var(--dl-mint)',
  })[t]
  const fg = (t: typeof cards[number]['tone']) => (t === 'sky' ? 'white' : 'var(--dl-ink)')

  return (
    <section className="grid gap-5 md:grid-cols-3">
      {cards.map((c) => (
        <div
          key={c.label}
          className="rounded-[24px] p-7 shadow-[0_6px_18px_rgba(45,46,51,0.08)]"
          style={{ background: bg(c.tone), color: fg(c.tone) }}
        >
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] opacity-90">{c.label}</p>
          <p className="mt-4 font-extrabold leading-none" style={{ fontSize: 56 }}>{c.value}</p>
          <p className="mt-4 text-[12px] font-semibold opacity-95">{c.foot}</p>
        </div>
      ))}
    </section>
  )
}

// ──────────────────────────────────────────────────────────────────
// AI Advisor preview card
// ──────────────────────────────────────────────────────────────────
function AdvisorCard() {
  return (
    <article className="rounded-[24px] bg-white p-7 shadow-[0_6px_18px_rgba(45,46,51,0.08)]">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--dl-coral)' }}>HQ People</p>
          <h2 className="mt-1 text-[22px] font-extrabold" style={{ color: 'var(--dl-ink)' }}>Your AI Advisor</h2>
        </div>
        <span
          className="inline-flex h-7 items-center rounded-full px-3 text-[10px] font-bold uppercase tracking-[0.14em]"
          style={{ background: 'var(--dl-mint)', color: 'var(--dl-ink)' }}
        >
          Live - cites every answer
        </span>
      </header>

      <div className="mt-6 space-y-3">
        <Bubble side="user" tone="cream">What notice do I owe a casual who's been weekly for 14 months?</Bubble>
        <Bubble side="ai" tone="sky">
          A regular and systematic casual of 14 months is likely owed notice under the Award. The Modern Award for hospitality sets minimum notice based on length of continuous service.
        </Bubble>
        <div className="ml-auto flex max-w-[420px] items-center gap-2 self-end">
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold"
            style={{ background: 'var(--dl-blush)', color: 'var(--dl-ink)' }}
          >
            <svg viewBox="0 0 12 12" className="h-3 w-3" aria-hidden><path fill="currentColor" d="M6 1l1.4 3 3.3.5-2.4 2.3.5 3.3L6 8.5l-3 1.6.6-3.3L1.2 4.5l3.3-.5z" /></svg>
            Cited: cl 17, Hospitality Industry Award
          </span>
        </div>
      </div>

      <div
        className="mt-6 flex items-center gap-3 rounded-full bg-white p-2"
        style={{ border: '2px solid var(--dl-ink)' }}
      >
        <input
          type="text"
          placeholder="Ask the next question..."
          className="flex-1 bg-transparent px-3 text-[13px] outline-none"
          style={{ color: 'var(--dl-ink)' }}
          readOnly
        />
        <button
          type="button"
          className="inline-flex h-9 items-center rounded-full px-5 text-[12px] font-bold text-white"
          style={{ background: 'var(--dl-coral)' }}
        >
          Send
        </button>
      </div>
    </article>
  )
}

function Bubble({
  side,
  tone,
  children,
}: {
  side: 'user' | 'ai'
  tone: 'cream' | 'sky' | 'sun'
  children: React.ReactNode
}) {
  const bg = { cream: 'var(--dl-cream)', sky: 'var(--dl-sky)', sun: 'var(--dl-sun)' }[tone]
  const color = tone === 'sky' ? 'white' : 'var(--dl-ink)'
  const alignment = side === 'user' ? 'self-end ml-auto' : ''
  return (
    <div className={`flex max-w-[460px] ${alignment}`}>
      <p
        className="rounded-[20px] px-4 py-3 text-[13px] leading-relaxed"
        style={{ background: bg, color }}
      >
        {children}
      </p>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────
// CV Scorecard preview
// ──────────────────────────────────────────────────────────────────
function ScorecardCard() {
  return (
    <article className="rounded-[24px] bg-white p-7 shadow-[0_6px_18px_rgba(45,46,51,0.08)]">
      <header className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--dl-coral)' }}>HQ Recruit</p>
          <h2 className="mt-1 text-[22px] font-extrabold" style={{ color: 'var(--dl-ink)' }}>Sarah K.</h2>
          <p className="text-[12px]" style={{ color: 'var(--dl-slate)' }}>Senior bookkeeper - scored v2</p>
        </div>
        <div className="text-right">
          <p className="text-[44px] font-extrabold leading-none" style={{ color: 'var(--dl-ink)' }}>4.2</p>
          <span
            className="mt-2 inline-flex items-center rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white"
            style={{ background: 'var(--dl-mint)' }}
          >
            Strong yes
          </span>
        </div>
      </header>

      <div className="mt-6 space-y-3.5">
        {[
          { label: 'Relevant experience', score: 88, tone: 'sky' as const },
          { label: 'Communication',       score: 82, tone: 'sun' as const },
          { label: 'Role fit',            score: 74, tone: 'mint' as const },
        ].map((row) => (
          <div key={row.label}>
            <div className="flex items-center justify-between text-[12px] font-semibold" style={{ color: 'var(--dl-slate)' }}>
              <span>{row.label}</span>
              <span style={{ color: 'var(--dl-ink)' }}>{row.score} / 100</span>
            </div>
            <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full" style={{ background: 'var(--dl-cream)' }}>
              <div className="h-full rounded-full" style={{ width: `${row.score}%`, background: `var(--dl-${row.tone})` }} />
            </div>
          </div>
        ))}
      </div>

      <p
        className="mt-6 rounded-2xl px-4 py-3 text-[12px] italic leading-relaxed"
        style={{ background: 'var(--dl-cream)', color: 'var(--dl-ink)' }}
      >
        &ldquo;Led the AP/AR function for a 60-staff hospitality group, owning month-end and BAS.&rdquo;
        <span className="not-italic" style={{ color: 'var(--dl-slate)' }}> - from CV</span>
      </p>

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          className="inline-flex h-10 items-center rounded-full px-5 text-[12px] font-bold text-white"
          style={{ background: 'var(--dl-coral)' }}
        >
          Send to Shortlist Agent
        </button>
        <button
          type="button"
          className="inline-flex h-10 items-center rounded-full border-2 px-5 text-[12px] font-bold"
          style={{ borderColor: 'var(--dl-ink)', color: 'var(--dl-ink)' }}
        >
          Download summary
        </button>
      </div>
    </article>
  )
}

// ──────────────────────────────────────────────────────────────────
// Documents table
// ──────────────────────────────────────────────────────────────────
function DocumentsTable() {
  const rows = [
    { title: 'Letter of Offer - Sarah K.',     type: 'Offer',       date: '2026-05-19', status: 'Final' },
    { title: 'PIP - Daniel M.',                type: 'Performance', date: '2026-05-17', status: 'Draft' },
    { title: 'Reference Check - Ben S.',       type: 'Recruit',     date: '2026-05-15', status: 'Sent' },
    { title: 'First-and-Final Warning - Joel', type: 'Warning',     date: '2026-05-13', status: 'Final' },
  ]
  const statusColour = (s: string) =>
    s === 'Final' ? { bg: 'var(--dl-mint)', fg: 'var(--dl-ink)' }
    : s === 'Sent' ? { bg: 'var(--dl-sky)',  fg: 'white' }
    : { bg: 'var(--dl-sun)', fg: 'var(--dl-ink)' }

  return (
    <section className="rounded-[24px] bg-white p-7 shadow-[0_6px_18px_rgba(45,46,51,0.08)]">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--dl-coral)' }}>My Documents</p>
          <h2 className="mt-1 text-[22px] font-extrabold" style={{ color: 'var(--dl-ink)' }}>Recently generated</h2>
        </div>
        <button
          type="button"
          className="inline-flex h-9 items-center rounded-full px-4 text-[12px] font-bold"
          style={{ background: 'var(--dl-cream)', color: 'var(--dl-ink)' }}
        >
          View all
        </button>
      </div>

      <div className="mt-5 overflow-hidden rounded-2xl" style={{ background: 'var(--dl-cream)' }}>
        <table className="w-full text-[13px]">
          <thead>
            <tr className="text-[11px] font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--dl-slate)' }}>
              <th className="px-5 py-3 text-left">Title</th>
              <th className="px-5 py-3 text-left">Type</th>
              <th className="px-5 py-3 text-left">Date</th>
              <th className="px-5 py-3 text-left">Status</th>
              <th className="px-5 py-3 text-right"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const c = statusColour(r.status)
              return (
                <tr key={r.title} className="border-t" style={{ borderColor: 'rgba(45,46,51,0.06)', background: 'white' }}>
                  <td className="px-5 py-4 font-bold" style={{ color: 'var(--dl-ink)' }}>{r.title}</td>
                  <td className="px-5 py-4" style={{ color: 'var(--dl-slate)' }}>{r.type}</td>
                  <td className="px-5 py-4" style={{ color: 'var(--dl-slate)' }}>{r.date}</td>
                  <td className="px-5 py-4">
                    <span className="inline-flex items-center rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em]" style={{ background: c.bg, color: c.fg }}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <button
                      type="button"
                      className="inline-flex h-8 items-center rounded-full px-3 text-[11px] font-bold"
                      style={{ border: '2px solid var(--dl-ink)', color: 'var(--dl-ink)' }}
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}

// ──────────────────────────────────────────────────────────────────
// Pricing preview - testing the existing tier shape in this palette
// ──────────────────────────────────────────────────────────────────
function PricingPreview() {
  const tiers = [
    { name: 'Essentials', price: '$99',  features: ['3 seats', 'AI advisor + 33 templates'],          highlighted: false, tone: 'cream' },
    { name: 'Growth',     price: '$199', features: ['6 seats', 'CV scoring + video screens'],          highlighted: true,  tone: 'coral' },
    { name: 'Scale',      price: '$379', features: ['12 seats', 'Priority advisor handoff'],           highlighted: false, tone: 'cream' },
  ] as const

  return (
    <section className="rounded-[24px] bg-white p-7 shadow-[0_6px_18px_rgba(45,46,51,0.08)]">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--dl-coral)' }}>Plan</p>
      <h2 className="mt-1 text-[22px] font-extrabold" style={{ color: 'var(--dl-ink)' }}>Three plans. One product.</h2>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {tiers.map((t) => {
          const bg = t.highlighted ? 'var(--dl-coral)' : 'var(--dl-cream)'
          const fg = t.highlighted ? 'white' : 'var(--dl-ink)'
          const labelFg = t.highlighted ? 'rgba(255,255,255,0.85)' : 'var(--dl-slate)'
          return (
            <article key={t.name} className="rounded-2xl p-6" style={{ background: bg, color: fg }}>
              <div className="flex items-baseline justify-between">
                <h3 className="text-[20px] font-extrabold">{t.name}</h3>
                {t.highlighted && (
                  <span className="rounded-full bg-white px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--dl-coral)' }}>
                    Popular
                  </span>
                )}
              </div>
              <p className="mt-3 text-[32px] font-extrabold leading-none">
                {t.price}<span className="ml-1 text-[14px] font-semibold" style={{ color: labelFg }}>/month</span>
              </p>
              <ul className="mt-5 space-y-2 text-[13px]" style={{ color: labelFg }}>
                {t.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <svg viewBox="0 0 16 16" className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden><path fill="currentColor" d="M6.2 11.4 3 8.2l1.1-1.1 2.1 2.1 5.7-5.7 1.1 1.1z" /></svg>
                    {f}
                  </li>
                ))}
              </ul>
              <button
                type="button"
                className="mt-6 inline-flex h-10 w-full items-center justify-center rounded-full text-[12px] font-bold"
                style={
                  t.highlighted
                    ? { background: 'white', color: 'var(--dl-coral)' }
                    : { background: 'var(--dl-ink)', color: 'white' }
                }
              >
                Start the 14-day trial
              </button>
            </article>
          )
        })}
      </div>
    </section>
  )
}

// ──────────────────────────────────────────────────────────────────
// Button gallery - quick visual reference of every CTA state
// ──────────────────────────────────────────────────────────────────
function ButtonGallery() {
  return (
    <section className="rounded-[24px] bg-white p-7 shadow-[0_6px_18px_rgba(45,46,51,0.08)]">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--dl-coral)' }}>Button gallery</p>
      <h2 className="mt-1 text-[22px] font-extrabold" style={{ color: 'var(--dl-ink)' }}>Every CTA you&apos;ll see</h2>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <button type="button" className="inline-flex h-11 items-center justify-center rounded-full px-6 text-[13px] font-bold text-white" style={{ background: 'var(--dl-coral)' }}>
          Primary action
        </button>
        <button type="button" className="inline-flex h-11 items-center justify-center rounded-full border-2 px-6 text-[13px] font-bold" style={{ borderColor: 'var(--dl-ink)', color: 'var(--dl-ink)' }}>
          Secondary action
        </button>
        <button type="button" className="inline-flex h-11 items-center justify-center rounded-full px-6 text-[13px] font-bold" style={{ background: 'var(--dl-sun)', color: 'var(--dl-ink)' }}>
          Highlight pill (e.g. plan chip)
        </button>
        <button type="button" className="inline-flex h-11 items-center justify-center rounded-full px-6 text-[13px] font-bold" style={{ background: 'var(--dl-ink)', color: 'white' }}>
          Dark action (high contrast)
        </button>
        <button type="button" className="inline-flex h-9 items-center justify-center rounded-full px-4 text-[12px] font-bold" style={{ background: 'var(--dl-cream)', color: 'var(--dl-ink)' }}>
          Quiet pill
        </button>
        <button type="button" disabled className="inline-flex h-11 items-center justify-center rounded-full px-6 text-[13px] font-bold text-white opacity-50" style={{ background: 'var(--dl-coral)' }}>
          Disabled primary
        </button>
      </div>
    </section>
  )
}

// ──────────────────────────────────────────────────────────────────
// Token legend - so the founder can see exactly what's on the board
// ──────────────────────────────────────────────────────────────────
function TokenLegend() {
  const swatches: Array<{ name: string; hex: string; text: string }> = [
    { name: 'coral', hex: '#F3576E', text: 'white' },
    { name: 'blush', hex: '#F8A5B0', text: '#2D2E33' },
    { name: 'sun',   hex: '#FFD93D', text: '#2D2E33' },
    { name: 'sky',   hex: '#4FB9D8', text: 'white' },
    { name: 'mint',  hex: '#9DD984', text: '#2D2E33' },
    { name: 'cream', hex: '#FAFAF5', text: '#2D2E33' },
    { name: 'ink',   hex: '#2D2E33', text: 'white' },
    { name: 'slate', hex: '#6F7280', text: 'white' },
  ]
  return (
    <section className="rounded-[24px] bg-white p-7 shadow-[0_6px_18px_rgba(45,46,51,0.08)]">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--dl-coral)' }}>Tokens</p>
      <h2 className="mt-1 text-[22px] font-extrabold" style={{ color: 'var(--dl-ink)' }}>Disney Life palette - 8 tokens</h2>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {swatches.map((s) => (
          <div key={s.name} className="rounded-2xl p-4" style={{ background: s.hex, color: s.text }}>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em]">{s.name}</p>
            <p className="mt-1 text-[14px] font-bold tabular-nums">{s.hex}</p>
          </div>
        ))}
      </div>

      <p className="mt-5 text-[12px]" style={{ color: 'var(--dl-slate)' }}>
        Typography: Inter at 700-800 for headlines, 600 for labels, 400-500 for body.
        Tracking tighter than the current product theme. Rounded corners 16px (cards), 24px (hero), 9999px (pills).
      </p>
    </section>
  )
}
