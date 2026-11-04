'use client'

// One worklist row: the fact, why it is up now, the date, one action, and a
// row menu to clear it.
//
// Copy boundary, inherited from lib/people-context.ts and
// components/people/PeopleContextHint.tsx: the row states a fact and a date
// from the user's own data and never says what to decide. The fact / because
// split arrives structurally from lib/worklist.ts, so this component only
// renders - it writes no copy of its own about a person.

import { useRef, useState } from 'react'
import Link from 'next/link'
import {
  RiAlarmLine,
  RiCalendarCheckLine,
  RiContractLine,
  RiFileWarningLine,
  RiMoreLine,
  RiPriceTag3Line,
  RiTimeLine,
  RiUserAddLine,
  RiUserStarLine,
} from '@remixicon/react'
import PortalMenu from '@/components/ui/PortalMenu'
import type { WorkItem, WorkItemAction, WorkItemKind } from '@/lib/worklist'

const ICONS: Record<WorkItemKind, typeof RiAlarmLine> = {
  follow_up_due: RiCalendarCheckLine,
  record_gap: RiFileWarningLine,
  minimum_period: RiTimeLine,
  casual_tenure: RiUserStarLine,
  fixed_term_ending: RiContractLine,
  award_unconfirmed: RiPriceTag3Line,
  register_empty: RiUserAddLine,
}

const TEAM = '/dashboard/people/team'
const ADVISOR = '/dashboard/people/advisor'

/**
 * Where a row's action goes. Every branch resolves to a surface that works
 * today - the whole point of the spec's step 0 was that a prominent button
 * advertising something the product refuses is worse than no button.
 *
 * write_file_note, summarise_record and contact_advisor are declared on the
 * action union for the drafting steps that come next; until the drawer lands
 * they resolve to the register, where the file-note composer already works.
 */
export function resolveAction(action: WorkItemAction): { label: string; href: string } {
  switch (action.type) {
    case 'add_people':
      return { label: 'Add your team', href: TEAM }
    case 'ask_advisor':
      return { label: 'Ask the AI Advisor', href: `${ADVISOR}?prompt=${encodeURIComponent(action.prompt)}` }
    case 'contact_advisor':
      return { label: 'Ask the AI Advisor', href: ADVISOR }
    case 'write_file_note':
    case 'summarise_record':
    case 'open_record':
    default:
      return { label: 'Open their record', href: TEAM }
  }
}

export interface WorkItemCardProps {
  item: WorkItem
  /** Primary = the one filled accent CTA. At most one per panel. */
  primary?: boolean
  busy?: boolean
  onClear?: (item: WorkItem, mode: 'done' | 'dismissed' | 'snoozed') => void
}

export default function WorkItemCard({ item, primary = false, busy = false, onClear }: WorkItemCardProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuBtn = useRef<HTMLButtonElement | null>(null)
  const Icon = ICONS[item.kind] ?? RiAlarmLine
  const { label, href } = resolveAction(item.action)
  const tone = item.urgency === 'now' ? 'text-warning' : 'text-ink-muted'

  function clear(mode: 'done' | 'dismissed' | 'snoozed') {
    setMenuOpen(false)
    onClear?.(item, mode)
  }

  return (
    <div className={'flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-start sm:gap-3 sm:px-5' + (busy ? ' opacity-50' : '')}>
      <span
        aria-hidden
        className={'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-bg-soft ' + tone}
      >
        <Icon className="h-[18px] w-[18px]" />
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-ink">{item.fact}</p>
        <p className="mt-0.5 text-xs text-ink-soft">{item.because}</p>
        {item.name && item.employeeId && (
          <p className="mt-1.5 text-xs text-ink-muted">
            <Link
              href={TEAM}
              className="underline decoration-border underline-offset-2 transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              {item.name}
            </Link>
          </p>
        )}
      </div>

      <div className="flex flex-shrink-0 items-center gap-2 self-start">
        <Link
          href={href}
          className={
            primary
              ? 'rounded-full bg-accent px-4 py-2 text-xs font-bold text-ink-on-accent transition-colors hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent'
              : 'rounded-full border border-border px-4 py-2 text-xs font-bold text-ink-soft transition-colors hover:bg-bg-soft hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent'
          }
        >
          {label}
        </Link>

        {item.dismissible && onClear && (
          <>
            <button
              ref={menuBtn}
              type="button"
              aria-label={`More options for this item`}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(v => !v)}
              disabled={busy}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-ink-muted transition-colors hover:bg-bg-soft hover:text-ink disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <RiMoreLine className="h-4 w-4" aria-hidden />
            </button>
            {/* Rows sit in an overflow-hidden rounded panel, so the menu is
                portalled to <body> rather than clipped. */}
            <PortalMenu
              open={menuOpen}
              anchorRef={menuBtn}
              onClose={() => setMenuOpen(false)}
              width={196}
              aria-label="Work item options"
            >
              <MenuItem onClick={() => clear('done')}>Mark done</MenuItem>
              <MenuItem onClick={() => clear('dismissed')}>Dismiss</MenuItem>
              <MenuItem onClick={() => clear('snoozed')}>Remind me in a fortnight</MenuItem>
            </PortalMenu>
          </>
        )}
      </div>
    </div>
  )
}

function MenuItem({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className="block w-full px-3 py-2 text-left text-xs font-medium text-ink-soft transition-colors hover:bg-bg-soft hover:text-ink focus-visible:outline-none focus-visible:bg-bg-soft"
    >
      {children}
    </button>
  )
}
