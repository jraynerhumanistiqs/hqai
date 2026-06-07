'use client'

// Shared marketing top navigation. Persistent across the public site
// (home, enterprise, contact, marketplace, legal) so the pages read as
// one site. Ink palette to match the dashboard-aligned public theme.

import Link from 'next/link'
import Image from 'next/image'
import { useState } from 'react'

const NAV = [
  { label: 'Pricing', href: '/#pricing' },
  { label: 'Enterprise', href: '/enterprise' },
  { label: 'Documents', href: '/#marketplace' },
  { label: 'Contact', href: '/contact' },
]

export default function MarketingHeader() {
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 md:px-10">
        <Link href="/" aria-label="HQ.ai home" className="flex items-center">
          <Image src="/logo-black.svg" alt="HQ.ai" width={1760} height={570} className="h-7 w-auto" priority />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-7 md:flex">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className="text-sm text-ink-soft transition-colors hover:text-ink">
              {item.label}
            </Link>
          ))}
          <Link href="/login" className="text-sm text-ink-soft transition-colors hover:text-ink">
            Sign in
          </Link>
          <Link
            href="/signup"
            className="inline-flex h-10 items-center justify-center rounded-full bg-accent px-5 text-sm font-semibold text-ink-on-accent transition-colors hover:bg-accent-hover"
          >
            Start the trial
          </Link>
        </nav>

        {/* Mobile toggle */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full text-ink md:hidden"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
            {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M3 6h18M3 12h18M3 18h18" />}
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <nav className="border-t border-border bg-bg px-6 py-4 md:hidden">
          <div className="flex flex-col gap-1">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-2 py-2.5 text-sm text-ink-soft hover:bg-bg-soft hover:text-ink"
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="rounded-lg px-2 py-2.5 text-sm text-ink-soft hover:bg-bg-soft hover:text-ink"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              onClick={() => setOpen(false)}
              className="mt-2 inline-flex h-11 items-center justify-center rounded-full bg-accent px-5 text-sm font-semibold text-ink-on-accent hover:bg-accent-hover"
            >
              Start the trial
            </Link>
          </div>
        </nav>
      )}
    </header>
  )
}
