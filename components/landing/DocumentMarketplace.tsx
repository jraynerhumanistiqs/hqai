'use client'

// Document Marketplace - look-and-feel only. A pay-as-you-go store for
// individual HR and recruitment documents. Buttons, search and filters are
// inert (no checkout, no cart) - we wire functionality later. The category
// filter and search field hold client state so the grid filters live.
//
// Document names + fixed prices come from the one-off SKU list in
// lib/pricing-config.ts. Additional realistic names + the category grouping
// come from lib/template-ip.ts (ALL_TEMPLATES / TEMPLATE_CATEGORIES). Items
// without a fixed SKU price show "from $25". Never duplicate prices inline -
// the SKU map below is keyed straight off PRICING.oneOffs.

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { PRICING } from '@/lib/pricing-config'
import { ALL_TEMPLATES } from '@/lib/template-ip'

// ── Plain-English category chips (marketplace facets) ──────────────
// These are the buyer-facing filters. Each maps to one or more of the
// internal template categories from lib/template-ip.ts so the grid can
// filter without surfacing internal jargon.
const FILTERS: { id: string; label: string; match: string[] }[] = [
  { id: 'all', label: 'All documents', match: [] },
  { id: 'hiring', label: 'Hiring and onboarding', match: ['Letters & Offers', 'Recruitment', 'Employment Contracts'] },
  { id: 'performance', label: 'Performance', match: ['Performance Management'] },
  { id: 'leave', label: 'Leave and return to work', match: ['Return to Work'] },
  { id: 'ending', label: 'Ending employment', match: ['Termination & Separation'] },
  { id: 'policies', label: 'Policies', match: ['Workplace Policies'] },
]

// The cheapest fixed price across the SKU list - drives the "from $X" anchor
// shown on documents that do not yet have a fixed price.
const FROM_PRICE = PRICING.oneOffs.reduce((min, s) => (s.price < min ? s.price : min), PRICING.oneOffs[0].price)

interface ProductDoc {
  id: string
  name: string
  desc: string
  category: string
  price: number | null // null = no fixed SKU yet ("from $X")
  badge?: 'Most popular' | 'Bundle'
}

// Plain, layman one-liners for the store grid - no legal-compliance claims.
// Keyed by template id; falls back to the template's own description.
const PLAIN_DESC: Record<string, string> = {
  'letter-of-offer': 'Offer the job in writing, with the pay, start date and conditions all set out.',
  'employment-contract': 'A full contract for full-time, part-time or casual, written from your details.',
  'confirmation-of-employment': 'Confirm someone works for you, for a bank, landlord or visa.',
  'contract-variation': 'Change someone\'s hours, pay, role or location in writing, the clean way.',
  'flexible-work-application': 'A tidy form for staff to request working from home or flexible hours.',
  'warning-letter': 'A clear, fair written warning that sets out the issue and what needs to change.',
  'performance-improvement-plan': 'A 30, 60 and 90 day plan with real targets and check-in dates.',
  'probation-review': 'Check a new hire is the right fit, milestone by milestone.',
  'file-note': 'Write up a chat with a staff member for the record, in the right words.',
  'letter-of-expectation': 'Set expectations plainly when a warning is a step too far.',
  'show-cause-letter': 'Give someone a fair chance to respond before you act.',
  'termination-letter': 'End employment properly, with notice and final pay handled.',
  'termination-in-probation': 'End employment during probation, cleanly and on the contract terms.',
  'resignation-acceptance': 'Accept a resignation in writing, with notice and final pay noted.',
  'abandonment-letter': 'Handle a no-show after repeated contact, the careful way.',
  'reference-check': 'Structured reference questions with consent captured up front.',
  'job-advertisement': 'A sharp, fair job ad that draws the right people in.',
  'job-brief': 'Capture what good looks like for the role before you start hiring.',
  'phone-interview': 'A ready-made phone screen so every first call asks the same things.',
  'screening-questions': 'Scored screening questions to sort applicants fairly and fast.',
  'code-of-conduct': 'The ground rules for behaviour at work, in plain language.',
  'grievance-policy': 'A clear path for staff to raise a problem and have it heard.',
  'induction-policy': 'A first-day and first-week plan so new starters land well.',
  'alcohol-drugs-policy': 'A sensible policy on being fit for work, with support built in.',
  'suitable-duties-plan': 'A week-by-week plan to ease someone back after injury or illness.',
}

