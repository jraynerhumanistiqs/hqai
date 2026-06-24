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
  'AI that takes the busywork out of HR and hiring for Australian small business. Answers the everyday questions, drafts the documents, and hands off to a real advisor when it matters. For businesses under 250 staff.'

export const metadata = {
  title: 'HQ.ai - AI that takes the grunt work out of HR and hiring',
  description: DESCRIPTION,
  alternates: { canonical: '/' },
  robots: { index: true, follow: true },
  openGraph: {
    title: 'HQ.ai - AI that takes the grunt work out of HR and hiring',
    description: DESCRIPTION,
    url: '/',
    siteName: 'HQ.ai',
    locale: 'en_AU',
    type: 'website',
    images: [{ url: '/logo.svg', width: 1200, height: 630, alt: 'HQ.ai' }],
  },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      name: 'HQ.ai',
      url: 'https://hqai.vercel.app',
      logo: 'https://hqai.vercel.app/logo.svg',
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
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <LandingPage />
    </>
  )
}
