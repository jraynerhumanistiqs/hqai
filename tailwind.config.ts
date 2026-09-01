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
        // Label on a --danger fill. Separate from ink-on-accent because
        // the product preset makes the accent yellow (so its label is a
        // dark amber-brown) while danger stays a saturated red that
        // still needs a white label in light / near-black in dark.
        // Falls back to ink-on-accent so marketing is unchanged.
        'ink-on-danger':  'var(--ink-on-danger, var(--ink-on-accent))',
        // Brand accent (public = ink; product = Clay, via data-app scope)
        accent:           'var(--accent)',
        'accent-hover':   'var(--accent-hover)',
        'accent-soft':    'var(--accent-soft)',
        // Brand accent (Wattle Gold). Token name "clay" kept for the
        // existing callsites; value repointed in globals.css. Rationed:
        // CTAs, links, focus, citation signature. `clay-ink` = AA gold
        // text on light surfaces; `clay-hover` = pill hover.
        clay:             'var(--accent-clay, #E8B23A)',
        'clay-hover':     'var(--accent-clay-hover, #D9A52E)',
        'clay-soft':      'var(--accent-clay-soft, #F7EBCB)',
        'clay-ink':       'var(--accent-clay-ink, #8A6D12)',
        // Border + decoration
        border:           'var(--border)',
        'border-strong':  'var(--border-strong)',

        // ── Product chrome + data viz (shadcn preset b1YmvCmim) ────
        // Defined only under [data-app="product"] in globals.css; the
        // fallbacks keep these resolvable on marketing, which does not
        // use them. `sidebar*` is the nav-rail surface; `chart-1..5` is
        // the preset's blue series ramp, deliberately not the brand
        // yellow so a data series never reads as an interactive accent.
        sidebar:                 'var(--sidebar, var(--bg))',
        'sidebar-ink':           'var(--sidebar-ink, var(--ink))',
        'sidebar-accent':        'var(--sidebar-accent, var(--bg-soft))',
        'sidebar-accent-ink':    'var(--sidebar-accent-ink, var(--ink))',
        'sidebar-primary':       'var(--sidebar-primary, var(--accent-clay))',
        'sidebar-primary-ink':   'var(--sidebar-primary-ink, var(--ink-on-accent))',
        'chart-1':               'var(--chart-1, #8EC5FF)',
        'chart-2':               'var(--chart-2, #2B7FFF)',
        'chart-3':               'var(--chart-3, #155DFC)',
        'chart-4':               'var(--chart-4, #1447E6)',
        'chart-5':               'var(--chart-5, #193CB8)',
        // Semantic (resolved per theme)
        danger:           'var(--danger)',
        warning:          'var(--warning)',
        success:          'var(--success)',
        info:             'var(--info)',

        // ── shadcn / Vercel AI Elements token bridge ──────────────
        // AI Elements (components/ai-elements/*) is authored against
        // shadcn's semantic token names. Rather than inject shadcn's
        // own oklch :root/.dark block (which would fork the design
        // system), we MAP those names onto the existing Wattle Gold
        // CSS vars so the AI Elements primitives repaint per-theme for
        // free and stay 100% brand-consistent. These names are not used
        // anywhere else in the app, so the aliases are purely additive.
        // NB: `accent`/`accent-hover`/`accent-soft` are already defined
        // above as the brand CTA colour; we only add the missing
        // `accent-foreground` companion here.
        background:              'var(--bg)',
        foreground:              'var(--ink)',
        card:                    'var(--bg-elevated)',
        'card-foreground':       'var(--ink)',
        popover:                 'var(--bg-elevated)',
        'popover-foreground':    'var(--ink)',
        primary:                 'var(--accent)',
        'primary-foreground':    'var(--ink-on-accent)',
        secondary:               'var(--bg-soft)',
        'secondary-foreground':  'var(--ink)',
        'muted-foreground':      'var(--ink-muted)',
        'accent-foreground':     'var(--ink)',
        destructive:             'var(--danger)',
        'destructive-foreground':'var(--ink-on-danger, var(--ink-on-accent))',
        input:                   'var(--input, var(--border))',
        ring:                    'var(--ring, var(--accent))',

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

      // ── Per-utility overrides of `accent` (Aug 2026) ──────────────
      // The product accent is Wattle Gold (#E8B23A). That is
      // fine as a FILL but fails as ink or as a focus indicator on a
      // white page. Rather than rewrite ~160 callsites, we repoint the
      // three utility families that read accent as a line/label colour
      // at their own scoped vars. Both vars are defined only under
      // [data-app="product"], so every marketing callsite falls back to
      // var(--accent) and renders exactly as it does today.

      // text-accent -> --accent-text. Gold text on white is 1.9:1;
      // the product value is the AA-safe amber (#733E0A light,
      // #F0B100 dark). ~39 callsites, ~25 of them in product.
      textColor: {
        accent: 'var(--accent-text, var(--accent))',
      },
      // ring-accent -> --ring, the preset's neutral grey. A yellow
      // focus ring on white is ~1.6:1, i.e. no visible focus state.
      // Caveat: this only reaches the plain `ring-accent` form. Tailwind
      // v3 cannot apply an opacity modifier to a bare var() colour, so
      // the ~120 `ring-accent/30` callsites emit no rule at all and have
      // never rendered a ring. Pre-existing and NOT fixed here - the fix
      // is to move the whole token system to channel triplets
      // (`--accent: 253 199 0` + `rgb(var(--accent) / <alpha-value>)`),
      // which would also touch :root and marketing.
      ringColor: {
        accent: 'var(--ring, var(--accent))',
      },
      // outline-accent -> --ring, same reasoning. Notably the paid-plan
      // banner CTA, which is a yellow pill that would otherwise draw a
      // yellow focus outline on itself.
      outlineColor: {
        accent: 'var(--ring, var(--accent))',
      },

      fontFamily: {
        // June 2026 repositioning pass. Geist = body/UI sans. Schibsted
        // Grotesque = display headlines (replaces Fraunces - a friendly
        // confident grotesque, not a literary serif). Mapped to both the
        // `display` and `serif` Tailwind tokens (and the legacy `fraunces`
        // alias) so existing className="font-display"/"font-serif"/
        // "font-fraunces" headlines all pick up the new face. Geist Mono =
        // caption/eyebrow micro-labels.
        // Aug 2026 - product surfaces move to Figtree (shadcn preset
        // b1YmvCmim). --font-app-sans / --font-app-heading are defined
        // ONLY under [data-app="product"] in globals.css, so marketing
        // falls through to the Geist / Schibsted pair unchanged. The
        // preset sets fontHeading to "inherit", which is why the
        // heading stacks take the same Figtree var as the body.
        sans:     ['var(--font-app-sans, var(--font-geist-sans))', 'Geist', 'system-ui', 'sans-serif'],
        serif:    ['var(--font-app-heading, var(--font-display))', 'Schibsted Grotesk', 'system-ui', 'sans-serif'],
        display:  ['var(--font-app-heading, var(--font-display))', 'Schibsted Grotesk', 'system-ui', 'sans-serif'],
        fraunces: ['var(--font-app-heading, var(--font-display))', 'Schibsted Grotesk', 'system-ui', 'sans-serif'],
        mono:     ['var(--font-geist-mono)', 'Geist Mono', 'JetBrains Mono', 'ui-monospace', 'monospace'],
      },

      fontSize: {
        // Serif display scale (Fraunces). Slightly larger + tighter than
        // the old grotesk scale so the editorial headline carries.
        'display': ['60px', { lineHeight: '1.05', letterSpacing: '-0.02em' }],
        'h1':      ['44px', { lineHeight: '1.08', letterSpacing: '-0.018em' }],
        'h2':      ['32px', { lineHeight: '1.15', letterSpacing: '-0.012em' }],
        'h3':      ['22px', { lineHeight: '1.30', letterSpacing: '-0.006em' }],
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
        // rounded-3xl previously fell through to Tailwind's stock
        // 1.5rem. --radius-3xl is only defined under
        // [data-app="product"], so the preset's 22px applies there and
        // marketing keeps the 1.5rem it renders today.
        '3xl':   'var(--radius-3xl, 1.5rem)',
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
