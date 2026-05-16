import type { Config } from 'tailwindcss'

// HQ.ai Brand Kit v4 (dual-theme: data-app="marketing" + data-app="product").
//
// Source: docs/research/2026-05-16_brand-kit-benchmark.md section 4.4 +
// section 5.2 sketch. Tokens are emitted as CSS variables in
// app/globals.css under :root, [data-app="marketing"], and
// [data-app="product"]; this Tailwind config consumes those variables
// via the shadcn-style `var(--token)` pattern so a single root attribute
// switch repaints the whole UI.
//
// Why CSS variables instead of build-time theme objects:
//   - one binary instead of per-theme bundles
//   - lets the runtime ThemeProvider (next-themes) switch light/dark
//     within either app
//   - keeps generated DOCX/PDF outputs deterministic (they never read
//     these vars and always render in their own theme)

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: ['class'],
  theme: {
    extend: {
      colors: {
        // ── Semantic tokens (resolved from CSS vars at runtime) ─────
        // Surface
        bg:               'var(--bg)',
        'bg-soft':        'var(--bg-soft)',
        'bg-elevated':    'var(--bg-elevated)',
        'surface-inverse': 'var(--surface-inverse, #000000)',
        // Text
        ink:              'var(--ink)',
        'ink-soft':       'var(--ink-soft)',
        'ink-muted':      'var(--ink-muted)',
        'ink-on-accent':  'var(--ink-on-accent)',
        // Brand accent
        accent:           'var(--accent)',
        'accent-hover':   'var(--accent-hover)',
        'accent-soft':    'var(--accent-soft)',
        // Border + decoration
        border:           'var(--border)',
        'border-strong':  'var(--border-strong)',
        // Semantic (resolved per theme)
        danger:           'var(--danger)',
        warning:          'var(--warning)',
        success:          'var(--success)',
        info:             'var(--info)',

        // ── Legacy aliases kept so the ~hundreds of existing
        //    `text-charcoal` / `text-mid` / `text-muted` / `bg-light`
        //    callsites keep rendering. Each maps to a token via CSS
        //    var so the dual-theme swap still flows through. The old
        //    hex literals stay as fallbacks for build-time safety. ──
        black:    '#000000',
        white:    '#FFFFFF',
        charcoal: 'var(--ink, #1F1F1F)',
        mid:      'var(--ink-soft, #4b4b4b)',
        // A0.1 fix - was #afafaf (2.6:1, AA fail). Resolves to
        // ink-muted in either Option 2 or Option 3 at >= 4.6:1.
        muted:    'var(--ink-muted, #5e5d59)',
        'muted-decor': '#afafaf',
        light:    'var(--bg-soft, #efefef)',

        // Pre-existing alias tokens that the codebase uses verbatim.
        // Now sourced from the active theme.
        accent2:  'var(--accent-hover, #1a1a1a)',
        accent3:  'var(--bg-soft, #efefef)',
      },

      fontFamily: {
        sans:    ['var(--font-inter)', 'Inter', 'DM Sans', 'system-ui', 'sans-serif'],
        // A2 - Fraunces is the marketing display face (Option 2).
        // Product chrome still inherits sans via the body rule in
        // globals.css; this is the explicit hook for h1/display.
        serif:   ['var(--font-fraunces)', 'Fraunces', 'Georgia', 'serif'],
        display: ['var(--font-display, var(--font-fraunces))', 'Fraunces', 'Inter', 'sans-serif'],
        mono:    ['var(--font-geist-mono)', 'Geist Mono', 'JetBrains Mono', 'ui-monospace', 'monospace'],
      },

      fontSize: {
        // Mid-point between Option 2 (marketing) and Option 3 (product)
        // sizes. Per-theme overrides happen via CSS vars on display/h1
        // utilities; this base scale is shared.
        'display': ['56px', { lineHeight: '1.07', letterSpacing: '-0.025em' }],
        'h1':      ['40px', { lineHeight: '1.10', letterSpacing: '-0.02em' }],
        'h2':      ['28px', { lineHeight: '1.20', letterSpacing: '-0.015em' }],
        'h3':      ['20px', { lineHeight: '1.30', letterSpacing: '-0.01em' }],
        'body':    ['16px', { lineHeight: '1.55' }],
        'small':   ['14px', { lineHeight: '1.50' }],
        'xs':      ['12px', { lineHeight: '1.45' }],
      },

      borderRadius: {
        'sm':    'var(--radius-sm, 4px)',
        'md':    'var(--radius-md, 8px)',
        'lg':    'var(--radius-lg, 12px)',
        'xl':    'var(--radius-xl, 16px)',
        '2xl':   'var(--radius-panel, 20px)',
        'panel': 'var(--radius-panel, 20px)',
      },

      boxShadow: {
        // Mercury/Anthropic discipline - shadows reserved for floating
        // overlays; cards rely on border + bg lift instead.
        'hairline': 'var(--shadow-hairline)',
        'card':     'var(--shadow-card)',
        'float':    'var(--shadow-float)',
        'modal':    'var(--shadow-modal)',
        'popover':  'var(--shadow-popover, var(--shadow-float))',
        'cmd':      'var(--shadow-cmd, var(--shadow-modal))',
      },

      spacing: { 'sidebar': '248px' },

      transitionTimingFunction: {
        'smooth':     'var(--ease-smooth, cubic-bezier(0.16, 1, 0.3, 1))',
        'natural':    'var(--ease-natural, cubic-bezier(0.4, 0, 0.2, 1))',
        'decelerate': 'var(--ease-decelerate, cubic-bezier(0, 0, 0.2, 1))',
        'spring':     'var(--ease-spring, cubic-bezier(0.34, 1.56, 0.64, 1))',
      },
      transitionDuration: {
        'instant': 'var(--duration-instant, 100ms)',
        'fast':    'var(--duration-fast, 150ms)',
        'base':    'var(--duration-base, 200ms)',
        'slow':    'var(--duration-slow, 300ms)',
        'slower':  'var(--duration-slower, 500ms)',
      },

      minHeight: {
        // A0.7 - 44px is the WCAG 2.1 AA touch target minimum.
        // Use `min-h-touch` on icon-only buttons and modal close.
        'touch': '44px',
      },
      minWidth: { 'touch': '44px' },
    },
  },
  plugins: [require('tailwindcss-animate')],
}
export default config
