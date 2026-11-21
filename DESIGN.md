---
version: 1
name: HQai-design-system
description: "HQ.ai's own design system, written for coding agents. One brand colour - Wattle Gold #E8B23A - carried across two surface palettes that are switched by a single `data-app` attribute on <html>: `marketing`, a near-black slab warmed only by the gold, and `product`, a neutral white-to-grey ramp with a light/dark toggle. Marketing sets Schibsted Grotesk over Geist with Geist Mono reserved for uppercase eyebrow micro-labels; product swaps both to Figtree. Buttons are always full pills, cards are 20-24px panels built from a hairline border plus a surface lift rather than a drop shadow, and the only decoration in the system is a 20px gold rule beside an eyebrow. No gradients, no colour bars, no hardcoded hex - every colour is a CSS-variable token so one attribute repaints the whole UI. Entrances are CSS keyframes, never a JS animation library, because content must never depend on an animation completing to be visible."

# ─────────────────────────────────────────────────────────────────────
# SOURCE OF TRUTH
#   tailwind.config.ts  - token -> CSS variable mapping
#   app/globals.css     - the values, per surface
#   app/layout.tsx      - the fonts as actually loaded
#   CLAUDE.md           - the "Design system" section
# Every hex below was read out of app/globals.css, not from memory.
# Tokens there are CHANNEL TRIPLETS (`--warning: 168 70 0`), never hex.
# ─────────────────────────────────────────────────────────────────────

brand:
  wattle-gold: "#E8B23A"
  wattle-gold-hover-on-light: "#D9A52E"
  wattle-gold-hover-on-dark: "#F0C44E"
  on-gold: "#111111"          # label ON a gold fill. NEVER #FFFFFF (1.93:1).
  gold-as-text-on-light: "#7A6010"
  gold-as-text-on-dark: "#E8B23A"

# Marketing surface - [data-app="marketing"], the non-member site.
colors-marketing:
  bg: "#0A0A0B"
  bg-soft: "#131417"
  bg-elevated: "#1B1D21"
  surface-inverse: "#FFFFFF"
  ink: "#F5F5F4"
  ink-soft: "#A8A8A3"
  ink-muted: "#7C7C77"
  ink-on-accent: "#111111"
  accent: "#F5F5F4"           # the SECONDARY near-white, not the gold
  accent-hover: "#E5E5E3"
  accent-soft: "#23262B"
  clay: "#E8B23A"             # the gold - primary CTA lives here
  clay-hover: "#F0C44E"
  clay-soft: "#E8B23A @ 16%"
  clay-ink: "#0A0A0B"         # label ON a gold fill here. See Known Traps.
  border: "#2A2D32"
  border-strong: "#3D4148"

# Product surface, light - [data-app="product"] without .dark
colors-product-light:
  bg: "#FFFFFF"
  bg-soft: "#E4E4E4"          # inset
  bg-elevated: "#F2F2F2"      # card
  surface-inverse: "#0A0A0A"
  ink: "#0A0A0A"
  ink-soft: "#52525B"
  ink-muted: "#666666"
  ink-on-accent: "#111111"
  ink-on-danger: "#FFFFFF"
  accent: "#E8B23A"           # the gold IS the accent here
  accent-hover: "#D9A52E"
  accent-soft: "#E8B23A @ 16%"
  accent-text: "#7A6010"      # what `text-accent` resolves to
  clay: "#E8B23A"
  clay-hover: "#D9A52E"
  clay-soft: "#E8B23A @ 14%"
  clay-ink: "#7A6010"
  border: "#E5E5E5"
  border-strong: "#A1A1A1"
  input: "#E5E5E5"
  ring: "#A1A1A1"
  focus-ring: "#7A6010"
  danger: "#D0000A"
  warning: "#A84600"
  success: "#3D8A5E"
  info: "#6A9BCC"
  sidebar: "#FAFAFA"
  sidebar-accent: "#E4E4E4"

# Product surface, dark - [data-app="product"].dark (dashboard default)
colors-product-dark:
  bg: "#202020"               # page
  bg-soft: "#262626"          # inset
  bg-elevated: "#292929"      # card - page < inset < card, in that order
  surface-inverse: "#FAFAFA"
  ink: "#FAFAFA"
  ink-soft: "#D4D4D4"
  ink-muted: "#A1A1A1"
  ink-on-accent: "#111111"
  ink-on-danger: "#0A0A0A"
  accent: "#E8B23A"
  accent-hover: "#F0C44E"
  accent-soft: "#E8B23A @ 18%"
  accent-text: "#E8B23A"
  clay: "#E8B23A"
  clay-hover: "#F0C44E"
  clay-soft: "#E8B23A @ 18%"
  clay-ink: "#E8B23A"
  border: "#FFFFFF @ 10%"
  border-strong: "#FFFFFF @ 20%"
  input: "#FFFFFF @ 15%"
  ring: "#737373"
  focus-ring: "#E8B23A"
  danger: "#FF6467"
  warning: "#FF6900"
  sidebar: "#101010"          # RECESSED below the page, not lifted
  sidebar-accent: "#343434"

# Unscoped fallback - :root, for any route that sets no data-app
# (/login, /signup, /doc/[id]). NOT gold-accented.
colors-root:
  bg: "#FFFFFF"
  bg-soft: "#F7F7F2"
  bg-elevated: "#FFFFFF"
  surface-inverse: "#111111"
  ink: "#111111"
  ink-soft: "#4D4D4D"
  ink-muted: "#9A9A99"
  ink-on-accent: "#FFFFFF"    # white, because --accent here is near-black
  accent: "#111111"
  accent-hover: "#2A2A2A"
  accent-soft: "#EDEDE8"
  clay: "#E8B23A"
  clay-hover: "#D9A52E"
  clay-soft: "#F7EBCB"
  clay-ink: "#8A6D12"
  border: "#E6E5E0"
  border-strong: "#C9C8C0"
  danger: "#C5483A"
  warning: "#B8770F"
  success: "#3D8A5E"
  info: "#6A9BCC"

