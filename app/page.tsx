// Public root route - the marketing front door.
//
// Behaviour:
//   - Authenticated visitors are redirected to /dashboard.
//   - Everyone else sees the marketing landing page.
//
// The landing also lives at /landing-page, which 301s here to avoid
// duplicate content.

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import LandingPage from '@/components/landing/LandingPage'

export const dynamic = 'force-dynamic'

const DESCRIPTION =
  'AI that takes the busywork out of HR and hiring for Australian small business. Answers the everyday questions, runs your hiring, and hands off to a real advisor when it matters. For businesses under 250 staff.'

export const metadata = {
  title: 'Taking the grunt work out of HR & hiring for Australian businesses',
  description: DESCRIPTION,
  alternates: { canonical: '/' },
  robots: { index: true, follow: true },
  openGraph: {
    title: 'Taking the grunt work out of HR & hiring for Australian businesses',
    description: DESCRIPTION,
    url: '/',
    siteName: 'HQ.ai',
    locale: 'en_AU',
    type: 'website',
    images: [{ url: '/logo/png/hqai-lockup-navy.png', width: 791, height: 204, alt: 'HQ.ai' }],
  },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      name: 'HQ.ai',
      url: 'https://humanistiqs.ai',
      logo: 'https://humanistiqs.ai/logo/png/hqai-lockup-navy.png',
      parentOrganization: {
        '@type': 'Organization',
        name: 'Humanistiqs (Rayner Consulting Group Pty Ltd)',
      },
    },
    {
      '@type': 'SoftwareApplication',
      name: 'HQ.ai',
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      description: DESCRIPTION,
      offers: [
        { '@type': 'Offer', name: 'HQ People', price: '59',  priceCurrency: 'AUD', priceSpecification: { '@type': 'UnitPriceSpecification', price: '59',  priceCurrency: 'AUD', unitText: 'MONTH' } },
        { '@type': 'Offer', name: 'HQ Business (HR + hiring)', price: '89', priceCurrency: 'AUD', priceSpecification: { '@type': 'UnitPriceSpecification', price: '89', priceCurrency: 'AUD', unitText: 'MONTH' } },
      ],
    },
  ],
}

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/dashboard')

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <LandingPage />
    </>
  )
}
