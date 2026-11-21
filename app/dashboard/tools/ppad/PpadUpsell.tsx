import Link from 'next/link'
import { RiCheckLine, RiLineChartLine } from '@remixicon/react'

// Shown when a business does not have the HQ Performance add-on.
//
// The HQ Tools tab is visible to everyone (owner's call - it is the upsell
// surface), so this is what most businesses see behind it. Copy leads on the
// busywork removed, not on compliance or law: HQ.ai never positions itself as
// advising on employment law.
//
// One filled accent CTA, outline card, no gradients - the house rules.
const POINTS = [
  'Agree what each person will deliver, and how, in one place',
  'Check in through the year so there are no year-end surprises',
  'Self-appraisal, manager review and sign-off without the paper chase',
  'A development plan that writes itself from the gaps you just rated',
]

export default function PpadUpsell({ bizName }: { bizName: string }) {
  return (
    <div className="flex-1 overflow-y-auto bg-bg text-ink">
      <div className="mx-auto max-w-2xl px-4 sm:px-8 pt-8 pb-10">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-bg-soft text-ink-soft">
          <RiLineChartLine className="h-5 w-5" aria-hidden />
        </span>

        <h1 className="mt-4 font-display text-2xl sm:text-3xl font-bold tracking-tight text-ink">
          HQ Performance
        </h1>
        <p className="mt-2 text-base leading-relaxed text-ink-muted">
          Performance planning and appraisals for {bizName}. Plan, perform,
          assess, develop - one cycle a year, without the spreadsheet.
        </p>

        <div className="mt-7 rounded-3xl border border-border bg-bg-elevated p-6 shadow-card">
          <h2 className="font-display text-lg font-bold tracking-tight text-ink">
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
              className="inline-flex items-center rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-ink-on-accent transition-colors hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
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
