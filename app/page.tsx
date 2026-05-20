// Public root route - the HQ.ai marketing landing page.
//
// Behaviour:
//   - Authenticated visitors are redirected to /dashboard.
//   - Unauthenticated visitors see the landing page (this file).
//
// Built against docs/research/landing-page-research-brief.md. Copy is
// lifted verbatim from the "Recommended copy / treatment" blocks in
// that brief - do not paraphrase here.

import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import LandingPage from '@/components/landing/LandingPage'

const HERO_SUBHEAD =
  'The AI HR advisor built on the Fair Work Act, the NES, and your Modern Award. Cites every answer. Hands off to a human when it matters.'

export const metadata: Metadata = {
  title: 'HQ.ai - AI HR for Australian businesses under 250 staff',
  description: HERO_SUBHEAD,
  alternates: { canonical: '/' },
  openGraph: {
    title: 'HQ.ai - AI HR for Australian businesses under 250 staff',
    description: HERO_SUBHEAD,
    url: '/',
    siteName: 'HQ.ai',
    locale: 'en_AU',
    type: 'website',
    images: [{ url: '/logo.svg', width: 1200, height: 630, alt: 'HQ.ai' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'HQ.ai - AI HR for Australian businesses under 250 staff',
    description: HERO_SUBHEAD,
    images: ['/logo.svg'],
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
      sameAs: ['https://github.com/jraynerhumanistiqs/hqai'],
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
      description: HERO_SUBHEAD,
      offers: [
        { '@type': 'Offer', name: 'Essentials', price: '99', priceCurrency: 'AUD', priceSpecification: { '@type': 'UnitPriceSpecification', price: '99', priceCurrency: 'AUD', unitText: 'MONTH' } },
        { '@type': 'Offer', name: 'Growth',     price: '199', priceCurrency: 'AUD', priceSpecification: { '@type': 'UnitPriceSpecification', price: '199', priceCurrency: 'AUD', unitText: 'MONTH' } },
        { '@type': 'Offer', name: 'Scale',      price: '379', priceCurrency: 'AUD', priceSpecification: { '@type': 'UnitPriceSpecification', price: '379', priceCurrency: 'AUD', unitText: 'MONTH' } },
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
