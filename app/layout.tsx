import type { Metadata } from 'next'
import { Inter, Fraunces } from 'next/font/google'
import { SpeedInsights } from '@vercel/speed-insights/next'
import './globals.css'

// A0.3 - font loading moved off the Google Fonts @import in globals.css
// onto next/font/google so the fonts are self-hosted, woff2-optimised,
// and don't block first paint. See section 5.3 of the brand kit report.
//
// Inter is the marketing + product sans (Option 2 body face). Fraunces
// is reserved for marketing headings (Option 2 H1 / display). Geist
// gets added when Option 3 (in-app dark) theme lands in Week 2.
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
    <html lang="en-AU" className={`${inter.variable} ${fraunces.variable}`}>
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
