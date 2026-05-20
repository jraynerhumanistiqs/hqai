// HQ.ai marketing landing page.
//
// Moved from the public root route to /landing-page per founder
// request - the internal testing team will use the bare domain
// (humanistiqs.ai) as a shortcut to the login screen during the
// pilot. Public marketing traffic + paid-ads can be pointed at
// /landing-page; once the product launches the root route can be
// flipped back to render this page directly.
//
// Built against docs/research/landing-page-research-brief.md. Copy
// is lifted verbatim from the "Recommended copy / treatment" blocks
// in that brief - do not paraphrase here.

import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import LandingPage from '@/components/landing/LandingPage'

const HERO_SUBHEAD =
  'HQ.ai is the decision-making layer for people, compliance and hiring. Save the hours, skip the second-guessing, stop overpaying for advice.'

export const metadata: Metadata = {
  title: 'HQ.ai - AI HR for Australian businesses under 250 staff',
  description: HERO_SUBHEAD,
  alternates: { canonical: '/landing-page' },
  openGraph: {
    title: 'HQ.ai - AI HR for Australian businesses under 250 staff',
    description: HERO_SUBHEAD,
    url: '/landing-page',
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
        { '@type': 'Offer', name: 'Essentials', price: '99',  priceCurrency: 'AUD', priceSpecification: { '@type': 'UnitPriceSpecification', price: '99',  priceCurrency: 'AUD', unitText: 'MONTH' } },
        { '@type': 'Offer', name: 'Growth',     price: '199', priceCurrency: 'AUD', priceSpecification: { '@type': 'UnitPriceSpecification', price: '199', priceCurrency: 'AUD', unitText: 'MONTH' } },
        { '@type': 'Offer', name: 'Scale',      price: '379', priceCurrency: 'AUD', priceSpecification: { '@type': 'UnitPriceSpecification', price: '379', priceCurrency: 'AUD', unitText: 'MONTH' } },
      ],
    },
  ],
}

export default async function LandingPageRoute() {
  // Signed-in visitors who land on /landing-page jump straight to
  // the dashboard. Cold visitors see the full marketing page.
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
