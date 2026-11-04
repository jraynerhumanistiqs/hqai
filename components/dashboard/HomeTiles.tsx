// The home page's view layer, split out of app/dashboard/page.tsx so that
// page stays a thin data loader (auth -> profile -> escalations) and the
// presentation can be rendered and inspected on its own.
//
// Two blocks, both home-only:
//   HomeNextActions - the open-escalation rail ("Next actions")
//   HomeTiles       - the tile grid, including the chat tile
//
// Oct 2026 rebuild, on the owner's brief: "make the home page tiled, with
// the chat bot the same size as the tiles, remove chat history, clean and
// easily navigated." Recent conversations and the three top-right shortcut
// pills are gone; the greeting and Next actions are kept.
//
// Tile hrefs are the live services in components/sidebar/Sidebar.tsx (the
// source of truth for what has shipped) plus My Team, Settings and the two
// pillar hubs. Every href below resolves to a real page.tsx - do not add a
// tile for a route that does not exist yet.

import Link from 'next/link'
import {
  RiArrowDownSLine,
  RiArrowRightUpLine,
  RiChat3Line,
  RiErrorWarningLine,
  RiFileList3Line,
  RiMegaphoneLine,
  RiRobot2Line,
  RiSettings3Line,
  RiTeamLine,
  RiUserSearchLine,
  type RemixiconComponentType,
} from '@remixicon/react'
import { ChatComposer } from '@/components/dashboard/ChatComposer'
import { StatusPill } from '@/components/ui/StatusPill'

interface Tile {
  href: string
  label: string
  blurb: string
  icon: RemixiconComponentType
}

export interface HomeEscalation {
  id: string
  title: string | null
  module: string | null
  created_at: string
  escalation_summary?: string | null
}

// Order = the order an owner actually works in: ask a question, look after
// the people you have, then the hiring funnel, then account.
const TILES: Tile[] = [
  {
    href: '/dashboard/people/team',
    label: 'My Team',
    blurb: 'Everyone you employ, in one register, with the dates that matter.',
    icon: RiTeamLine,
  },
  {
    href: '/dashboard/people/advisor',
    label: 'AI Advisor',
    blurb: 'Ask any people question and get clear, practical steps.',
    icon: RiChat3Line,
  },
  {
    href: '/dashboard/assistant',
    label: 'AI Assistant',
    blurb: 'Your day-to-day helper for the admin around people management.',
    icon: RiRobot2Line,
  },
  {
    href: '/dashboard/recruit/campaign-coach',
    label: 'Campaign Coach',
    blurb: 'Turn rough notes into a fully drafted job ad.',
    icon: RiMegaphoneLine,
  },
  {
    href: '/dashboard/recruit/cv-screening',
    label: 'CV Scoring Agent',
    blurb: 'Drop the CVs in, get a ranked scorecard with evidence.',
    icon: RiFileList3Line,
  },
  {
    href: '/dashboard/recruit/shortlist',
    label: 'Shortlist Agent',
    blurb: 'Score, prescreen, shortlist and interview inside one role.',
    icon: RiUserSearchLine,
  },
  {
    href: '/dashboard/settings',
    label: 'Settings',
    blurb: 'Your business details, billing and who can log in.',
    icon: RiSettings3Line,
  },
]

// The HQ People / HQ Recruit pillar hubs are deliberately NOT on this page.
// The sidebar dropped those parents in Aug 2026 for flat per-service nav, and
// every destination inside them is already a tile above - so a hub row here
// was pure duplication and the only clutter left on the surface. Cut on the
// owner's call, 2026-10-30. The routes still exist and the sidebar still
// reaches them; do not reintroduce them here without a reason.

/** Normalise em/en dashes in any string coming from the DB to plain hyphens. */
function normaliseDashes(s: string | null | undefined) {
  return (s || '').replace(/[—–]/g, '-')
}

function formatDate(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHrs = Math.floor(diffMins / 60)
  if (diffHrs < 24) return `${diffHrs}h ago`
  const diffDays = Math.floor(diffHrs / 24)
  if (diffDays < 7) return `${diffDays}d ago`
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
}

/**
 * Next actions - open escalations. Sits above the tiles so a waiting action
 * is never pushed below a grid; renders nothing at all when nothing waits.
 */
/**
 * Open escalations, folded by default and sitting BELOW the tiles.
 *
 * Native <details> rather than a client component with useState: it starts
 * closed with no `open` attribute, needs no JavaScript, is keyboard and
 * screen-reader accessible out of the box, and keeps this file a server
 * component. It also cannot get stuck half-open the way an animated
 * accordion can, which is the motion rule in CLAUDE.md.
 *
 * Deliberately NOT remembered across loads. The owner asked for it to always
 * start folded, so there is no localStorage and no `open` persistence.
 *
 * The count renders in the summary because a collapsed row reading only
 * "Next actions" tells you nothing - the whole point of folding it is that
 * you can see whether it is worth opening without opening it.
 */