# Chart series - [data-app="product"] only, identical in both modes.
# Deliberately blue: a gold series would read as an interactive accent.
colors-chart:
  chart-1: "#8EC5FF"
  chart-2: "#2B7FFF"
  chart-3: "#155DFC"
  chart-4: "#1447E6"
  chart-5: "#193CB8"

typography:
  # Marketing hero. The one place the scale is hand-tuned per breakpoint.
  hero:
    fontFamily: Schibsted Grotesk
    fontSize: 34px / 42px sm / 52px md
    fontWeight: 600
    lineHeight: 1.06
    letterSpacing: -0.02em
  section-heading:
    fontFamily: Schibsted Grotesk
    fontSize: 30px / 40px md
    fontWeight: 700
    lineHeight: tight
    letterSpacing: tight
  card-title:
    fontFamily: Schibsted Grotesk
    fontSize: 20px
    fontWeight: 700
    letterSpacing: tight
  subhead:
    fontFamily: Geist
    fontSize: 18px / 20px md
    fontWeight: 400
    lineHeight: relaxed
  body:
    fontFamily: Geist
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.55
  body-sm:
    fontFamily: Geist
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.50
  caption:
    fontFamily: Geist
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.45
  eyebrow:
    fontFamily: Geist Mono
    fontSize: 11px
    fontWeight: 400
    textTransform: uppercase
    letterSpacing: 0.06em
  button:
    fontFamily: Geist
    fontSize: 14px
    fontWeight: 600

# The named scale in tailwind.config.ts. Marketing pages mostly bypass
# it in favour of arbitrary values; product should prefer these.
typography-scale:
  display: { fontSize: 60px, lineHeight: 1.05, letterSpacing: -0.02em }
  h1:      { fontSize: 44px, lineHeight: 1.08, letterSpacing: -0.018em }
  h2:      { fontSize: 32px, lineHeight: 1.15, letterSpacing: -0.012em }
  h3:      { fontSize: 22px, lineHeight: 1.30, letterSpacing: -0.006em }
  body:    { fontSize: 16px, lineHeight: 1.55 }
  small:   { fontSize: 14px, lineHeight: 1.50 }
  xs:      { fontSize: 12px, lineHeight: 1.45 }

fonts:
  display: "var(--font-app-heading, var(--font-display))  # Schibsted Grotesk, 500/600/700/800"
  sans: "var(--font-app-sans, var(--font-geist-sans))     # Geist"
  mono: "var(--font-geist-mono)                           # Geist Mono"
  product-override: "Figtree (variable 300-900), bound to --font-app-sans AND --font-app-heading under [data-app=\"product\"] only"
  retired: "DM Sans, Bebas Neue, Fraunces - removed. Do not reintroduce."

rounded:
  # Marketing / :root ladder
  sm: 4px
  md: 8px
  lg: 12px
  xl: 16px
  2xl: 20px      # = panel
  3xl: 24px      # Tailwind stock 1.5rem, marketing only
  full: 9999px
rounded-product:
  # [data-app="product"] re-bases the whole ladder off --radius 0.625rem
  base: 10px
  sm: 6px
  md: 8px
  lg: 10px
  xl: 14px
  2xl: 18px
  3xl: 22px
  full: 9999px

spacing:
  xxs: 4px
  xs: 8px
  sm: 12px
  md: 16px
  lg: 24px
  xl: 32px
  xxl: 40px
  section-y: 56px          # py-14
  section-y-md: 80px       # md:py-20
  gutter: 24px             # px-6
  gutter-md: 40px          # md:px-10
  container: 1152px        # max-w-6xl, the default marketing measure
  container-wide: 1280px   # max-w-7xl, hero + header + footer only
  container-prose: 768px   # max-w-3xl, FAQ and long copy
  sidebar: 248px

shadow:
  hairline: "0 0 0 1px rgba(20,20,19,0.06)   | dark: rgba(255,255,255,0.06)"
  card: "0 1px 2px rgba(20,20,19,0.04), 0 0 0 1px rgba(20,20,19,0.06)   | dark surfaces: 0 0 0 1px rgba(255,255,255,0.06) ONLY"
  float: "0 4px 12px rgba(20,20,19,0.06), 0 0 0 1px rgba(20,20,19,0.06)   | dark: 0 8px 24px rgba(0,0,0,0.40), 0 0 0 1px rgba(255,255,255,0.06)"
  modal: "0 16px 48px rgba(20,20,19,0.12), 0 0 0 1px rgba(20,20,19,0.08)  | dark: 0 24px 64px rgba(0,0,0,0.50), 0 0 0 1px rgba(255,255,255,0.08)"

motion:
  ease-smooth: cubic-bezier(0.16, 1, 0.3, 1)
  ease-natural: cubic-bezier(0.4, 0, 0.2, 1)
  ease-decelerate: cubic-bezier(0, 0, 0.2, 1)
  ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1)
  duration-instant: 100ms
  duration-fast: 150ms
  duration-base: 200ms
  duration-slow: 300ms
  duration-slower: 500ms
  entrance-ease: cubic-bezier(.22, 1, .36, 1)