// Build the store catalogue once. Fixed-price documents (the SKUs) are
// matched to a template by id where possible so the buyer sees a real name,
// a plain description, and the firm price. Everything else from ALL_TEMPLATES
// fills out the grid at "from $X".
function buildCatalogue(): ProductDoc[] {
  // Map SKU id (or close match) -> fixed price.
  const skuPriceById: Record<string, number> = {}
  for (const sku of PRICING.oneOffs) {
    // SKU ids mostly line up with template ids; normalise the few that differ.
    const aliases: Record<string, string> = {
      'performance-plan': 'performance-improvement-plan',
      'first-and-final-warning': 'warning-letter',
      'position-description': 'job-brief',
      'casual-conversion-letter': 'contract-variation',
      'probation-outcome': 'probation-review',
      'reference-check-request': 'reference-check',
    }
    const templateId = aliases[sku.id] ?? sku.id
    skuPriceById[templateId] = sku.price
  }

  // A curated front-of-store order - lead with the documents employers ask
  // for most, then fan out across the rest of the library.
  const featuredIds = [
    'letter-of-offer',
    'employment-contract',
    'warning-letter',
    'termination-letter',
    'performance-improvement-plan',
    'probation-review',
    'job-advertisement',
    'reference-check',
    'resignation-acceptance',
    'contract-variation',
    'code-of-conduct',
    'phone-interview',
  ]

  const byId = Object.fromEntries(ALL_TEMPLATES.map((t) => [t.id, t]))
  const ordered = [
    ...featuredIds.map((id) => byId[id]).filter(Boolean),
    ...ALL_TEMPLATES.filter((t) => !featuredIds.includes(t.id)),
  ]

  return ordered.map((t, i) => {
    const price = skuPriceById[t.id] ?? null
    let badge: ProductDoc['badge'] | undefined
    if (t.id === 'letter-of-offer') badge = 'Most popular'
    else if (t.id === 'employment-contract') badge = 'Bundle'
    return {
      id: t.id,
      name: friendlyName(t.title),
      desc: PLAIN_DESC[t.id] ?? t.description,
      category: t.category,
      price,
      badge,
    }
  })
}

// Trim the internal template titles to clean store names.
function friendlyName(title: string): string {
  return title
    .replace(/ Letter$/, '')
    .replace(/ Template$/, '')
    .replace(/ Form$/, '')
    .replace('Performance Improvement Plan', 'Performance Improvement Plan')
}

