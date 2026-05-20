import type { Metadata } from 'next'
import { Inter, Fraunces, Bebas_Neue } from 'next/font/google'
import { SpeedInsights } from '@vercel/speed-insights/next'
import './globals.css'

// A0.3 - font loading moved off the Google Fonts @import in globals.css
// onto next/font/google so the fonts are self-hosted, woff2-optimised,
// and don't block first paint. See section 5.3 of the brand kit report.
//
// Inter is the body + UI sans. Bebas Neue is the editorial display face
// (hero headlines, big stats, section titles - 28-72px). Fraunces is
// kept loaded under --font-fraunces for any legacy callsite that still
// references it, but the default `font-serif` and `font-display`
// Tailwind tokens now both resolve to Bebas Neue per the May 2026
// premium-minimal kit migration.
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  display: 'swap',
})

const bebas = Bebas_Neue({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-bebas',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'HQ.ai by Humanistiqs',
  description: 'AI-powered HR & recruitment for Australian businesses',
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', sizes: '32x32' },
    ],
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // A0.4 - lang="en-AU" so screen readers, date pickers and currency
    // formatters use Australian conventions.
    <html lang="en-AU" className={`${inter.variable} ${fraunces.variable} ${bebas.variable}`}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover" />
      </head>
      <body>
        {children}
        <SpeedInsights />
      </body>
    </html>
  )
}
