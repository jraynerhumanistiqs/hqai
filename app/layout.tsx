import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'HQ.ai by Humanistiqs',
  description: 'AI-powered HR & recruitment for Australian businesses',
  icons: { icon: '/favicon.ico' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
