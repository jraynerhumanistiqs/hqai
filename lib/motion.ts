// A2 - GSAP defaults aligned to the brand-kit motion tokens.
// Source: docs/research/2026-05-16_brand-kit-benchmark.md section 5.4.
//
// All durations / easings here mirror the CSS variables in
// app/globals.css so a single source of truth applies across both CSS
// transitions and JS-driven animations. prefers-reduced-motion is
// handled at the CSS-var level in globals.css, which means GSAP picks
// up a near-zero duration automatically.

import { gsap } from 'gsap'

// Read the canonical duration tokens off the CSS variables so a future
// theme change doesn't require touching this file. Falls back to the
// Option 2 / Option 3 base values when the variable is unset (eg in
// server-side renders or test runs).
function readDurationVar(name: string, fallbackMs: number): number {
  if (typeof window === 'undefined' || typeof document === 'undefined') return fallbackMs / 1000
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  if (!raw) return fallbackMs / 1000
  // Browsers return "200ms" or "0.2s"; normalise to seconds.
  if (raw.endsWith('ms')) return Math.max(0.001, parseFloat(raw) / 1000)
  if (raw.endsWith('s'))  return Math.max(0.001, parseFloat(raw))
  return fallbackMs / 1000
}

// GSAP-level defaults that the rest of the app inherits.
gsap.defaults({ ease: 'power2.out', duration: readDurationVar('--duration-base', 200) })

export const M = {
  fadeIn:  (el: gsap.TweenTarget) =>
    gsap.from(el, { opacity: 0, y: 8, duration: readDurationVar('--duration-base', 200), ease: 'power2.out' }),
  slideUp: (el: gsap.TweenTarget) =>
    gsap.from(el, { opacity: 0, y: 16, duration: readDurationVar('--duration-slow', 300), ease: 'expo.out' }),
  stagger: (els: gsap.TweenTarget) =>
    gsap.from(els, { opacity: 0, y: 8, duration: readDurationVar('--duration-base', 200), stagger: 0.06, ease: 'power2.out' }),
  modalIn: (el: gsap.TweenTarget) =>
    gsap.fromTo(el,
      { opacity: 0, scale: 0.96 },
      { opacity: 1, scale: 1, duration: readDurationVar('--duration-slow', 240), ease: 'expo.out' },
    ),
}