components:
  cta-primary-marketing:
    backgroundColor: "{colors-marketing.clay}"
    textColor: "{colors-marketing.ink-on-accent}"
    hoverBackgroundColor: "{colors-marketing.clay-hover}"
    typography: "{typography.button}"
    rounded: "{rounded.full}"
    height: 48px
    padding: 0 28px
    shadow: "{shadow.card}"
    focus: "outline 2px solid {colors-marketing.clay}, offset 2px"
  cta-primary-product:
    backgroundColor: "{colors-product-light.accent}"
    textColor: "{colors-product-light.ink-on-accent}"
    hoverBackgroundColor: "{colors-product-light.accent-hover}"
    typography: "{typography.button}"
    rounded: "{rounded.full}"
    height: 40px
    padding: 0 20px
  cta-secondary:
    backgroundColor: "{colors-marketing.bg-soft}"
    textColor: "{colors-marketing.ink}"
    border: "1px solid {colors-marketing.border}"
    typography: "{typography.button}"
    rounded: "{rounded.full}"
    height: 40px
    padding: 0 20px
  cta-ghost:
    backgroundColor: transparent
    textColor: "{colors-marketing.ink}"
    hoverBackgroundColor: "{colors-marketing.bg-soft}"
    typography: "{typography.button}"
    rounded: "{rounded.full}"
  cta-outline-pill:
    backgroundColor: transparent
    textColor: "{colors-marketing.ink-soft}"
    border: "1px solid {colors-marketing.border}"
    hoverBorderColor: "{colors-marketing.ink}"
    typography: "{typography.caption}"
    rounded: "{rounded.full}"
    padding: 6px 16px
  icon-button:
    backgroundColor: transparent
    border: "1px solid {colors-marketing.border}"
    textColor: "{colors-marketing.ink-muted}"
    rounded: "{rounded.full}"
    minHeight: 44px
    minWidth: 44px
  section-card:
    backgroundColor: "{colors-marketing.bg-elevated}"
    textColor: "{colors-marketing.ink}"
    border: "1px solid {colors-marketing.border}"
    rounded: "{rounded.3xl}"
    padding: 32px (md 40px)
    shadow: "{shadow.card}"
  feature-card:
    backgroundColor: "{colors-marketing.bg-elevated}"
    textColor: "{colors-marketing.ink}"
    border: "1px solid {colors-marketing.border}"
    rounded: "{rounded.3xl}"
    padding: 24px (md 28px)
    shadow: "{shadow.float}"
  eyebrow:
    textColor: "{colors-marketing.clay}"
    typography: "{typography.eyebrow}"
    rule: "1px x 20px solid {colors-marketing.clay}, 8px gap, aria-hidden"
    marginBottom: 16px
  status-pill-neutral:
    backgroundColor: "{colors-product-light.bg-soft}"
    textColor: "{colors-product-light.ink-soft}"
    border: "1px solid {colors-product-light.border}"
    typography: "{typography.caption}"
    rounded: "{rounded.full}"
    padding: 2px 10px
  status-pill-gold:
    backgroundColor: "{colors-product-light.clay-soft}"
    textColor: "{colors-product-light.clay-ink}"
    border: "1px solid {colors-product-light.clay} @ 30%"
    typography: "{typography.caption}"
    rounded: "{rounded.full}"
    padding: 2px 10px
  text-input:
    backgroundColor: "{colors-product-light.bg}"
    textColor: "{colors-product-light.ink}"
    border: "1px solid {colors-product-light.input}"
    typography: "{typography.body-sm}"
    rounded: "{rounded-product.md}"
    padding: 8px 12px
    focus: "no outline - the caret is the affordance. See Focus."
  marketing-header:
    backgroundColor: "{colors-marketing.bg} @ 90% + backdrop-blur"
    borderBottom: "1px solid {colors-marketing.border}"
    typography: "{typography.body-sm}"
    padding: "16px 24px (md 16px 40px)"   # py-4; the h-10 CTA pill sets the row height
    position: "sticky top-0 z-40"
  nav-dropdown:
    backgroundColor: "{colors-marketing.bg-elevated}"
    border: "1px solid {colors-marketing.border}"
    rounded: "{rounded.2xl}"
    padding: 8px
    shadow: "{shadow.float}"
  sidebar-rail:
    backgroundColor: "{colors-product-dark.sidebar}"
    textColor: "{colors-product-dark.ink}"
    width: 68px collapsed
    note: "auto-collapsing icon hover-rail; pin toggle persists to localStorage hqai:sidebar-locked"
---

## Overview

HQ.ai is HR and recruitment software for Australian small business, under the
Humanistiqs parent brand. The design brief it answers is "take the busywork off
a busy operator's plate" - so the system reads as calm, plain-spoken and
unhurried, not as legal authority and not as a consumer app shouting for
attention.

The whole system rests on **one brand colour**: Wattle Gold
`{brand.wattle-gold}` #E8B23A. Wattle is Australia's national colour - warm,
optimistic, and premium precisely because it is rationed. It is the only
chromatic accent in the product, and it appears only on CTAs, links, focus,
eyebrow rules and the citation signature. Everything else in the UI is a
neutral surface, a neutral hairline, or text.

What changes between surfaces is the **surface ramp and the typeface**, never
the accent. That was a real bug once: the two surfaces briefly ran different
yellows, so the brand changed colour the moment a customer signed in. They were
unified back onto the gold in Aug 2026. Do not re-fork them.

**Two surfaces, one attribute.** `data-app` on `<html>` selects the palette:

