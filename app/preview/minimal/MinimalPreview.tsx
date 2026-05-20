'use client'

// "Premium minimal" palette - Apple-store inspired, lifted from the
// Sketch kit the founder uploaded.
//
// The design language at a glance:
//   - White-first surfaces. Off-white only as a discrete section break.
//   - Big, confident headline typography (Fraunces serif at 40-72px for
//     hero moments; Inter Bold 600-700 for everything else).
//   - Generous vertical rhythm. Sections at 96-128px padding.
//   - Cards: pure white background, hairline 1px border in faint ink,
//     subtle drop shadow only on hover.
//   - Accents used SPARINGLY. The kit reserves bold colour for a single
//     "moment" per section (one CTA, one banded panel, one chip). The
//     rest is black / white / grey.
//   - Forms favour underline-only inputs (no boxy borders).
//   - Primary CTA is Ink-on-white; the brand's Clay shows up only on
//     the one product moment per page that needs a colour signal.
//
// Tokens live as local CSS variables on the section root - never global.

import Link from 'next/link'
import { useState } from 'react'

const PALETTE: Record<string, string> = {
  '--mn-bg':       '#FFFFFF', // primary surface
  '--mn-bg-soft':  '#F7F7F2', // section break, subtle cards
  '--mn-ink':      '#111111', // body + headlines
  '--mn-ink-soft': '#4D4D4D', // body text 2
  '--mn-muted':    '#9A9A99', // labels, placeholders
  '--mn-line':     '#E6E5E0', // hairlines, dividers
  '--mn-clay':     '#D97757', // brand accent (one moment per section)
  '--mn-clay-wash':'#F5E5DD', // soft tint of clay for chip / fill
  '--mn-sand':     '#EFEDE5', // surface for secondary chips
}

