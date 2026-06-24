// Shared marketing footer for the public site. Multi-column layout modelled
// on a richer SaaS footer: brand block, link columns, social row, an
// "AI summary" prompt row, and a bottom bar. Ink palette, design tokens only.

import Link from 'next/link'

const COLUMNS: { heading: string; links: { label: string; href: string }[] }[] = [
  {
    heading: 'Product',
    links: [
      { label: 'HQ People', href: '/product/people' },
      { label: 'HQ Recruit', href: '/product/recruit' },
      { label: 'Pricing', href: '/pricing' },
      { label: 'Pay-as-you-go documents', href: '/#marketplace' },
    ],
  },
  {
    heading: 'Use cases',
    links: [
      { label: 'For pubs and hospitality', href: '/#tools' },
      { label: 'For trades', href: '/#tools' },
      { label: 'For retail', href: '/#tools' },
      { label: 'For clinics and allied health', href: '/#tools' },
      { label: 'For professional services', href: '/#tools' },
    ],
  },
  {
    heading: 'Resources',
    links: [
      { label: 'Pricing', href: '/pricing' },
      { label: 'Enterprise', href: '/enterprise' },
      { label: 'Contact', href: '/contact' },
      { label: 'Sign in', href: '/login' },
    ],
  },
  {
    heading: 'Company',
    links: [
      { label: 'About', href: '/about' },
      { label: 'Enterprise', href: '/enterprise' },
      { label: 'Contact', href: '/contact' },
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

// Pre-filled AI summary query, URL-encoded once and reused per engine.
const AI_QUERY = encodeURIComponent(
  'What is HQ.ai (hqai.vercel.app), the Australian AI HR and recruitment tool, and who is it for?',
)

const AI_SUMMARY_LINKS: { label: string; href: string }[] = [
  { label: 'ChatGPT', href: `https://chat.openai.com/?q=${AI_QUERY}` },
  { label: 'Claude', href: `https://claude.ai/new?q=${AI_QUERY}` },
  { label: 'Perplexity', href: `https://www.perplexity.ai/search?q=${AI_QUERY}` },
  { label: 'Google', href: `https://www.google.com/search?q=${AI_QUERY}` },
]

const SOCIAL_LINKS: { label: string; href: string; icon: 'linkedin' | 'x' }[] = [
  { label: 'HQ.ai on LinkedIn', href: 'https://www.linkedin.com/company/humanistiqs', icon: 'linkedin' },
]

function SocialIcon({ icon }: { icon: 'linkedin' | 'x' }) {
  if (icon === 'linkedin') {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.6} aria-hidden="true">
        <rect x="3" y="3" width="18" height="18" rx="3" />
        <path d="M7 10v7" strokeLinecap="round" />
        <path d="M7 7v.01" strokeLinecap="round" />
        <path d="M11 17v-4a2 2 0 0 1 4 0v4" strokeLinecap="round" />
        <path d="M11 17v-7" strokeLinecap="round" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.6} aria-hidden="true">
      <path d="M4 4l16 16M20 4L4 20" strokeLinecap="round" />
    </svg>
  )
}

export default function MarketingFooter() {
  return (
    <footer className="border-t border-border bg-bg">
      <div className="mx-auto max-w-7xl px-6 py-14 md:px-10">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_3fr]">
          {/* Brand block */}
          <div className="max-w-sm">
            <p className="font-display text-lg font-bold tracking-tight text-ink">HQ.ai</p>
            <p className="mt-3 text-sm leading-relaxed text-ink-soft">
              AI for the everyday HR and hiring questions, built on the Fair Work Act and your award.
              A Humanistiqs product.
            </p>
            <p className="mt-4 text-xs leading-relaxed text-ink-muted">
              Built on the Fair Work Act and all 122 awards. Hosted in Sydney. Made in Australia.
            </p>

            {/* Social row */}
            <div className="mt-6 flex items-center gap-3">
              {SOCIAL_LINKS.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-ink-muted transition-colors hover:text-ink"
                >
                  <SocialIcon icon={s.icon} />
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 md:grid-cols-5">
            {COLUMNS.map((col) => (
              <div key={col.heading}>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">{col.heading}</p>
                <ul className="mt-4 space-y-2.5">
                  {col.links.map((l, i) => (
                    <li key={`${l.label}-${i}`}>
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

        {/* AI summary row */}
        <div className="mt-12 rounded-2xl border border-border bg-bg-elevated px-5 py-5 shadow-card sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-medium text-ink">Get an AI summary of HQ.ai</p>
            <div className="flex flex-wrap gap-2">
              {AI_SUMMARY_LINKS.map((a) => (
                <a
                  key={a.label}
                  href={a.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full border border-border px-4 py-1.5 text-xs font-medium text-ink-soft transition-colors hover:border-ink hover:text-ink"
                >
                  {a.label}
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 flex flex-col gap-2 border-t border-border pt-6 text-xs text-ink-muted sm:flex-row sm:items-center sm:justify-between">
          <p>&copy; {2026} Rayner Consulting Group Pty Ltd, trading as Humanistiqs. All rights reserved.</p>
          <p>Australian employment law only - Fair Work Act, the national standards, and your award.</p>
        </div>
      </div>
    </footer>
  )
}
