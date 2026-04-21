import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // ── Uber Design System ──────────────────────────────────
        // Primary surfaces
        black:    '#000000',   // Primary buttons, headings, nav text
        white:    '#FFFFFF',   // Page backgrounds, card surfaces

        // Content area bg (pure white per Uber spec)
        bg:       '#FFFFFF',

        // Text hierarchy
        charcoal: '#1F1F1F',   // Deepest text on dark surfaces
        mid:      '#4b4b4b',   // Body gray — secondary text
        muted:    '#afafaf',   // Tertiary text, placeholders
        light:    '#efefef',   // Chip gray — filter chips, secondary nav
        border:   '#e2e2e2',   // Hover gray — used on borders and hover

        // CTA accent → Uber black (no color accent in chrome)
        accent:   '#000000',   // Primary CTA (was sage green)
        accent2:  '#1a1a1a',   // CTA hover
        accent3:  '#efefef',   // Chip/pill background

        // Semantic (unchanged)
        danger:   '#D94F4F',
        warning:  '#C8850A',
        success:  '#3D8A5E',
      },
      fontFamily: {
        // DM Sans for all roles per Uber spec (geometric sans-serif substitute)
        sans:    ['DM Sans', 'sans-serif'],
        display: ['DM Sans', 'sans-serif'],   // Was Bebas Neue — now DM Sans bold
        serif:   ['DM Sans', 'sans-serif'],   // Was Fraunces — now DM Sans bold
      },
      fontSize: {
        // Uber type scale
        'display': ['52px', { lineHeight: '1.23', letterSpacing: '-0.01em' }],
        'h1':      ['36px', { lineHeight: '1.22', letterSpacing: '-0.01em' }],
        'h2':      ['32px', { lineHeight: '1.25', letterSpacing: '-0.01em' }],
        'h3':      ['24px', { lineHeight: '1.33' }],
        'body':    ['16px', { lineHeight: '1.50' }],
        'small':   ['14px', { lineHeight: '1.43' }],
        'xs':      ['12px', { lineHeight: '1.67' }],
      },
      borderRadius: {
        'sm':  '4px',
        'md':  '8px',    // Standard cards, inputs
        'lg':  '12px',   // Featured cards
        'xl':  '16px',
        '2xl': '20px',
        // 'full' is Tailwind's built-in 9999px — used for all buttons/chips
      },
      boxShadow: {
        // Uber shadow spec — whisper-soft
        'card':   '0 4px 16px rgba(0,0,0,0.12)',
        'float':  '0 2px 8px rgba(0,0,0,0.16)',
        'modal':  '0 8px 40px rgba(0,0,0,0.18)',
        'cmd':    '0 32px 80px rgba(0,0,0,0.2)',
      },
      spacing: {
        'sidebar': '248px',
      },
      transitionTimingFunction: {
        'smooth': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [],
}
export default config
