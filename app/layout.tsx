import type { Metadata } from 'next'
import { Fraunces, Geist, Geist_Mono } from 'next/font/google'
import { SpeedInsights } from '@vercel/speed-insights/next'
import './globals.css'

// Typography (June 2026 frontend-design pass). The site previously
// shipped Inter for everything (the single most over-used AI-SaaS
// typeface) with Fraunces + Bebas Neue downloaded but unused. We now run
// a deliberate, distinctive pairing:
//   - Fraunces  -> editorial display serif (headlines only). Warm,
//     considered, "real humans behind the AI". --font-fraunces, mapped
//     to the `display` + `serif` Tailwind tokens.
//   - Geist     -> humanist body/UI sans, more legible on dark than the
//     old setup and decidedly not-Inter. --font-geist-sans, mapped to
//     `sans` (the body default).
//   - Geist Mono -> statute citations + eyebrow labels (the "evidence"
//     voice). --font-geist-mono, mapped to `mono`.
// All self-hosted via next/font/google (woff2, no layout-blocking).
const geistSans = Geist({
  subsets: ['latin'],
  variable: '--font-geist-sans',
  display: 'swap',
})

const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
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
    <html lang="en-AU" className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable}`}>
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