| `data-app` | Where | Character | Theme |
|---|---|---|---|
| `marketing` | every page that mounts `MarketingHeader` - home, pricing, product/*, about, contact, compare, changelog, roadmap, marketplace, outsourcing, ai-standard - plus `/onboarding` and `/welcome`, which set it in their own layouts | a near-black slab, warmed only by the gold | dark, fixed - no toggle |
| `product` | `/dashboard`, `/prescreen`, `/review` | a neutral white-to-grey ramp | light **and** dark; dashboard defaults dark, prescreen and review are forced light |
| *(unset)* | everything that mounts neither - currently `/login`, `/signup`, `/doc/[id]`, `/careers`, `/privacy`, `/terms`, `/invite` | the `:root` fallback - white page, **near-black** accent | light |

`MarketingHeader` sets `data-app="marketing"` in an effect, so the header is
load-bearing - it is what puts a page on the marketing palette at all. A new
marketing page that does not mount it renders on the `:root` fallback and
silently loses the dark surface *and* the gold accent. Product surfaces are set by
`components/theme/ThemeBoundary`, plus a pre-paint inline script in
`app/layout.tsx` that stamps `data-app="product"` (and the stored `.dark`
class) onto `<html>` before first paint so a cold load does not flash the wrong
palette. `next-themes` supplies `.dark`; the storage key is `hqai-theme`.

**Key characteristics:**
- **One accent, two surfaces.** `{brand.wattle-gold}` on marketing *and*
  product. Nothing else is chromatic except the five-step blue chart ramp.
- **Marketing is dark but not dark-saturated.** `{colors-marketing.bg}`
  #0A0A0B with a three-step lift to #131417 and #1B1D21. The warmth is the
  gold, not the greys.
- **Product dark runs page < inset < card** (#202020 < #262626 < #292929) with
  the nav rail *recessed below* the page at #101010. Never invert that order.
- **Pills and panels.** Every button is `rounded-full`. Every card is
  `rounded-2xl` or `rounded-3xl`. There is nothing in between.
- **Hairline-and-lift, not shadow.** Cards are a 1px border plus a surface
  step. `shadow-card` is a hairline ring with at most a 1px blur; real shadows
  are reserved for floating overlays.
- **The eyebrow is the only ornament.** A 1px x 20px gold rule, then a Geist
  Mono uppercase micro-label at 11px / 0.06em. That one pattern opens nearly
  every marketing section.
- **Zero gradients.** No accent stripes, no colour bars, no underline
  flourishes. Hierarchy comes from surface steps and type weight.
- **Entrances are CSS, never JS.** Content visibility must not depend on a
  frame loop.

## Colors

> Every value below was read out of `app/globals.css`. Tokens there are channel
> triplets (`--warning: 168 70 0`), mapped in `tailwind.config.ts` through
> `rgb(var(--x) / <alpha-value>)`. **Never write a hex into a component.**

### The accent

- **Wattle Gold** (`{brand.wattle-gold}` #E8B23A): the single brand colour.
  Primary CTAs, links, eyebrow rules, focus indicator on dark, citation
  signature. On marketing it is the `clay` token; on product it is *both*
  `accent` and `clay`.
- **Gold hover**: #D9A52E on light surfaces (one step deeper),
  #F0C44E on dark surfaces (one step brighter). They are not
  interchangeable - picking the wrong one makes the hover vanish.
- **Gold tint** (`accent-soft` / `clay-soft`): the same gold at a baked 14-18%
  alpha, for badge and highlight fills. It is a tint, never a second colour.

### Surfaces

Marketing: `bg` #0A0A0B -> `bg-soft` #131417 -> `bg-elevated` #1B1D21.
Cards sit on `bg-elevated`; `bg-soft` is for insets and secondary buttons.

Product light: `bg` #FFFFFF (page) -> `bg-elevated` #F2F2F2 (card) ->
`bg-soft` #E4E4E4 (inset). The ramp was widened in Aug 2026; at the previous
near-identical steps the three levels read as one grey.

Product dark: `bg` #202020 (page) -> `bg-soft` #262626 (inset) ->
`bg-elevated` #292929 (card), with `sidebar` #101010 recessed *below* the page.

### Text

`ink` is the primary, `ink-soft` the secondary, `ink-muted` the tertiary.
`ink-on-accent` is the label that sits **on** a filled accent;
`ink-on-danger` is the same job on a `danger` fill, split out because the two
need opposite answers (see Known Traps).

### Semantic

Product light: `danger` #D0000A, `warning` #A84600, `success` #3D8A5E,
`info` #6A9BCC. Product dark: `danger` #FF6467, `warning` #FF6900.

All three warm colours are tuned **against the gold**, which is the real risk -
gold, warning and danger are all warm. Light `warning` is deepened to #A84600
so it separates from gold by lightness as well as hue. Dark `warning` stays
#FF6900: it sits between gold and danger, and anything redder collides with
`danger` #FF6467.

### Contrast, measured

| Pair | Ratio | Verdict |
|---|---|---|
| #111111 on gold | 9.77:1 | the correct label on a gold fill |
| #FFFFFF on gold | 1.93:1 | **never do this** |
| gold text on #FFFFFF | 1.93:1 | **never do this** |
| #7A6010 on #FFFFFF | 5.99:1 | gold-as-text, product light |
| gold on #0A0A0B | 10.23:1 | gold text on marketing |
| gold on #202020 | 8.43:1 | gold text on product dark |
| #F5F5F4 on #0A0A0B | 18.14:1 | marketing body |
| #7C7C77 on #0A0A0B | 4.72:1 | marketing tertiary, AA with no margin |
| #666666 on #E4E4E4 | 4.52:1 | product tertiary on an inset, AA with no margin |

Changing a surface value changes what passes AA on it. The Aug 2026 ramp
widening broke `ink-muted`, `danger` and `warning`, and each had to move with
it. **Re-check every foreground after any surface change.**

## Typography

### Families

- **Schibsted Grotesk** - display and headlines. `font-display` (also aliased
  to `font-serif` and the legacy `font-fraunces`). Weights 500/600/700/800. A
  warm humanist grotesque: plain-spoken, confident, distinctive.
- **Geist** - body and UI. `font-sans`, and the `<body>` default.
- **Geist Mono** - eyebrow and caption micro-labels only. `font-mono`. Never
  body copy.
- **Figtree** - the product face. Variable 300-900, bound to *both*
  `--font-app-sans` and `--font-app-heading`, but **only** under
  `[data-app="product"]`. So `font-display` resolves to Schibsted Grotesk on
  marketing and Figtree in product, with no per-surface class.

All four are self-hosted through `next/font/google` in `app/layout.tsx` with
`display: 'swap'`.

**Retired - do not reintroduce:** DM Sans, Bebas Neue, Fraunces.

### Hierarchy as actually used on marketing

| Role | Class |
|---|---|
| Hero | `font-display text-[34px] font-semibold leading-[1.06] tracking-[-0.02em] sm:text-[42px] md:text-[52px]` |
| Section heading | `font-display text-3xl font-bold leading-tight tracking-tight md:text-[40px]` |
| Card title | `font-display text-xl font-bold tracking-tight` |
| Subhead | `text-lg leading-relaxed text-ink-soft md:text-xl` |
| Body | inherited Geist, `text-sm` or `text-base` |
| Eyebrow | `font-mono text-[11px] uppercase tracking-[0.06em] text-clay` |

### Principles

- Display type is **semibold or bold with negative tracking**. Never light,
  never 800 on marketing headlines.
- Negative tracking scales with size: -0.02em at hero, `tracking-tight` at
  section, none below 20px.
- The gold appears inside a headline as a span on the payoff clause, not on the
  whole line: `HR and hiring are complicated. HQ.ai makes it <span
  className="text-clay">easy, quick and accurate.</span>`
- Prose measure caps at `max-w-xl` for hero copy and `max-w-3xl` for long-form
  sections. Body copy never runs the full 1152px container.

## Layout

### Section skeleton

Every marketing section is this, with no variation worth inventing:

```tsx
<section className="bg-bg py-14 md:py-20" aria-labelledby="x-heading">
  <div className="mx-auto max-w-6xl px-6 md:px-10">
    <p className="mb-4 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.06em] text-clay">
      <span aria-hidden className="h-px w-5 bg-clay" />
      Eyebrow label
    </p>
    <h2 id="x-heading" className="font-display text-3xl font-bold leading-tight tracking-tight text-ink md:text-[40px]">
      Heading
    </h2>
  </div>
</section>
```

### Containers

- `max-w-6xl` (1152px) - the default. Twelve of the marketing sections use it.
- `max-w-7xl` (1280px) - hero, header and footer only.
- `max-w-3xl` (768px) - FAQ and long copy.
- `max-w-2xl` / `max-w-xl` - centred intro paragraphs and hero copy columns.

Gutters are always `px-6 md:px-10`. Vertical rhythm is always
`py-14 md:py-20`.

### Whitespace

Within a block, spacing steps through `mt-1 / mt-2 / mt-3 / mt-4 / mt-5 /
mt-6 / mt-10` and gaps through `gap-2 / gap-3 / gap-6 / gap-12`. The hero is
the only place that reaches for `mt-9` and `gap-16`. Keep to that ladder rather
than inventing intermediate values.

## Elevation and depth

Depth is a **border plus a surface step**, not a shadow. The card recipe is
literally one string, repeated across the marketing pages:

```
rounded-3xl border border-border bg-bg-elevated p-8 shadow-card md:p-10
```

`shadow-card` is a hairline ring with a 1px blur on light surfaces, and on dark
surfaces it is **only** the hairline ring - `0 0 0 1px rgba(255,255,255,0.06)`,
no blur at all. A blurred drop shadow on a near-black page just muddies it.

Reserve the heavier shadows: `shadow-float` for dropdowns and lifted tiles,
`shadow-modal` for dialogs, `shadow-popover` / `shadow-cmd` for portalled
menus. Nothing static gets `shadow-float` unless it is genuinely floating.

Row action menus inside lists must render through
`components/ui/PortalMenu.tsx`. The recruit lists clip (`overflow-hidden` for
the rounded row fill, inside an `overflow-y-auto` switcher), so an
absolutely-positioned menu gets cut off.

## Shapes

- **Buttons: always `rounded-full`.** All four variants, all four sizes. There
  is no square button in this system.
- **Cards: `rounded-2xl` (20px) or `rounded-3xl` (24px)**, plus `shadow-card`.
  `rounded-2xl` for inner panels and dropdowns, `rounded-3xl` for section
  cards.
- **Chat bubbles** use an asymmetric corner - `rounded-2xl rounded-tl-sm` for
  an incoming bubble, `rounded-tr-sm` for outgoing. That is the one exception
  to uniform corners.
- `rounded-xl` and `rounded-lg` appear only on nested rows inside a panel.
- Under `[data-app="product"]` the whole ladder re-bases off `--radius: 10px`,
  so `rounded-2xl` is 18px there rather than 20px. Use the class, not a pixel
  value, and it follows the surface.

## Components

### Buttons

Use `components/ui/button.tsx` (`cva` variants) wherever a React button fits:
`primary | secondary | ghost | outline | danger | link`, sizes
`sm (h-9) | md (h-10) | lg (h-12) | icon (44x44 min)`.

On **marketing** the gold CTA is **`bg-clay text-ink-on-accent
hover:bg-clay-hover`** - not `bg-accent`. On marketing `--accent` is the
inverted near-white #F5F5F4, so `variant="primary"` renders a near-white pill
with a near-black label. That is the correct *secondary* there. In **product**
`--accent` *is* the gold, so `variant="primary"` is the gold CTA. This is the
single most common cross-surface mistake - see Known Traps.

The hand-rolled marketing CTA, verbatim:

```tsx
<Link href="/signup" className="inline-flex h-12 items-center justify-center rounded-full bg-clay px-7 text-sm font-semibold text-ink-on-accent shadow-card transition-colors hover:bg-clay-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay">
  Get started
</Link>
```

**One filled accent CTA per section.** The section's primary action is the only
gold fill. Everything else is ghost, outline-pill or a text link. A second gold
pill in the same viewport destroys the hierarchy the rationing buys.

### Cards

```tsx
<div className="rounded-3xl border border-border bg-bg-elevated p-8 shadow-card md:p-10">
```

Variants in use: `p-5` / `p-6 shadow-float` for small tiles, `p-8 md:p-12` for
the single widest section card. No card gets a gradient, a coloured top edge,
or a tinted fill - a selected or featured card is marked with
`border-clay bg-clay-soft`, which is the gold *tint*, nothing stronger.

### The eyebrow

A 1px x 20px gold rule, an 8px gap, then the mono uppercase label:

```tsx
<p className="mb-4 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.06em] text-clay">
  <span aria-hidden className="h-px w-5 bg-clay" />
  The retainer trap
</p>
```

The rule is `aria-hidden` and the label is sentence-case content in uppercase
styling - write it as a sentence, not as SHOUTING, and let CSS raise it.

### Status pills

`components/ui/StatusPill.tsx`. Tones map a status string onto
`bg-{tone}/10 text-{tone} border-{tone}/20`, plus a `gold` tone of
`bg-clay-soft text-clay-ink border-clay/30`. Never hand-roll
`bg-amber-50` / `bg-green-100` - those are literal Tailwind palette colours and
will not flip with the theme.

### Inputs

Text entry does **not** get a focus outline - founder call, Aug 2026: the
coloured ring read as the box changing colour. The caret is the affordance.
Buttons, links and every other focusable control **keep** the indicator.

### Navigation

`MarketingHeader` is `sticky top-0 z-40 border-b border-border bg-bg/90
backdrop-blur`, a `max-w-7xl` row at `px-6 py-4 md:px-10`, logo at `h-7`,
`gap-7` nav links in `text-ink-soft hover:text-ink`, and a single gold pill at
`h-10 px-5`. Dropdowns are `w-72 rounded-2xl border border-border
bg-bg-elevated p-2 shadow-float`.

The product sidebar is a 68px auto-collapsing icon hover-rail with a pin toggle
persisted to `localStorage` key `hqai:sidebar-locked`. Nav is flat - one tab per
service, no product-level parents.

### Icons

`remixicon` (`@remixicon/react`). **`lucide-react` is removed - do not
reintroduce it.** Remix Line glyphs render roughly 9% smaller than lucide's
equivalents, so size them by eye rather than porting size classes verbatim.

## Focus

`html[data-app="product"] :focus-visible` in `app/globals.css` paints the only
keyboard focus indicator the product actually *relies* on:

```css
outline: 2px solid rgb(var(--focus-ring));   /* #7A6010 light, #E8B23A dark */
outline-offset: 2px;
```

The `html` prefix is load-bearing. It makes the rule specificity 0,2,1 so it
outranks Tailwind's `focus-visible:outline-none`, which would otherwise tie and
win on source order. **Do not remove the `html`, and do not widen the text-entry
exemption past text inputs** or the product surface loses its keyboard focus
indicator (WCAG 2.4.7).

The ~120 `focus-visible:ring-accent/30` utilities do emit CSS since the Nov 2026
triplet fix, but those same controls set `outline-none`, and a ring is not an
outline - so the rule above is still the guarantee.

On marketing, CTAs carry their own
`focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2
focus-visible:outline-clay`.

## Motion

**Content must never depend on an animation completing to be visible.**

Motion drives everything off `requestAnimationFrame`, which does not fire in a
background tab. Anything that starts at `opacity: 0` and animates up can paint
blank and stay blank. This has bitten three times, most visibly on the homepage
hero: opened in an unfocused tab it rendered a **blank hero** and was still at
opacity 0 four seconds after `visibilityState` flipped to `"visible"`.

So: **above-the-fold entrances are CSS keyframes**, defined in
`app/globals.css`, staggered with inline `animationDelay` rather than
`staggerChildren`:

| Class | Keyframe | Duration |
|---|---|---|
| `.hq-hero-rise` | `opacity 0 -> 1`, `translateY(18px) -> none` | 0.7s |
| `.hq-hero-lead` | `opacity 0 -> 1`, `translate(-8px, 40px) -> none` | 0.9s |
| `.hq-hero-backdrop` | `opacity 0 -> 1`, `translateX(30px) scale(1.04) -> none` | 1.5s |

All three use `cubic-bezier(.22, 1, .36, 1)` with `both` fill mode, so the
element resolves to the end state and stays there. A CSS animation runs on the
document timeline and cannot fail that way - the worst case is a viewer missing
the movement, never missing the copy.

Stagger cadence: a 40ms beat, then roughly 90ms between elements
(40 / 130 / 220 / 310 / 400ms).

Rules:
- Above-the-fold content uses CSS, not a JS animation library, for its entrance.
- If a JS library must animate something in, give it `initial={false}` or make
  the resting state the default. (`AdaptiveSlider` had no `initial`, so its fill
  painted at zero width whatever the value.)
- Do not reach for `useAnimationControls` as a fallback - `controls.set()` does
  not reach children inheriting through variants, so the parent snaps and the
  children stay hidden.
- `prefers-reduced-motion: reduce` collapses every duration token to 0.001ms
  and disables the three hero keyframes outright. Honour it; do not re-add
  motion that bypasses it.

## Copy rules

These are part of the design system, not a separate style guide. They are
enforced on every surface.

- **Australian English** throughout. `<html lang="en-AU">`.
- **Plain hyphens only.** Never an em dash or an en dash.
- **ASCII apostrophes** only. No typographic quotes.
- Spell out "per cent" in prose where it reads better than the symbol.
- HQ.ai **never** claims to cite, perform or advise on employment law.
  "Grounded in Australian workplace law" is a fine scope statement; "gives
  legal advice" is not.
- Lead on removing busywork, cost and time - not on legal authority.
- Headline voice is plain and operator-facing: "HR and hiring are complicated.
  HQ.ai makes it easy, quick and accurate." Not aspirational, not technical.

## Do's and Don'ts

### Do

- Use `{brand.wattle-gold}` as the *only* chromatic accent, and ration it:
  CTAs, links, focus, eyebrow rules, citation signature.
- Put `#111111` (`ink-on-accent`) on every gold fill.
- Use `accent-text` / `clay-ink` for gold **as text** - #7A6010 on product
  light, the gold itself on dark.
