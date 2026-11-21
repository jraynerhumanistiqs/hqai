'use client'

// Shared marketing top navigation. Persistent across the public site so
// the pages read as one site. Ink palette to match the dashboard-aligned
// public theme. Product is a small dropdown (HQ People / HQ Recruit).

import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'

// Every public marketing page renders this header, so it is the single
// place that flags the marketing theme scope on <html>. The dark
// (inverted) marketing palette lives under [data-app="marketing"] in
// globals.css, so it applies only to pages with this nav - login,
// onboarding and the dashboard are unaffected.
//

function useMarketingScope() {
  useEffect(() => {
    if (typeof document === 'undefined') return
    const html = document.documentElement
    const prev = html.getAttribute('data-app')
    if (prev !== 'marketing') html.setAttribute('data-app', 'marketing')
    return () => {
      // The inline script above has no cleanup of its own, so only hand
      // back a value that was genuinely something else before us.
      if (prev && prev !== 'marketing') html.setAttribute('data-app', prev)
      else html.removeAttribute('data-app')
    }
  }, [])
}

const PRODUCTS = [
  { label: 'HQ People', href: '/product/people', blurb: 'AI HR help for the everyday people questions' },
  { label: 'HQ Recruit', href: '/product/recruit', blurb: 'Score CVs, pre-screen, shortlist' },
  { label: 'Outsourced HR & Recruitment', href: '/outsourcing', blurb: 'A dedicated advisor on call - HR365 & Recruit365' },
  { label: 'Marketplace', href: '/marketplace', blurb: 'Coming soon' },
]

const NAV = [
  { label: 'Pricing', href: '/pricing' },
  { label: 'About', href: '/about' },
  { label: 'Contact', href: '/contact' },
]

export default function MarketingHeader() {
  useMarketingScope()
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

  // Escape closes whichever menu is open. An outside mousedown was the
  // only dismissal, so a keyboard user had no way to back out of either
  // menu and tabbing past the dropdown left it hanging over the page.
  useEffect(() => {
    if (!productOpen && !open) return
    function onKey(e: KeyboardEvent) {
      if (e.key !== 'Escape') return
      setProductOpen(false)
      setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [productOpen, open])

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4 md:px-10">
        <Link href="/" aria-label="HQ.ai home" className="flex items-center">
          {/* The lockup renders at 28px tall (about 108px wide), so the
              declared 1047x272 had Next preloading a 1080px-wide PNG for
              it on every marketing page. These are the same 3.85:1 ratio
              at 2x the painted size, which is what the srcset should be
              choosing from. */}
          <Image src="/logo/png/hqai-lockup-white.png" alt="HQ.ai" width={216} height={56} className="h-7 w-auto" priority />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-7 md:flex">
          <div className="relative" ref={productRef}>
            <button
              type="button"
              onClick={() => setProductOpen((v) => !v)}
              aria-expanded={productOpen}
              aria-haspopup="true"
              aria-controls="marketing-products-menu"
              className="inline-flex items-center gap-1 text-sm text-ink-soft transition-colors hover:text-ink"
            >
              Products
              <svg aria-hidden="true" viewBox="0 0 12 12" className={`h-3 w-3 transition-transform ${productOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M3 4.5L6 7.5L9 4.5" />
              </svg>
            </button>
            {productOpen && (
              <div id="marketing-products-menu" className="absolute left-0 top-9 w-72 rounded-2xl border border-border bg-bg-elevated p-2 shadow-float">
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
            className="inline-flex h-10 items-center justify-center rounded-full bg-clay px-5 text-sm font-semibold text-ink-on-clay transition-colors hover:bg-clay-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay"
          >
            Get started
          </Link>
        </nav>

        {/* Mobile toggle */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          aria-controls="marketing-mobile-menu"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full text-ink md:hidden"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
            {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M3 6h18M3 12h18M3 18h18" />}
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <nav id="marketing-mobile-menu" className="border-t border-border bg-bg px-6 py-4 md:hidden">
          <div className="flex flex-col gap-1">
            <p className="px-2 pt-1 pb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-muted">Products</p>
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
              className="mt-2 inline-flex h-11 items-center justify-center rounded-full bg-clay px-5 text-sm font-semibold text-ink-on-clay transition-colors hover:bg-clay-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay"
            >
              Get started
            </Link>
          </div>
        </nav>
      )}
    </header>
  )
}