export default function DocumentMarketplace() {
  const [active, setActive] = useState('all')
  const [query, setQuery] = useState('')

  const catalogue = useMemo(buildCatalogue, [])

  const filtered = useMemo(() => {
    const f = FILTERS.find((x) => x.id === active) ?? FILTERS[0]
    const q = query.trim().toLowerCase()
    return catalogue.filter((doc) => {
      const inCategory = f.match.length === 0 || f.match.includes(doc.category)
      const inSearch =
        q.length === 0 ||
        doc.name.toLowerCase().includes(q) ||
        doc.desc.toLowerCase().includes(q)
      return inCategory && inSearch
    })
  }, [catalogue, active, query])

  return (
    <main className="min-h-screen bg-bg text-ink antialiased">
      {/* ── 1. Hero ─────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-6 pt-16 md:px-10 md:pt-24">
        <p className="mb-4 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.06em] text-clay">
          <span aria-hidden className="h-px w-5 bg-clay" />
          Document Marketplace
        </p>
        <h1 className="max-w-3xl font-display text-[36px] font-bold leading-[1.05] tracking-tight text-ink md:text-[52px]">
          Every HR document you need. Pay as you go.
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink-soft">
          Pick a document, answer a few questions, and it is ready to sign in three minutes. No
          subscription. From ${FROM_PRICE}.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:gap-4">
          <a
            href="#browse"
            className="inline-flex h-12 items-center justify-center rounded-full bg-clay px-7 text-sm font-semibold text-ink-on-accent shadow-card transition-colors hover:bg-clay-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay"
          >
            Browse documents
          </a>
          <a
            href="#how-it-works"
            className="inline-flex h-12 items-center justify-center rounded-full border border-ink px-6 text-sm font-medium text-ink transition-colors hover:bg-bg-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            How it works
          </a>
        </div>

        {/* Reassurance ticks under the hero */}
        <ul className="mt-9 flex flex-wrap gap-x-7 gap-y-2.5 text-sm text-ink-soft">
          {['No subscription', 'Your details filled in for you', 'Download ready to sign'].map((t) => (
            <li key={t} className="flex items-center gap-2">
              <TickIcon />
              {t}
            </li>
          ))}
        </ul>
      </section>

      {/* ── 2. Search + category filter bar (inert search) ──────── */}
      <section id="browse" className="mx-auto mt-14 max-w-6xl scroll-mt-24 px-6 md:px-10 md:mt-20">
        <div className="rounded-3xl border border-border bg-bg-elevated p-5 shadow-card md:p-6">
          {/* Search field - inert, for look and feel */}
          <div className="relative">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-muted">
              <SearchIcon />
            </span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search documents..."
              aria-label="Search documents"
              className="h-12 w-full rounded-full border border-border bg-bg pl-11 pr-4 text-sm text-ink placeholder:text-ink-muted transition-colors focus:border-border-strong focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay"
            />
          </div>

          {/* Category chips */}
          <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Filter by category">
            {FILTERS.map((f) => {
              const on = f.id === active
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setActive(f.id)}
                  aria-pressed={on}
                  className={[
                    'rounded-full px-4 py-2 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay',
                    on
                      ? 'bg-clay text-ink-on-accent'
                      : 'border border-border bg-bg text-ink-soft hover:border-ink hover:text-ink',
                  ].join(' ')}
                >
                  {f.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Result count */}
        <p className="mt-5 text-sm text-ink-muted" aria-live="polite">
          {filtered.length} {filtered.length === 1 ? 'document' : 'documents'}
          {active !== 'all' || query ? ' shown' : ' in the library'}
        </p>
      </section>

      {/* ── 3. The marketplace grid ─────────────────────────────── */}
      <section className="mx-auto mt-6 max-w-6xl px-6 pb-4 md:px-10" aria-label="Documents for sale">
        {filtered.length === 0 ? (
          <div className="rounded-3xl border border-border bg-bg-soft p-12 text-center">
            <p className="font-display text-xl font-bold tracking-tight text-ink">No documents match that yet.</p>
            <p className="mt-2 text-sm text-ink-soft">Try another category, or clear your search.</p>
            <button
              type="button"
              onClick={() => {
                setActive('all')
                setQuery('')
              }}
              className="mt-5 inline-flex h-10 items-center justify-center rounded-full border border-ink px-5 text-sm font-medium text-ink transition-colors hover:bg-bg"
            >
              Show all documents
            </button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 md:gap-6">
            {filtered.map((doc) => (
              <ProductCard key={doc.id} doc={doc} fromPrice={FROM_PRICE} />
            ))}
          </div>
        )}
      </section>

      {/* ── 4. How it works (3-step strip) ──────────────────────── */}
      <section
        id="how-it-works"
        className="mx-auto mt-16 max-w-6xl scroll-mt-24 px-6 md:px-10 md:mt-24"
        aria-labelledby="how-heading"
      >
        <p className="mb-4 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.06em] text-clay">
          <span aria-hidden className="h-px w-5 bg-clay" />
          How it works
        </p>
        <h2
          id="how-heading"
          className="max-w-2xl font-display text-3xl font-bold leading-tight tracking-tight text-ink md:text-[40px]"
        >
          Three minutes, start to signed.
        </h2>
        <div className="mt-10 grid gap-4 md:grid-cols-3 md:gap-6">
          {[
            { n: '1', t: 'Pick a document', d: 'Browse the library and choose the one you need. No account required to start.' },
            { n: '2', t: 'Answer a few questions', d: 'A short set of questions fills in your business and the details. No blank-page guesswork.' },
            { n: '3', t: 'Download, ready to sign', d: 'Your document is written and formatted. Download it and send it on.' },
          ].map((s) => (
            <div key={s.n} className="rounded-2xl border border-border bg-bg-soft p-7">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-clay text-sm font-bold text-ink-on-accent">
                {s.n}
              </span>
              <h3 className="mt-4 font-display text-lg font-bold tracking-tight text-ink">{s.t}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── 5. Reassurance / trust strip ────────────────────────── */}
      <section className="mx-auto mt-16 max-w-6xl px-6 md:px-10 md:mt-24" aria-label="Why buy here">
        <div className="grid gap-4 sm:grid-cols-3 md:gap-6">
          {[
            { t: 'No subscription', d: 'Pay once for the document you need. Nothing recurring, nothing to cancel.', icon: WalletIcon },
            { t: 'Written from your details', d: 'Every document is professionally written and drafted from the answers you give. No templates to wrestle.', icon: PenIcon },
            { t: 'A real advisor if it gets tricky', d: 'If your situation needs a human, a Humanistiqs advisor is one step away.', icon: PersonIcon },
          ].map((c) => {
            const Icon = c.icon
            return (
              <article key={c.t} className="flex flex-col rounded-2xl border border-border bg-bg-soft p-7">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border text-ink-soft">
                  <Icon />
                </span>
                <h3 className="mt-4 font-display text-lg font-bold tracking-tight text-ink">{c.t}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">{c.d}</p>
              </article>
            )
          })}
        </div>
      </section>

      {/* ── 6. Closing CTA ──────────────────────────────────────── */}
      <section className="mx-auto mt-16 max-w-6xl px-6 pb-24 md:px-10 md:mt-24">
        <div className="rounded-3xl border border-clay bg-clay-soft/40 p-8 shadow-card md:p-12">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="max-w-2xl">
              <h2 className="font-display text-2xl font-bold leading-tight tracking-tight text-ink md:text-[32px]">
                Need a document right now? Start with one.
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-ink-soft md:text-base">
                Buy a single document from ${FROM_PRICE}, or take the lot on a plan when you are doing this every
                week. No lock-in either way.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <a
                href="#browse"
                className="inline-flex h-12 items-center justify-center whitespace-nowrap rounded-full bg-clay px-7 text-sm font-semibold text-ink-on-accent transition-colors hover:bg-clay-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay"
              >
                Browse documents
              </a>
              <Link
                href="/pricing"
                className="inline-flex h-12 items-center justify-center whitespace-nowrap rounded-full border border-ink px-6 text-sm font-medium text-ink transition-colors hover:bg-bg-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                See plans -&gt;
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}

// ── Product card ──────────────────────────────────────────────────
function ProductCard({ doc, fromPrice }: { doc: ProductDoc; fromPrice: number }) {
  const featured = Boolean(doc.badge)
  return (
    <article
      className={[
        'group flex flex-col p-5',
        featured
          // Feature surface: elevated + shadowed, gold rationed via the badge.
          ? 'rounded-3xl border border-clay bg-bg-elevated shadow-card'
          // Quiet tile: soft surface, hairline, no shadow.
          : 'rounded-2xl border border-border bg-bg-soft transition-colors hover:border-border-strong',
      ].join(' ')}
    >
      {/* Faux document thumbnail - a light mini preview, never a black box */}
      <DocThumb badge={doc.badge} />

      <h3 className="mt-4 font-display text-base font-bold leading-snug tracking-tight text-ink">
        {doc.name}
      </h3>
      <p className="mt-1.5 text-[13px] leading-relaxed text-ink-soft">{doc.desc}</p>

      <div className="mt-auto flex items-center justify-between pt-5">
        <span className="text-sm font-semibold text-ink">
          {doc.price != null ? `$${doc.price}` : `from $${fromPrice}`}
        </span>
        <button
          type="button"
          // Inert - look and feel only. We wire checkout later.
          className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-full border border-ink px-4 text-[13px] font-semibold text-ink transition-colors hover:bg-clay hover:border-clay hover:text-ink-on-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay"
        >
          Get this document
          <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M3 8h9M9 5l3 3-3 3" />
          </svg>
        </button>
      </div>
    </article>
  )
}

// A light, letterheaded mini-document preview. Pure SVG so it scales and
// stays crisp; uses design tokens so it tracks the theme.
function DocThumb({ badge }: { badge?: 'Most popular' | 'Bundle' }) {
  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl border border-border bg-bg">
      {badge && (
        <span className="absolute right-2.5 top-2.5 z-10 rounded-full bg-clay px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-on-accent">
          {badge}
        </span>
      )}
      <svg viewBox="0 0 200 150" className="h-full w-full" role="img" aria-label="Document preview" preserveAspectRatio="xMidYMid slice">
        {/* the page */}
        <rect x="40" y="14" width="120" height="150" rx="6" className="text-bg-elevated" fill="currentColor" />
        <rect x="40" y="14" width="120" height="150" rx="6" className="text-border" fill="none" stroke="currentColor" strokeWidth="1.5" />
        {/* letterhead mark */}
        <rect x="52" y="26" width="22" height="22" rx="5" className="text-clay-soft" fill="currentColor" />
        <circle cx="63" cy="37" r="5.5" className="text-clay" fill="currentColor" />
        {/* title lines */}
        <rect x="84" y="29" width="56" height="6" rx="3" className="text-ink-muted" fill="currentColor" opacity="0.55" />
        <rect x="84" y="40" width="38" height="5" rx="2.5" className="text-ink-muted" fill="currentColor" opacity="0.32" />
        {/* divider */}
        <rect x="52" y="60" width="96" height="1.5" className="text-border" fill="currentColor" />
        {/* body lines */}
        {[68, 78, 88, 98, 108, 118].map((y, i) => (
          <rect
            key={y}
            x="52"
            y={y}
            width={i % 3 === 2 ? 58 : 96}
            height="4.5"
            rx="2.25"
            className="text-ink-muted"
            fill="currentColor"
            opacity="0.22"
          />
        ))}
        {/* signature line */}
        <rect x="52" y="134" width="44" height="4.5" rx="2.25" className="text-ink-muted" fill="currentColor" opacity="0.4" />
      </svg>
    </div>
  )
}

// ── Icons ─────────────────────────────────────────────────────────
function TickIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4 shrink-0 text-clay" aria-hidden>
      <path fill="currentColor" d="M6.2 11.4 3 8.2l1.1-1.1 2.1 2.1 5.7-5.7 1.1 1.1z" />
    </svg>
  )
}
function SearchIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="9" cy="9" r="6" />
      <path d="m14 14 3 3" />
    </svg>
  )
}
function WalletIcon() {
  return (
    <svg aria-hidden viewBox="0 0 32 32" className="h-6 w-6 stroke-current" fill="none" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="8" width="22" height="16" rx="3" />
      <path d="M5 12h22" />
      <circle cx="22" cy="18" r="1.5" />
    </svg>
  )
}
function PenIcon() {
  return (
    <svg aria-hidden viewBox="0 0 32 32" className="h-6 w-6 stroke-current" fill="none" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 6l5 5L13 24l-6 1 1-6 13-13Z" />
      <path d="M19 8l5 5" />
    </svg>
  )
}
function PersonIcon() {
  return (
    <svg aria-hidden viewBox="0 0 32 32" className="h-6 w-6 stroke-current" fill="none" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="16" cy="12" r="5" />
      <path d="M7 26a9 9 0 0 1 18 0" />
    </svg>
  )
}