- Reach for a token class (`bg-bg-elevated`, `text-ink-soft`,
  `border-border`), always.
- Wrap a token in `rgb()` when it is read outside Tailwind - a
  `style={{ background: 'rgb(var(--bg))' }}`, an SVG `fill`, a `color-mix()`.
  A bare triplet is an invalid colour value and paints nothing.
- Build cards from `border border-border bg-bg-elevated shadow-card`.
- Keep buttons `rounded-full` and cards `rounded-2xl` / `rounded-3xl`.
- Open sections with the eyebrow pattern.
- Keep to one filled accent CTA per section.
- Animate entrances with CSS keyframes.
- Re-check every foreground contrast pair after touching any surface value.

### Don't

- Don't put white on gold (1.93:1) or gold text on white (1.93:1).
- Don't hardcode a hex, and don't use `bg-white` / `bg-black` /
  `text-gray-*` - those are the only Tailwind literals that break under
  `.dark`.
- Don't add a gradient, anywhere. Not a hero wash, not a card fill, not a
  button.
- Don't add an accent stripe, colour bar or decorative underline. The 20px
  eyebrow rule is the whole ornament budget.
- Don't introduce a second accent colour. The blue `chart-1..5` ramp is data
  series only and must never read as interactive.
- Don't use `bg-accent` for a gold CTA on marketing - it is near-white there.
- Don't give a static card `shadow-float` or a blurred shadow on a dark
  surface.
