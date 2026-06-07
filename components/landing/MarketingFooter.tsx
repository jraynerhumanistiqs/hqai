// Shared marketing footer for the public site. Plain links, brand line,
// legal, and the Australian-built trust note. Ink palette.

import Link from 'next/link'

const COLUMNS: { heading: string; links: { label: string; href: string }[] }[] = [
  {
    heading: 'Product',
    links: [
      { label: 'HQ People', href: '/#product' },
      { label: 'HQ Recruit', href: '/#product' },
      { label: 'Pricing', href: '/#pricing' },
      { label: 'Pay-as-you-go documents', href: '/#marketplace' },
    ],
  },
  {
    heading: 'Company',
    links: [
      { label: 'Enterprise', href: '/enterprise' },
      { label: 'Contact', href: '/contact' },
      { label: 'Sign in', href: '/login' },
      { label: 'Start the trial', href: '/signup' },
    ],
  },
  {
    heading: 'Legal',
    links: [
      { label: 'Privacy', href: '/privacy' },
      { label: 'Terms', href: '/terms' },
    ],
  },
]

export default function MarketingFooter() {
  return (
    <footer className="border-t border-border bg-bg-soft">
      <div className="mx-auto max-w-7xl px-6 py-14 md:px-10">
        <div className="grid gap-10 md:grid-cols-[2fr_3fr]">
          {/* Brand */}
          <div className="max-w-sm">
            <p className="font-display text-lg font-bold tracking-tight text-ink">HQ.ai</p>
            <p className="mt-3 text-sm leading-relaxed text-ink-soft">
              The AI HR and hiring advisor built on the Fair Work Act, the NES, and your Modern Award.
              A Humanistiqs product.
            </p>
            <p className="mt-4 text-xs text-ink-muted">
              Grounded in the Fair Work Act 2009 + 122 Modern Awards. Hosted in Sydney. Built in Australia.
            </p>
          </div>

          {/* Link columns */}
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            {COLUMNS.map((col) => (
              <div key={col.heading}>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">{col.heading}</p>
                <ul className="mt-4 space-y-2.5">
                  {col.links.map((l) => (
                    <li key={l.label}>
                      <Link href={l.href} className="text-sm text-ink-soft transition-colors hover:text-ink">
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-2 border-t border-border pt-6 text-xs text-ink-muted sm:flex-row sm:items-center sm:justify-between">
          <p>&copy; {2026} Rayner Consulting Group Pty Ltd, trading as Humanistiqs. All rights reserved.</p>
          <p>Australian employment law only - Fair Work Act, NES, Modern Awards.</p>
        </div>
      </div>
    </footer>
  )
}
