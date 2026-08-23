import type { Metadata } from 'next'
import { Schibsted_Grotesk, Geist, Geist_Mono, Figtree } from 'next/font/google'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { Analytics } from '@vercel/analytics/next'
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

// Aug 2026 - Figtree is the PRODUCT face (shadcn preset b1YmvCmim). It
// is loaded here on <html> alongside the others, but only applies where
// [data-app="product"] maps --font-app-sans / --font-app-heading to it
// in globals.css: the dashboard, prescreen and review. Marketing keeps
// Geist + Schibsted Grotesk. Variable font (wght 300-900), so no
// `weight` array - the whole range comes in one file.
const figtree = Figtree({
  subsets: ['latin'],
  variable: '--font-figtree',
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
    <html lang="en-AU" suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable} ${schibsted.variable} ${figtree.variable}`}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover" />
        {/* CHR-10 - pre-paint theme shim. ThemeBoundary sets data-app +
            the .dark class in a useEffect, so a cold product load painted
            :root for a frame, then hydrated - a visible flash. This stamps
            data-app="product" (and, on the dashboard, the stored theme) onto
            <html> BEFORE first paint. The dashboard default is dark (matches
            ThemeBoundary themeMode="dashboard"); the value is read from
            next-themes' storageKey "hqai-theme". <html> already carries
            suppressHydrationWarning, so mutating it here is hydration-clean.

            Aug 2026 - /prescreen and /review are now stamped too. They are
            data-app="product" via ThemeBoundary, and since the product
            palette moved to the shadcn preset it no longer matches :root:
            without this they paint a near-black CTA for one frame and then
            flip to yellow. Both are forced-light, so they get the attribute
            but never the .dark class. Marketing, login and onboarding are
            still deliberately untouched. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var p=location.pathname,d=document.documentElement;var dash=p.indexOf('/dashboard')===0;if(dash||p.indexOf('/prescreen')===0||p.indexOf('/review')===0){d.setAttribute('data-app','product');if(dash&&localStorage.getItem('hqai-theme')!=='light'){d.classList.add('dark')}}}catch(e){}})();`,
          }}
        />
      </head>
      <body>
        {children}
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  )
}
