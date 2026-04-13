import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Primary
        black:    '#0A0A0A',
        white:    '#FFFFFF',
        bg:       '#F7F7F5',

        // Depth
        charcoal: '#1F1F1F',
        mid:      '#6B6B6B',
        light:    '#EAEAEA',
        border:   '#E4E4E2',

        // Accent — Deep Sage
        accent:   '#6F8F7A',
        accent2:  '#5A7A65',
        accent3:  '#EAF0EC',

        // Semantic
        danger:   '#D94F4F',
        warning:  '#C8850A',
        success:  '#3D8A5E',
      },
      fontFamily: {
        sans:  ['DM Sans', 'sans-serif'],
        serif: ['Fraunces', 'serif'],
      },
      fontSize: {
        'display': ['48px', { lineHeight: '1.1', letterSpacing: '-0.03em' }],
        'h1':      ['40px', { lineHeight: '1.15', letterSpacing: '-0.02em' }],
        'h2':      ['30px', { lineHeight: '1.2',  letterSpacing: '-0.02em' }],
        'h3':      ['22px', { lineHeight: '1.3',  letterSpacing: '-0.01em' }],
        'body':    ['15px', { lineHeight: '1.65' }],
        'small':   ['13px', { lineHeight: '1.5'  }],
        'xs':      ['11px', { lineHeight: '1.4'  }],
      },
      borderRadius: {
        'sm':  '6px',
        'md':  '10px',
        'lg':  '12px',
        'xl':  '16px',
        '2xl': '20px',
      },
      boxShadow: {
        'card':   '0 1px 3px rgba(10,10,10,0.06), 0 1px 2px rgba(10,10,10,0.04)',
        'float':  '0 4px 16px rgba(10,10,10,0.08), 0 2px 4px rgba(10,10,10,0.04)',
        'modal':  '0 20px 60px rgba(10,10,10,0.15), 0 4px 16px rgba(10,10,10,0.08)',
        'cmd':    '0 32px 80px rgba(10,10,10,0.2), 0 8px 24px rgba(10,10,10,0.1)',
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
