import type { Metadata } from 'next'
import { Schibsted_Grotesk, Geist, Geist_Mono } from 'next/font/google'
import { SpeedInsights } from '@vercel/speed-insights/next'
import './globals.css'

// Typography (June 2026 repositioning pass). The display face moved off
// Fraunces (a literary serif that read "law journal / editorial
// authority") to a confident, friendly grotesque - matching the new
// positioning: take the busywork out of HR and hiring for busy operators,
// not "cite the law".
//   - Schibsted Grotesk -> display/headlines. Warm humanist grotesque,
//     plain-spoken and approachable, distinctive (not Inter/Roboto).
//     --font-display, mapped to the `display` + `serif` Tailwind tokens.
//   - Geist      -> humanist body/UI sans (kept). --font-geist-sans -> `sans`.
//   - Geist Mono -> caption/eyebrow micro-labels (kept). --font-geist-mono.
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

const schibsted = Schibsted_Grotesk({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
  variable: '--font-display',
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
    <html lang="en-AU" suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable} ${schibsted.variable}`}>
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