- Don't invert the product dark ramp. Page < inset < card, rail recessed
  below the page.
- Don't reintroduce DM Sans, Bebas Neue, Fraunces or `lucide-react`.
- Don't remove the `html` prefix from the product focus rule, or widen the
  text-entry exemption.
- Don't use em dashes, en dashes or typographic apostrophes.
- Don't let an animation own whether content is visible.
- Don't give a token an `--x-a` companion without switching its
  `tailwind.config.ts` entry to the `calc(var(--x-a, 1) * <alpha-value>)` form,
  or the bare utility silently paints it fully opaque.

## Responsive behaviour

### Breakpoints

Stock Tailwind. In practice only three are used on marketing:

| Name | Width | Key changes |
|---|---|---|
| base | < 640px | single column; hero 34px; gutters `px-6`; sections `py-14` |
| `sm` | 640px | hero 42px; hero CTA row goes horizontal |
| `md` | 768px | nav expands from hamburger; hero becomes `1fr 1.05fr`; gutters `px-10`; sections `py-20`; hero 52px |
| `lg` | 1024px | hero gap widens to `gap-16`; the product sidebar's collapsed mode activates |

### Touch targets

44px is the floor (WCAG 2.1 AA). `min-h-touch` / `min-w-touch` are the tokens;
the `icon` button size applies them. Use them on every icon-only button and
modal close.