export default function MinimalPreview() {
  const [tier, setTier] = useState<'essentials' | 'growth' | 'scale'>('growth')

  return (
    <div
      className="min-h-screen w-full"
      style={{ ...(PALETTE as React.CSSProperties), background: 'var(--mn-bg)', color: 'var(--mn-ink)' }}
    >
      <PreviewBanner />

      <div className="mx-auto flex max-w-[1320px] gap-12 px-8 py-10">
        <Sidebar />

        <main className="flex-1 space-y-24 pb-32">
          <TopBar />
          <Hero />
          <KpiRow />
          <section className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
            <AdvisorCard />
            <ScorecardCard />
          </section>
          <DocumentsBlock />
          <PricingBlock tier={tier} onSelect={setTier} />
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
      className="border-b px-8 py-3"
      style={{ background: 'var(--mn-ink)', color: 'white', borderColor: 'transparent' }}
    >
      <div className="mx-auto flex max-w-[1320px] items-center justify-between gap-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em]">
          Theme preview - premium minimal
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
// Sidebar - white, hairline divider, ink pill active state
// ──────────────────────────────────────────────────────────────────
function Sidebar() {
  const groups = [
    {
      label: 'Workspace',
      items: [
        { name: 'Overview',     active: true  },
        { name: 'HQ People',    active: false },
        { name: 'HQ Recruit',   active: false },
        { name: 'My Documents', active: false },
      ],
    },
    {
      label: 'Account',
      items: [
        { name: 'Settings',     active: false },
        { name: 'Billing',      active: false },
      ],
    },
  ]
  return (
    <aside
      className="sticky top-10 hidden h-fit w-[220px] shrink-0 lg:block"
      style={{ borderRight: '1px solid var(--mn-line)' }}
    >
      <div className="pr-8">
        <p className="font-extrabold tracking-tight" style={{ fontSize: 22, letterSpacing: '-0.02em' }}>
          HQ.ai
        </p>

        <nav className="mt-10 space-y-7">
          {groups.map((g) => (
            <div key={g.label}>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--mn-muted)' }}>
                {g.label}
              </p>
              <ul className="mt-3 space-y-0.5">
                {g.items.map((it) => (
                  <li key={it.name}>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between rounded-full px-3 py-1.5 text-left text-[13px] transition-colors"
                      style={
                        it.active
                          ? { background: 'var(--mn-ink)', color: 'white', fontWeight: 600 }
                          : { background: 'transparent', color: 'var(--mn-ink-soft)' }
                      }
                    >
                      <span>{it.name}</span>
                      {it.active && <span aria-hidden style={{ color: 'white', opacity: 0.6 }}>•</span>}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div className="pt-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--mn-muted)' }}>
              Support
            </p>
            <p className="mt-3 text-[12px] leading-relaxed" style={{ color: 'var(--mn-ink-soft)' }}>
              Need more specific support from a human?
            </p>
            <button
              type="button"
              className="mt-3 inline-flex h-9 items-center rounded-full px-4 text-[12px] font-semibold text-white"
              style={{ background: 'var(--mn-ink)' }}
            >
              Contact HQ Advisor
            </button>
          </div>
        </nav>

        <p className="mt-12 text-[10px] uppercase tracking-[0.14em]" style={{ color: 'var(--mn-muted)' }}>
          v0.4 preview
        </p>
      </div>
    </aside>
  )
}

// ──────────────────────────────────────────────────────────────────
// Top bar - minimal, search + plan chip + user
// ──────────────────────────────────────────────────────────────────
function TopBar() {
  return (
    <header className="flex flex-wrap items-center gap-4">
      <div
        className="flex h-11 flex-1 items-center gap-3 px-4"
        style={{ borderBottom: '1px solid var(--mn-line)' }}
      >
        <svg viewBox="0 0 16 16" className="h-4 w-4" style={{ color: 'var(--mn-muted)' }} aria-hidden>
          <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" fill="none" />
          <path d="M11 11l3.5 3.5" stroke="currentColor" strokeWidth="1.5" />
        </svg>
        <span className="text-[13px]" style={{ color: 'var(--mn-muted)' }}>
          Search HQ.ai
        </span>
      </div>
      <span
        className="inline-flex h-8 items-center rounded-full px-3 text-[11px] font-semibold uppercase tracking-[0.14em]"
        style={{ background: 'var(--mn-clay-wash)', color: 'var(--mn-clay)' }}
      >
        Growth - 6 seats
      </span>
      <div
        className="inline-flex h-9 w-9 items-center justify-center rounded-full font-bold text-white"
        style={{ background: 'var(--mn-ink)', fontSize: 13 }}
        aria-label="James Rayner"
      >
        JR
      </div>
    </header>
  )
}

// ──────────────────────────────────────────────────────────────────
// Hero band - big confident headline, generous whitespace, image right
// ──────────────────────────────────────────────────────────────────
function Hero() {
  return (
    <section className="grid gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em]" style={{ color: 'var(--mn-clay)' }}>
          Wednesday, 20 May
        </p>
        <h1
          className="mt-6 font-serif tracking-tight"
          style={{ fontSize: 64, lineHeight: 1.02, color: 'var(--mn-ink)', letterSpacing: '-0.025em' }}
        >
          Good morning,<br />
          <span style={{ color: 'var(--mn-muted)' }}>James.</span>
        </h1>
        <p className="mt-7 max-w-md text-[16px] leading-relaxed" style={{ color: 'var(--mn-ink-soft)' }}>
          Two things on the docket. Three CV reviews pending and one letter
          of offer half-drafted. Both knock-overs - 20 minutes total.
        </p>

        <div className="mt-9 flex flex-wrap gap-3">
          <button
            type="button"
            className="inline-flex h-12 items-center rounded-full px-7 text-[13px] font-semibold text-white"
            style={{ background: 'var(--mn-ink)' }}
          >
            Open pending CV reviews
          </button>
          <button
            type="button"
            className="inline-flex h-12 items-center rounded-full px-7 text-[13px] font-semibold"
            style={{ background: 'transparent', color: 'var(--mn-ink)', border: '1px solid var(--mn-line)' }}
          >
            Finish the letter of offer
          </button>
        </div>
      </div>

      {/* Right column - editorial image tile + meta */}
      <div className="relative">
        <div
          className="relative aspect-[4/5] w-full overflow-hidden rounded-[28px]"
          style={{ background: 'var(--mn-bg-soft)' }}
        >
          {/* Stylised dashboard frame instead of a stock photo */}
          <div className="absolute inset-0 flex flex-col p-7">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--mn-muted)' }}>
              In progress
            </p>
            <p className="mt-2 font-serif text-[28px] leading-tight" style={{ color: 'var(--mn-ink)' }}>
              Letter of Offer<br />
              <span style={{ color: 'var(--mn-muted)' }}>Sarah K., bookkeeper</span>
            </p>

            <div
              className="mt-6 flex-1 rounded-2xl border p-4"
              style={{ background: 'white', borderColor: 'var(--mn-line)' }}
            >
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--mn-muted)' }}>
                Page 1 of 2
              </p>
              <p className="mt-3 text-[12px] leading-relaxed" style={{ color: 'var(--mn-ink-soft)' }}>
                Dear Sarah,<br /><br />
                We are pleased to offer you the position of <strong style={{ color: 'var(--mn-ink)' }}>Senior Bookkeeper</strong>
                on a permanent full-time basis, commencing 3 June 2026...
              </p>
              <div
                className="mt-4 h-1 w-3/4 rounded-full"
                style={{ background: 'var(--mn-clay)' }}
              />
              <p className="mt-1.5 text-[10px]" style={{ color: 'var(--mn-muted)' }}>74% drafted</p>
            </div>

            <button
              type="button"
              className="mt-6 inline-flex h-10 w-full items-center justify-center rounded-full text-[12px] font-semibold text-white"
              style={{ background: 'var(--mn-ink)' }}
            >
              Resume editing
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}

// ──────────────────────────────────────────────────────────────────
// KPI row - hairline cards, big numbers, no colour panels
// ──────────────────────────────────────────────────────────────────
function KpiRow() {
  const cards = [
    { label: 'Hours back this month',  value: '12.4', delta: '+2.1 vs April' },
    { label: 'Documents drafted',       value: '38',   delta: '8 offers, 4 PIPs' },
    { label: 'Advisor handoffs',        value: '3',    delta: 'Avg reply 14m' },
  ]
  return (
    <section>
      <div className="flex items-baseline justify-between">
        <h2 className="font-serif tracking-tight" style={{ fontSize: 32, color: 'var(--mn-ink)', letterSpacing: '-0.015em' }}>
          This month
        </h2>
        <button
          type="button"
          className="text-[12px] font-semibold underline-offset-4 hover:underline"
          style={{ color: 'var(--mn-ink-soft)' }}
        >
          See the maths -&gt;
        </button>
      </div>

      <div className="mt-8 grid gap-px overflow-hidden rounded-[24px]" style={{ background: 'var(--mn-line)' }}>
        <div className="grid gap-px sm:grid-cols-3" style={{ background: 'var(--mn-line)' }}>
          {cards.map((c) => (
            <div
              key={c.label}
              className="p-8"
              style={{ background: 'white' }}
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--mn-muted)' }}>
                {c.label}
              </p>
              <p className="mt-5 font-serif leading-none tracking-tight" style={{ fontSize: 64, color: 'var(--mn-ink)', letterSpacing: '-0.03em' }}>
                {c.value}
              </p>
              <p className="mt-5 text-[12px]" style={{ color: 'var(--mn-ink-soft)' }}>
                {c.delta}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ──────────────────────────────────────────────────────────────────
// AI Advisor preview - clean white card, hairline border, generous gap
// ──────────────────────────────────────────────────────────────────
function AdvisorCard() {
  return (
    <article
      className="rounded-[24px] p-9"
      style={{ background: 'white', border: '1px solid var(--mn-line)' }}
    >
      <header>
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em]" style={{ color: 'var(--mn-clay)' }}>
          HQ People
        </p>
        <h2 className="mt-2 font-serif tracking-tight" style={{ fontSize: 28, color: 'var(--mn-ink)', letterSpacing: '-0.02em' }}>
          Your AI Advisor
        </h2>
        <p className="mt-2 text-[13px]" style={{ color: 'var(--mn-ink-soft)' }}>
          Cites every answer. Hands off to a human when it matters.
        </p>
      </header>

      <div className="mt-8 space-y-3">
        <Bubble side="user">What notice do I owe a casual who&apos;s been weekly for 14 months?</Bubble>
        <Bubble side="ai">
          A regular and systematic casual of 14 months is likely owed notice under the Award. The Hospitality Industry Award sets minimum notice based on continuous service.
        </Bubble>
        <div className="ml-auto flex max-w-[420px] items-center justify-end">
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold"
            style={{ background: 'var(--mn-clay-wash)', color: 'var(--mn-clay)' }}
          >
            Cited - cl 17, Hospitality Industry Award
          </span>
        </div>
      </div>

      <div className="mt-8 flex items-center gap-3" style={{ borderBottom: '1px solid var(--mn-ink)', paddingBottom: 6 }}>
        <input
          type="text"
          placeholder="Ask the next question..."
          readOnly
          className="flex-1 bg-transparent px-1 text-[14px] outline-none placeholder:opacity-60"
          style={{ color: 'var(--mn-ink)' }}
        />
        <button
          type="button"
          className="inline-flex h-9 items-center rounded-full px-5 text-[12px] font-semibold text-white"
          style={{ background: 'var(--mn-ink)' }}
        >
          Send
        </button>
      </div>
    </article>
  )
}

function Bubble({ side, children }: { side: 'user' | 'ai'; children: React.ReactNode }) {
  const isUser = side === 'user'
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <p
        className="max-w-[460px] rounded-[20px] px-4 py-3 text-[13px] leading-relaxed"
        style={
          isUser
            ? { background: 'var(--mn-ink)', color: 'white' }
            : { background: 'var(--mn-bg-soft)', color: 'var(--mn-ink)' }
        }
      >
        {children}
      </p>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────
// CV Scorecard - same hairline-card discipline
// ──────────────────────────────────────────────────────────────────
function ScorecardCard() {
  return (
    <article
      className="rounded-[24px] p-9"
      style={{ background: 'white', border: '1px solid var(--mn-line)' }}
    >
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em]" style={{ color: 'var(--mn-clay)' }}>
            HQ Recruit
          </p>
          <h2 className="mt-2 font-serif tracking-tight" style={{ fontSize: 28, color: 'var(--mn-ink)', letterSpacing: '-0.02em' }}>
            Sarah K.
          </h2>
          <p className="mt-1 text-[13px]" style={{ color: 'var(--mn-ink-soft)' }}>
            Senior bookkeeper - scored v2
          </p>
        </div>
        <div className="text-right">
          <p className="font-serif leading-none tracking-tight" style={{ fontSize: 56, color: 'var(--mn-ink)', letterSpacing: '-0.03em' }}>
            4.2
          </p>
          <span
            className="mt-3 inline-flex items-center rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]"
            style={{ background: 'var(--mn-ink)', color: 'white' }}
          >
            Strong yes
          </span>
        </div>
      </header>

      <div className="mt-8 space-y-4">
        {[
          { label: 'Relevant experience', score: 88 },
          { label: 'Communication',       score: 82 },
          { label: 'Role fit',            score: 74 },
        ].map((row, i) => (
          <div key={row.label}>
            <div className="flex items-center justify-between text-[12px]" style={{ color: 'var(--mn-ink-soft)' }}>
              <span className="font-semibold" style={{ color: 'var(--mn-ink)' }}>{row.label}</span>
              <span className="tabular-nums">{row.score} / 100</span>
            </div>
            <div className="mt-1.5 h-px w-full" style={{ background: 'var(--mn-line)' }}>
              <div className="h-px" style={{ width: `${row.score}%`, background: i === 0 ? 'var(--mn-clay)' : 'var(--mn-ink)' }} />
            </div>
          </div>
        ))}
      </div>

      <p
        className="mt-8 border-l-2 pl-4 text-[13px] italic leading-relaxed"
        style={{ borderColor: 'var(--mn-clay)', color: 'var(--mn-ink)' }}
      >
        Led the AP/AR function for a 60-staff hospitality group, owning month-end and BAS.
        <span className="not-italic ml-2" style={{ color: 'var(--mn-muted)' }}>- from CV</span>
      </p>

      <div className="mt-8 flex flex-wrap gap-3">
        <button
          type="button"
          className="inline-flex h-10 items-center rounded-full px-5 text-[12px] font-semibold text-white"
          style={{ background: 'var(--mn-ink)' }}
        >
          Send to Shortlist Agent
        </button>
        <button
          type="button"
          className="inline-flex h-10 items-center rounded-full px-5 text-[12px] font-semibold"
          style={{ background: 'transparent', color: 'var(--mn-ink)', border: '1px solid var(--mn-line)' }}
        >
          Download summary
        </button>
      </div>
    </article>
  )
}

// ──────────────────────────────────────────────────────────────────
// Documents block - clean list, lots of whitespace
// ──────────────────────────────────────────────────────────────────
function DocumentsBlock() {
  const rows = [
    { title: 'Letter of Offer - Sarah K.',     type: 'Offer',       date: '19 May 2026', status: 'Final' },
    { title: 'PIP - Daniel M.',                type: 'Performance', date: '17 May 2026', status: 'Draft' },
    { title: 'Reference Check - Ben S.',       type: 'Recruit',     date: '15 May 2026', status: 'Sent'  },
    { title: 'First-and-Final Warning - Joel', type: 'Warning',     date: '13 May 2026', status: 'Final' },
  ]
  const dot = (s: string) =>
      s === 'Final' ? 'var(--mn-ink)'
    : s === 'Sent'  ? 'var(--mn-clay)'
    :                 'var(--mn-muted)'

  return (
    <section>
      <div className="flex items-baseline justify-between">
        <h2 className="font-serif tracking-tight" style={{ fontSize: 32, color: 'var(--mn-ink)', letterSpacing: '-0.015em' }}>
          Recently generated
        </h2>
        <button
          type="button"
          className="text-[12px] font-semibold underline-offset-4 hover:underline"
          style={{ color: 'var(--mn-ink-soft)' }}
        >
          View all -&gt;
        </button>
      </div>

      <ul className="mt-8 divide-y" style={{ borderColor: 'var(--mn-line)' }}>
        <li className="hidden grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4 pb-3 text-[10px] font-semibold uppercase tracking-[0.18em] sm:grid" style={{ color: 'var(--mn-muted)' }}>
          <span>Title</span>
          <span>Type</span>
          <span>Date</span>
          <span>Status</span>
          <span aria-hidden></span>
        </li>
        {rows.map((r) => (
          <li
            key={r.title}
            className="grid grid-cols-1 items-center gap-4 py-5 sm:grid-cols-[2fr_1fr_1fr_1fr_auto]"
            style={{ borderTop: '1px solid var(--mn-line)' }}
          >
            <p className="font-semibold" style={{ color: 'var(--mn-ink)' }}>{r.title}</p>
            <p className="text-[13px]" style={{ color: 'var(--mn-ink-soft)' }}>{r.type}</p>
            <p className="text-[13px]" style={{ color: 'var(--mn-ink-soft)' }}>{r.date}</p>
            <p className="inline-flex items-center gap-2 text-[12px] font-semibold" style={{ color: 'var(--mn-ink)' }}>
              <span aria-hidden className="h-1.5 w-1.5 rounded-full" style={{ background: dot(r.status) }} />
              {r.status}
            </p>
            <button
              type="button"
              className="inline-flex h-9 items-center rounded-full px-4 text-[12px] font-semibold"
              style={{ background: 'transparent', color: 'var(--mn-ink)', border: '1px solid var(--mn-line)' }}
            >
              Edit
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}

// ──────────────────────────────────────────────────────────────────
// Pricing block - Apple Watch product-page style with tier chips
// ──────────────────────────────────────────────────────────────────
function PricingBlock({
  tier,
  onSelect,
}: {
  tier: 'essentials' | 'growth' | 'scale'
  onSelect: (t: 'essentials' | 'growth' | 'scale') => void
}) {
  const tiers = {
    essentials: { name: 'Essentials', price: '99',  seats: '3 seats',  blurb: 'For the owner-operator handling HR on the side.' },
    growth:     { name: 'Growth',     price: '199', seats: '6 seats',  blurb: 'For the growing team that needs HR every week.' },
    scale:      { name: 'Scale',      price: '379', seats: '12 seats', blurb: "For the SME that's outgrown DIY HR." },
  } as const
  const t = tiers[tier]

  return (
    <section
      className="rounded-[28px] p-10 lg:p-14"
      style={{ background: 'var(--mn-bg-soft)' }}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em]" style={{ color: 'var(--mn-muted)' }}>
        Plan
      </p>
      <div className="mt-3 grid gap-10 lg:grid-cols-[1fr_1fr] lg:items-center">
        {/* Left column - copy + tier chips */}
        <div>
          <h2 className="font-serif tracking-tight" style={{ fontSize: 48, lineHeight: 1.05, color: 'var(--mn-ink)', letterSpacing: '-0.025em' }}>
            {t.name}
          </h2>
          <p className="mt-3 text-[15px]" style={{ color: 'var(--mn-ink-soft)' }}>
            {t.blurb}
          </p>

          <div className="mt-7 flex flex-wrap gap-2">
            {(['essentials', 'growth', 'scale'] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => onSelect(k)}
                className="inline-flex h-10 items-center rounded-full px-4 text-[12px] font-semibold transition-colors"
                style={
                  k === tier
                    ? { background: 'var(--mn-ink)', color: 'white' }
                    : { background: 'white', color: 'var(--mn-ink)', border: '1px solid var(--mn-line)' }
                }
              >
                {tiers[k].name}
              </button>
            ))}
          </div>

          <p className="mt-7 text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--mn-muted)' }}>
            What&apos;s included
          </p>
          <ul className="mt-3 space-y-2 text-[13px]" style={{ color: 'var(--mn-ink-soft)' }}>
            <li>{t.seats}</li>
            <li>AI Advisor + 33 templates</li>
            <li>HQ Recruit - CV scoring + screens + Campaign Coach</li>
            <li>Same human advisor on escalations</li>
            <li>14-day free trial. Cancel any time.</li>
          </ul>
        </div>

        {/* Right column - price + buy stack */}
        <div
          className="rounded-[24px] p-9"
          style={{ background: 'white', border: '1px solid var(--mn-line)' }}
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em]" style={{ color: 'var(--mn-muted)' }}>
            {t.name}
          </p>
          <p className="mt-3 font-serif leading-none tracking-tight" style={{ fontSize: 72, color: 'var(--mn-ink)', letterSpacing: '-0.03em' }}>
            ${t.price}
            <span className="ml-2 align-middle text-[16px]" style={{ color: 'var(--mn-muted)' }}>/month</span>
          </p>
          <p className="mt-3 text-[13px]" style={{ color: 'var(--mn-ink-soft)' }}>
            Billed monthly. {t.seats}.
          </p>

          <button
            type="button"
            className="mt-7 inline-flex h-12 w-full items-center justify-center rounded-full text-[13px] font-semibold text-white"
            style={{ background: 'var(--mn-ink)' }}
          >
            Start the 14-day trial
          </button>
          <p className="mt-3 text-center text-[11px]" style={{ color: 'var(--mn-muted)' }}>
            No card. Three minutes to first document.
          </p>

          <div className="mt-6 flex items-center justify-between" style={{ borderTop: '1px solid var(--mn-line)', paddingTop: 16 }}>
            <p className="text-[12px]" style={{ color: 'var(--mn-ink-soft)' }}>
              Or buy a single document
            </p>
            <button
              type="button"
              className="text-[12px] font-semibold underline-offset-4 hover:underline"
              style={{ color: 'var(--mn-clay)' }}
            >
              From $25 -&gt;
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}

// ──────────────────────────────────────────────────────────────────
// Button gallery
// ──────────────────────────────────────────────────────────────────
function ButtonGallery() {
  return (
    <section>
      <p className="text-[10px] font-semibold uppercase tracking-[0.22em]" style={{ color: 'var(--mn-muted)' }}>
        Button gallery
      </p>
      <h2 className="mt-2 font-serif tracking-tight" style={{ fontSize: 32, color: 'var(--mn-ink)', letterSpacing: '-0.015em' }}>
        Every CTA state
      </h2>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <button type="button" className="inline-flex h-12 items-center justify-center rounded-full px-7 text-[13px] font-semibold text-white" style={{ background: 'var(--mn-ink)' }}>
          Primary - ink
        </button>
        <button type="button" className="inline-flex h-12 items-center justify-center rounded-full px-7 text-[13px] font-semibold" style={{ background: 'transparent', color: 'var(--mn-ink)', border: '1px solid var(--mn-line)' }}>
          Secondary - hairline
        </button>
        <button type="button" className="inline-flex h-12 items-center justify-center rounded-full px-7 text-[13px] font-semibold text-white" style={{ background: 'var(--mn-clay)' }}>
          Accent - clay
        </button>
        <button type="button" className="inline-flex h-9 items-center justify-center rounded-full px-4 text-[12px] font-semibold" style={{ background: 'var(--mn-bg-soft)', color: 'var(--mn-ink)' }}>
          Quiet pill
        </button>
        <button type="button" className="text-[13px] font-semibold underline-offset-4 hover:underline" style={{ color: 'var(--mn-ink-soft)' }}>
          Text-only link -&gt;
        </button>
        <button type="button" disabled className="inline-flex h-12 items-center justify-center rounded-full px-7 text-[13px] font-semibold text-white opacity-40" style={{ background: 'var(--mn-ink)' }}>
          Disabled primary
        </button>
      </div>
    </section>
  )
}

// ──────────────────────────────────────────────────────────────────
// Tokens
// ──────────────────────────────────────────────────────────────────
function TokenLegend() {
  const swatches: Array<{ name: string; var: string; hex: string; text: string }> = [
    { name: 'bg',       var: '--mn-bg',        hex: '#FFFFFF', text: '#111111' },
    { name: 'bg-soft',  var: '--mn-bg-soft',   hex: '#F7F7F2', text: '#111111' },
    { name: 'sand',     var: '--mn-sand',      hex: '#EFEDE5', text: '#111111' },
    { name: 'line',     var: '--mn-line',      hex: '#E6E5E0', text: '#111111' },
    { name: 'muted',    var: '--mn-muted',     hex: '#9A9A99', text: 'white'   },
    { name: 'ink-soft', var: '--mn-ink-soft',  hex: '#4D4D4D', text: 'white'   },
    { name: 'ink',      var: '--mn-ink',       hex: '#111111', text: 'white'   },
    { name: 'clay',     var: '--mn-clay',      hex: '#D97757', text: 'white'   },
    { name: 'clay-wash',var: '--mn-clay-wash', hex: '#F5E5DD', text: '#111111' },
  ]
  return (
    <section>
      <p className="text-[10px] font-semibold uppercase tracking-[0.22em]" style={{ color: 'var(--mn-muted)' }}>
        Tokens
      </p>
      <h2 className="mt-2 font-serif tracking-tight" style={{ fontSize: 32, color: 'var(--mn-ink)', letterSpacing: '-0.015em' }}>
        Nine tokens. Clay used once per section.
      </h2>

      <div className="mt-8 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-3">
        {swatches.map((s) => (
          <div
            key={s.var}
            className="flex h-24 flex-col justify-between rounded-2xl p-4"
            style={{ background: s.hex, color: s.text, border: s.name === 'bg' ? '1px solid var(--mn-line)' : 'none' }}
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em]">{s.name}</p>
            <p className="text-[13px] font-semibold tabular-nums">{s.hex}</p>
          </div>
        ))}
      </div>

      <p className="mt-7 max-w-2xl text-[13px] leading-relaxed" style={{ color: 'var(--mn-ink-soft)' }}>
        Typography: <strong style={{ color: 'var(--mn-ink)' }}>Fraunces serif</strong> at 28-72px for editorial moments (hero headline, big numbers, section titles).
        <strong style={{ color: 'var(--mn-ink)' }}> Inter</strong> at 600-700 for labels and CTAs, 400-500 for body.
        Letter-spacing tightens at large sizes (-0.025em on 64px hero).
        Corner rhythm: <strong style={{ color: 'var(--mn-ink)' }}>20-24px on cards</strong>, <strong style={{ color: 'var(--mn-ink)' }}>28px on big surfaces</strong>, <strong style={{ color: 'var(--mn-ink)' }}>pills 9999px</strong>.
        Hairlines 1px in <code>--mn-line</code>. Shadows used sparingly - cards default to flat with a hairline.
      </p>
    </section>
  )
}
