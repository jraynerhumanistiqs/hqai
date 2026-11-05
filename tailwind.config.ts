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
        //
        // TWO FORMS, AND THE DIFFERENCE MATTERS (Nov 2026)
        // ------------------------------------------------------------
        // Every token in app/globals.css is a CHANNEL TRIPLET
        // (`--warning: 168 70 0`), fed through `rgb()` with Tailwind's
        // `<alpha-value>` placeholder. That is the only form Tailwind v3
        // can apply an opacity modifier to, so this is what makes BOTH
        // `bg-warning` and `bg-warning/10` compile. While these were bare
        // `var()` hexes the ~380 `token/NN` callsites in the app emitted no
        // rule at all and rendered transparent.
        //
        //   plain  rgb(var(--x) / <alpha-value>)
        //   alpha  rgb(var(--x) / calc(var(--x-a, 1) * <alpha-value>))
        //
        // The ALPHA form is for the five tokens that carry their own
        // baked-in opacity in at least one theme (the values that used to be
        // written `rgba(...)`): accent-soft, clay-soft, border, border-strong
        // and input. `--x-a` is absent on opaque tokens and falls back to 1,
        // so the two forms behave identically there - but a token that gains
        // an `--x-a` and keeps the plain form would silently paint at full
        // opacity. Give a token an `--x-a`, switch its entry here too.
        //
        // Surface
        bg:               'rgb(var(--bg) / <alpha-value>)',
        'bg-soft':        'rgb(var(--bg-soft) / <alpha-value>)',
        'bg-elevated':    'rgb(var(--bg-elevated) / <alpha-value>)',
        'surface-inverse': 'rgb(var(--surface-inverse, 0 0 0) / <alpha-value>)',
        // Text
        ink:              'rgb(var(--ink) / <alpha-value>)',
        'ink-soft':       'rgb(var(--ink-soft) / <alpha-value>)',
        'ink-muted':      'rgb(var(--ink-muted) / <alpha-value>)',
        'ink-on-accent':  'rgb(var(--ink-on-accent) / <alpha-value>)',
        // Label on a --danger fill. Separate from ink-on-accent because
        // the product preset makes the accent yellow (so its label is a
        // dark amber-brown) while danger stays a saturated red that
        // still needs a white label in light / near-black in dark.
        // Falls back to ink-on-accent so marketing is unchanged.
        'ink-on-danger':  'rgb(var(--ink-on-danger, var(--ink-on-accent)) / <alpha-value>)',
        // Brand accent (public = ink; product = Clay, via data-app scope)
        accent:           'rgb(var(--accent) / <alpha-value>)',
        'accent-hover':   'rgb(var(--accent-hover) / <alpha-value>)',
        // alpha form - product light/dark bake a 16% / 18% gold tint in.
        'accent-soft':    'rgb(var(--accent-soft) / calc(var(--accent-soft-a, 1) * <alpha-value>))',
        // Brand accent (Wattle Gold). Token name "clay" kept for the
        // existing callsites; value repointed in globals.css. Rationed:
        // CTAs, links, focus, citation signature. `clay-ink` = AA gold
        // text on light surfaces; `clay-hover` = pill hover.
        clay:             'rgb(var(--accent-clay, 232 178 58) / <alpha-value>)',
        'clay-hover':     'rgb(var(--accent-clay-hover, 217 165 46) / <alpha-value>)',
        // alpha form - marketing and product bake a 14-18% gold tint in.
        'clay-soft':      'rgb(var(--accent-clay-soft, 247 235 203) / calc(var(--accent-clay-soft-a, 1) * <alpha-value>))',
        'clay-ink':       'rgb(var(--accent-clay-ink, 138 109 18) / <alpha-value>)',
        // Border + decoration. alpha form - product dark makes these white
        // hairlines at 10% / 20% so they sit correctly on page AND card.
        border:           'rgb(var(--border) / calc(var(--border-a, 1) * <alpha-value>))',
        'border-strong':  'rgb(var(--border-strong) / calc(var(--border-strong-a, 1) * <alpha-value>))',

        // ── Product chrome + data viz (shadcn preset b1YmvCmim) ────
        // Defined only under [data-app="product"] in globals.css; the
        // fallbacks keep these resolvable on marketing, which does not
        // use them. `sidebar*` is the nav-rail surface; `chart-1..5` is
        // the preset's blue series ramp, deliberately not the brand
        // yellow so a data series never reads as an interactive accent.
        sidebar:                 'rgb(var(--sidebar, var(--bg)) / <alpha-value>)',
        'sidebar-ink':           'rgb(var(--sidebar-ink, var(--ink)) / <alpha-value>)',
        'sidebar-accent':        'rgb(var(--sidebar-accent, var(--bg-soft)) / <alpha-value>)',
        'sidebar-accent-ink':    'rgb(var(--sidebar-accent-ink, var(--ink)) / <alpha-value>)',
        'sidebar-primary':       'rgb(var(--sidebar-primary, var(--accent-clay)) / <alpha-value>)',
        'sidebar-primary-ink':   'rgb(var(--sidebar-primary-ink, var(--ink-on-accent)) / <alpha-value>)',
        'chart-1':               'rgb(var(--chart-1, 142 197 255) / <alpha-value>)',
        'chart-2':               'rgb(var(--chart-2, 43 127 255) / <alpha-value>)',
        'chart-3':               'rgb(var(--chart-3, 21 93 252) / <alpha-value>)',
        'chart-4':               'rgb(var(--chart-4, 20 71 230) / <alpha-value>)',
        'chart-5':               'rgb(var(--chart-5, 25 60 184) / <alpha-value>)',
        // Semantic (resolved per theme)
        danger:           'rgb(var(--danger) / <alpha-value>)',
        warning:          'rgb(var(--warning) / <alpha-value>)',
        success:          'rgb(var(--success) / <alpha-value>)',
        info:             'rgb(var(--info) / <alpha-value>)',

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
        background:              'rgb(var(--bg) / <alpha-value>)',
        foreground:              'rgb(var(--ink) / <alpha-value>)',
        card:                    'rgb(var(--bg-elevated) / <alpha-value>)',
        'card-foreground':       'rgb(var(--ink) / <alpha-value>)',
        popover:                 'rgb(var(--bg-elevated) / <alpha-value>)',
        'popover-foreground':    'rgb(var(--ink) / <alpha-value>)',
        primary:                 'rgb(var(--accent) / <alpha-value>)',
        'primary-foreground':    'rgb(var(--ink-on-accent) / <alpha-value>)',
        secondary:               'rgb(var(--bg-soft) / <alpha-value>)',
        'secondary-foreground':  'rgb(var(--ink) / <alpha-value>)',
        'muted-foreground':      'rgb(var(--ink-muted) / <alpha-value>)',
        'accent-foreground':     'rgb(var(--ink) / <alpha-value>)',
        destructive:             'rgb(var(--danger) / <alpha-value>)',
        'destructive-foreground':'rgb(var(--ink-on-danger, var(--ink-on-accent)) / <alpha-value>)',
        // alpha form - --input is a 15% white hairline in product dark, and
        // its --border fallback is a 10% one, so BOTH alphas are in the chain.
        input:                   'rgb(var(--input, var(--border)) / calc(var(--input-a, var(--border-a, 1)) * <alpha-value>))',
        ring:                    'rgb(var(--ring, var(--accent)) / <alpha-value>)',

        // ── Legacy aliases kept so the ~hundreds of existing
        //    `text-charcoal` / `text-mid` / `text-muted` / `bg-light`
        //    callsites keep rendering. Each maps to a token via CSS
        //    var so the dual-theme swap still flows through. The old
        //    hex literals stay as fallbacks for build-time safety. ──
        // Literal hex, not tokens - Tailwind handles their opacity natively.
        black:    '#000000',
        white:    '#FFFFFF',
        charcoal: 'rgb(var(--ink, 31 31 31) / <alpha-value>)',
        mid:      'rgb(var(--ink-soft, 75 75 75) / <alpha-value>)',
        // A0.1 fix - was #afafaf (2.6:1, AA fail). Resolves to
        // ink-muted in either Option 2 or Option 3 at >= 4.6:1.
        muted:    'rgb(var(--ink-muted, 94 93 89) / <alpha-value>)',
        'muted-decor': '#afafaf',
        light:    'rgb(var(--bg-soft, 239 239 239) / <alpha-value>)',

        // Pre-existing alias tokens that the codebase uses verbatim.
        // Now sourced from the active theme.
        accent2:  'rgb(var(--accent-hover, 26 26 26) / <alpha-value>)',
        accent3:  'rgb(var(--bg-soft, 239 239 239) / <alpha-value>)',
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
        accent: 'rgb(var(--accent-text, var(--accent)) / <alpha-value>)',
      },
      // ring-accent -> --ring, the preset's neutral grey. A yellow
      // focus ring on white is ~1.6:1, i.e. no visible focus state.
      // Nov 2026: the modifier form works now. While the tokens were bare
      // var() hexes the ~105 `ring-accent/30` callsites emitted no rule, so
      // `ring-2` fell back to Tailwind's own default ring colour and those
      // focus rings painted BLUE (rgba(59,130,246,0.5)) rather than nothing.
      // They are the brand ring at 30% from here on. The separate
      // `html[data-app="product"] :focus-visible` outline in globals.css is
      // still the indicator those controls actually rely on - leave it.
      ringColor: {
        accent: 'rgb(var(--ring, var(--accent)) / <alpha-value>)',
      },
      // outline-accent -> --ring, same reasoning. Notably the paid-plan
      // banner CTA, which is a yellow pill that would otherwise draw a
      // yellow focus outline on itself.
      outlineColor: {
        accent: 'rgb(var(--ring, var(--accent)) / <alpha-value>)',
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
