'use client'

// Shared marketing top navigation. Persistent across the public site so
// the pages read as one site. Ink palette to match the dashboard-aligned
// public theme. Product is a small dropdown (HQ People / HQ Recruit).

import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'

const PRODUCTS = [
  { label: 'HQ People', href: '/product/people', blurb: 'AI HR advisor that cites the law' },
  { label: 'HQ Recruit', href: '/product/recruit', blurb: 'Score CVs, pre-screen, shortlist' },
]

const NAV = [
  { label: 'Pricing', href: '/pricing' },
  { label: 'Enterprise', href: '/enterprise' },
  { label: 'About', href: '/about' },
  { label: 'Contact', href: '/contact' },
]

export default function MarketingHeader() {
  const [open, setOpen] = useState(false)
  const [productOpen, setProductOpen] = useState(false)
  const productRef = useRef<HTMLDivElement | null>(null)

  // Close the product dropdown on outside click.
  useEffect(() => {
    if (!productOpen) return
    function onDoc(e: MouseEvent) {
      if (productRef.current && !productRef.current.contains(e.target as Node)) setProductOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [productOpen])

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 md:px-10">
        <Link href="/" aria-label="HQ.ai home" className="flex items-center">
          <Image src="/logo-black.svg" alt="HQ.ai" width={1760} height={570} className="h-7 w-auto" priority />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-7 md:flex">
          <div className="relative" ref={productRef}>
            <button
              type="button"
              onClick={() => setProductOpen((v) => !v)}
              aria-expanded={productOpen}
              className="inline-flex items-center gap-1 text-sm text-ink-soft transition-colors hover:text-ink"
            >
              Product
              <svg viewBox="0 0 12 12" className={`h-3 w-3 transition-transform ${productOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M3 4.5L6 7.5L9 4.5" />
              </svg>
            </button>
            {productOpen && (
              <div className="absolute left-0 top-9 w-64 rounded-2xl border border-border bg-bg-elevated p-2 shadow-float">
                {PRODUCTS.map((p) => (
                  <Link
                    key={p.href}
                    href={p.href}
                    onClick={() => setProductOpen(false)}
                    className="block rounded-xl px-3 py-2.5 hover:bg-bg-soft"
                  >
                    <span className="block text-sm font-semibold text-ink">{p.label}</span>
                    <span className="block text-xs text-ink-muted">{p.blurb}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
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
            className="inline-flex h-10 items-center justify-center rounded-full bg-clay px-5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
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
            <p className="px-2 pt-1 pb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-muted">Product</p>
            {PRODUCTS.map((p) => (
              <Link
                key={p.href}
                href={p.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-2 py-2.5 text-sm text-ink-soft hover:bg-bg-soft hover:text-ink"
              >
                {p.label}
              </Link>
            ))}
            <div className="my-1 h-px bg-border" />
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
              className="mt-2 inline-flex h-11 items-center justify-center rounded-full bg-clay px-5 text-sm font-semibold text-white hover:opacity-90"
            >
              Start the trial
            </Link>
          </div>
        </nav>
      )}
    </header>
  )
}
