import Link from 'next/link'
import { RiCheckLine, RiLineChartLine } from '@remixicon/react'
import { PageHeader } from '@/components/dashboard/PageHeader'

// Shown when a business does not have the HQ Performance add-on.
//
// The HQ Tools tab is visible to everyone (owner's call - it is the upsell
// surface), so this is what most businesses see behind it. Copy leads on the
// busywork removed, not on compliance or law: HQ.ai never positions itself as
// advising on employment law.
//
// One filled accent CTA, outline card, no gradients - the house rules.
//
// Header grammar matches HQ Assistant: the shared DASH-06 PageHeader rather
// than the hand-rolled icon-tile + bare h1 this used to carry, which read as a
// different author next to every other dashboard surface. The icon moved into
// the card, where HQ Assistant puts its own. The column stays max-w-2xl - a
// short pitch should not be stretched to the Assistant's width just to match
// it, and PageHeader's note says as much: header grammar, not column width.
const POINTS = [
  'Agree what each person will deliver, and how, in one place',
  'Check in through the year so there are no year-end surprises',
  'Self-appraisal, manager review and sign-off without the paper chase',
  'A development plan that writes itself from the gaps you just rated',
]

export default function PpadUpsell({ bizName }: { bizName: string }) {
  return (
    <div className="flex-1 overflow-y-auto bg-bg text-ink">
      <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
        <PageHeader
          eyebrow="HQ Tools"
          title="HQ Performance"
          subtitle={`Performance planning and appraisals for ${bizName}. Plan, perform, assess, develop - one cycle a year, without the spreadsheet.`}
        />

        <div className="rounded-3xl border border-border bg-bg-elevated p-6 shadow-card sm:p-8">
          <span
            aria-hidden
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-bg-soft text-ink-muted"
          >
            <RiLineChartLine className="h-5 w-5" />
          </span>

          <h2 className="mt-4 font-display text-base font-bold tracking-tight text-ink sm:text-lg">
            What you get
          </h2>

          <ul className="mt-4 flex flex-col gap-3">
            {POINTS.map(p => (
              <li key={p} className="flex items-start gap-2.5">
                <RiCheckLine className="mt-0.5 h-4 w-4 flex-shrink-0 text-accent" aria-hidden />
                <span className="text-sm leading-snug text-ink-soft">{p}</span>
              </li>
            ))}
          </ul>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link
              href="/dashboard/settings"
              className="inline-flex rounded-full bg-accent px-5 py-2.5 text-sm font-bold text-ink-on-accent transition-colors hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              Talk to us about adding it
            </Link>
            <span className="text-xs text-ink-muted">
              We set it up with you - it is not self-serve yet.
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