### Collapsing strategy

- Marketing nav collapses to a hamburger below `md`.
- Card grids go 3-up -> 2-up -> 1-up.
- The hero's two columns stack, copy first.
- The product sidebar collapses to icons only at `lg` and up via
  `aside[data-collapsed="true"]`; the mobile drawer always shows labels.
- `pb-safe` / `pt-safe` honour notched-device safe-area insets.

## Known traps

These are the mistakes this system actually invites. Read them before writing
a component that spans both surfaces.

1. **`ink-on-accent` is not a constant.** It is `#111111` on marketing and
   product, but **`#FFFFFF` under `:root`** (where `--accent` is near-black
   #111111). So `bg-clay text-ink-on-accent` is correct on marketing and
   product, and **1.93:1 on an unscoped page** - `/login`, `/signup`,
   `/doc/[id]`. On `:root` surfaces, put the near-black label on gold
   explicitly.

2. **`clay-ink` means two different things.** On product it is *gold as text*
   (#7A6010 light, #E8B23A dark). On marketing it is *the label on a gold fill*
   (#0A0A0B). So `bg-clay-soft text-clay-ink` - the `StatusPill` `gold` tone -
   reads 4.96:1 on product light and 5.14:1 on product dark, but about
   **1.3:1 if it ever renders under `data-app="marketing"`**: near-black text on
   a dark gold tint. Don't take a `clay-soft`/`clay-ink` pairing across to
   marketing without checking it.

3. **For a label on a gold fill, prefer `ink-on-accent` over `clay-ink`.**
   The onboarding plan picker uses `text-clay-ink` on a solid `bg-clay` swatch.
   Under `data-app="marketing"` that is 10.23:1 and fine - but the same markup
   is 3.10:1 under product and 2.54:1 under `:root`. It is correct only because
   `/onboarding` forces the marketing scope.

4. **`success` and `info` are never redeclared.** Neither
   `[data-app="marketing"]` nor the product dark block defines them, so both
   inherit the `:root` light values. `success` #3D8A5E lands at **3.88:1 on the
   product dark page and 3.46:1 on a product dark card** - below AA for text.
   Use it as a dot or an icon on dark, not as body text, or give it a dark
   value.

5. **`danger` and `warning` are also inherited on marketing**, at #C5483A
   (4.11:1) and #B8770F (5.36:1) on #0A0A0B. The red only just clears AA.

6. **A triplet is not a colour.** `style={{ color: 'var(--ink)' }}` renders
   nothing. Wrap it: `rgb(var(--ink))`.

7. **`shadow-card` has no blur on dark surfaces.** If you need visible lift on
   marketing, step the surface up, don't reach for a bigger shadow.

## Agent prompt guide

### How to use this file

1. **Work out which surface you are on first.** Look for `data-app` - which
   layout mounts `MarketingHeader` (marketing), `ThemeBoundary` (product), or
   neither (`:root`). Everything else follows from that. If you cannot tell,
   ask; do not guess, because `bg-accent` means opposite things on the two.
2. **Use token classes, never values.** Pick from the `colors-*` blocks in the
   frontmatter to understand the *role*, then write the Tailwind token class.
   If you find yourself typing a `#`, stop.
3. **Start from the section skeleton** in Layout and the card recipe in
   Elevation. Both are verbatim from the live marketing pages; matching them is
   the fastest route to on-brand.
4. **Check the Known Traps** before shipping anything that pairs gold with
   text, or that renders on more than one surface.
5. **Re-read the source if a value here surprises you.**
   `app/globals.css` wins over this file, and this file wins over any comment in
   `tailwind.config.ts` (several of those are stale - see Known Gaps).

### Quick reference

```
accent fill       bg-clay text-ink-on-accent hover:bg-clay-hover    (marketing)
                  bg-accent text-ink-on-accent hover:bg-accent-hover (product)
accent text       text-accent  /  text-clay-ink
card              rounded-3xl border border-border bg-bg-elevated p-8 shadow-card md:p-10
section           bg-bg py-14 md:py-20  >  mx-auto max-w-6xl px-6 md:px-10
eyebrow           font-mono text-[11px] uppercase tracking-[0.06em] text-clay
                  + <span aria-hidden className="h-px w-5 bg-clay" />
headline          font-display text-3xl font-bold leading-tight tracking-tight text-ink md:text-[40px]
body              text-ink-soft  (secondary)  /  text-ink-muted  (tertiary)
button            <Button variant="primary|secondary|ghost|outline|danger|link" size="sm|md|lg|icon" />
pill              rounded-full border border-border px-4 py-1.5 text-xs text-ink-soft hover:border-ink hover:text-ink
status            <StatusPill status="shortlisted" />  or  tone="gold"
hero entrance     className="hq-hero-rise" style={{ animationDelay: '130ms' }}
```

### Example prompts that will land on-brand

- "Add a testimonial section to the marketing page using the standard section
  skeleton: eyebrow 'What operators say', a `font-display` heading, and three
  `rounded-3xl border border-border bg-bg-elevated p-6 shadow-float` cards."
- "Add a secondary CTA next to the hero's gold pill. Make it an outline pill -
  `rounded-full border border-border text-ink-soft hover:border-ink` - because
  there is already one filled accent CTA in this section."
- "Build a product-surface settings panel: `bg-bg-elevated` card on the
  `bg-bg` page, `border-border` hairline, `rounded-2xl`, inputs with no focus
  outline, and a `variant='primary'` save button."

### Iteration guide

1. Change one component at a time, and name it by its `components:` key.
2. Before adding a section, decide which surface lift it sits on.
3. Prefer an existing component in `components/ui/` over new markup.
4. New dropdowns inside lists go through `PortalMenu`.
5. After any surface-value change, recompute every foreground pair on it.
6. `npm run build` is the gate (`typescript.ignoreBuildErrors` is false).
   `npm run lint` is a separate step with a known baseline of 5 errors /
   63 warnings in unrelated files - those are not regressions.

## Known gaps

- **`CLAUDE.md` calls the marketing surface "dark, warm".** The greys are not
  warm: #0A0A0B, #131417 and #1B1D21 are neutral-to-slightly-cool. The warmth
  in that surface is the gold accent alone. Treat "warm" as a description of
  the *feel*, not a licence to add warm greys.
- **`CLAUDE.md` gives `accent-text` / `clay-ink` as #7A6010.** That is correct
  under `[data-app="product"]` only. `:root` sets `--accent-clay-ink` to
  **#8A6D12** (4.91:1 on white), and marketing sets it to #0A0A0B. The single
  value in `CLAUDE.md` papers over a three-way split.
- **`tailwind.config.ts` comments are stale in three places.** The `textColor`
  override says `--accent-text` is "#733E0A light, #F0B100 dark" - the real
  values are #7A6010 and #E8B23A. The `clay-ink` fallback literal is
  `138 109 18` (#8A6D12), not #7A6010. And the header says "~380 `token/NN`
  callsites" where `CLAUDE.md` says ~990.
- **`app/globals.css` comments are stale in three places.** The marketing block
  still says "Clay (#D97757) is the unchanged brand highlight" - it is
  #E8B23A now. The product-light `--ink-on-accent` comment describes a "dark
  amber-brown ... at 5.5:1"; the value is #111111 at 9.77:1. The
  product-light `--ink-muted` comment quotes "#737373 is 4.7:1"; the value is
  #666666. A few of the inline contrast figures there are also slightly
  optimistic (the focus ring is quoted at 8.67:1 and measures 5.99:1; gold on
  the marketing page is quoted at 10.8:1 and measures 10.23:1). All still clear
  AA - the Contrast table in this file is the recomputed set.
- **Both `CLAUDE.md` and `app/globals.css` list `/enterprise` as a marketing
  page.** There is no `app/enterprise` route; the enterprise inquiry lives
  elsewhere. Don't use that list as a route map.
- `--success` and `--info` have no dark or marketing values (see Known Traps 4).
- The `sidebar*` tokens are defined but not yet consumed -
  `components/sidebar/Sidebar.tsx` still paints the rail with `bg-bg`, so the
  recessed #101010 rail is specified but not shipped.
- There is no documented error / validation styling for form fields beyond the
  `danger` token.
- The named `fontSize` scale in `tailwind.config.ts`
  (`display`/`h1`/`h2`/`h3`) is largely bypassed by the marketing pages, which
  use arbitrary values. Both are listed above; prefer the named scale for new
  product work.