export function HomeNextActions({ escalations }: { escalations: HomeEscalation[] }) {
  if (escalations.length === 0) return null
  const n = escalations.length
  return (
    <details className="group">
      <summary
        className="flex cursor-pointer list-none items-center gap-2.5 rounded-2xl px-1 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg [&::-webkit-details-marker]:hidden"
      >
        <RiArrowDownSLine
          className="h-5 w-5 flex-shrink-0 text-ink-muted transition-transform duration-150 group-open:rotate-180 motion-reduce:transition-none"
          aria-hidden
        />
        <h2 className="font-display text-lg sm:text-xl font-bold tracking-tight text-ink">
          Next actions
        </h2>
        <span className="rounded-full bg-warning/10 px-2 py-0.5 text-xs font-bold text-warning">
          {n}
        </span>
        <span className="sr-only">
          {n === 1 ? '1 item needs attention' : `${n} items need attention`}
        </span>
      </summary>
      <div className="mt-3 bg-bg-elevated border border-border rounded-3xl divide-y divide-border transition-colors">
        {escalations.map(e => (
          <div key={e.id} className="flex items-start gap-3 px-5 py-4">
            <span className="mt-0.5 w-8 h-8 rounded-lg bg-warning/10 text-warning flex items-center justify-center flex-shrink-0">
              <RiErrorWarningLine className="h-[18px] w-[18px]" aria-hidden />
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-medium text-ink truncate">
                  {normaliseDashes(e.title) || 'Escalated conversation'}
                </p>
                <StatusPill tone="warning" label="Consultant reviewing" />
              </div>
              {e.escalation_summary && (
                <p className="text-xs text-ink-muted mt-0.5 line-clamp-1">{normaliseDashes(e.escalation_summary)}</p>
              )}
              <p className="text-xs text-ink-muted mt-0.5">
                {e.module === 'recruit' ? 'HQ Recruit' : 'HQ People'} &middot; {formatDate(e.created_at)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </details>
  )
}

/** The tile grid - chat tile first, then one tile per live service. */
export function HomeTiles({ firstName }: { firstName?: string }) {
  return (
    <>
      {/* sm:auto-rows-fr makes every tile in the grid the same height as the
          tallest one (the chat tile), which is what keeps the surface
          reading as uniform tiles. It is scoped to sm+ so the
          single-column mobile stack keeps each tile at its natural height
          instead of inheriting the chat tile's. */}
      <section aria-labelledby="tiles-heading">
        <h2 id="tiles-heading" className="sr-only">Jump back in</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:auto-rows-fr sm:gap-4 lg:grid-cols-3">
          {/* Chat tile - same footprint as every other tile. */}
          <ChatComposer firstName={firstName} />

          {TILES.map(t => (
            <NavTile key={t.href} {...t} />
          ))}
        </div>
      </section>
    </>
  )
}

// One navigation tile. Outline card, no filled accent - the only filled
// accent on this page is the chat tile's Ask HQ button, per the one-CTA
// rule. The arrow is painted at rest (not revealed on hover) so the
// "this navigates" affordance never depends on an interaction or animation.
//
// Two layouts, one component. Below sm the tile is a short horizontal row
// (icon left, text right): ten stacked square tiles turned the phone view
// into ~1,600px of scrolling, which is the opposite of easy to navigate.
// From sm up it is the square tile - icon row, then title, then blurb.
function NavTile({ href, label, blurb, icon: Icon }: Tile) {
  return (
    <Link
      href={href}
      className="group flex h-full items-center gap-4 rounded-3xl border border-border bg-bg-elevated p-4 shadow-card transition-all hover:border-ink/30 hover:shadow-modal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg sm:flex-col sm:items-stretch sm:gap-0 sm:p-5"
    >
      <span className="flex flex-shrink-0 items-start justify-between sm:mb-3 sm:w-full">
        <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-2xl bg-bg-soft text-ink-soft transition-colors group-hover:text-ink">
          <Icon className="h-[18px] w-[18px]" aria-hidden />
        </span>
        {/* Hidden on phones, where the row has no spare width and a tap
            target this size is obviously tappable without the hint. */}
        <RiArrowRightUpLine className="hidden h-4 w-4 flex-shrink-0 text-ink-muted transition-colors group-hover:text-ink sm:block" aria-hidden />
      </span>
      <span className="min-w-0 flex-1 sm:flex-none">
        <span className="block font-display text-base font-bold tracking-tight text-ink">{label}</span>
        <span className="mt-0.5 block text-sm leading-snug text-ink-muted sm:mt-1">{blurb}</span>
      </span>
    </Link>
  )
}
