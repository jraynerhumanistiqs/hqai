// Public /marketplace - the pay-as-you-go Document Marketplace, in the shared
// marketing chrome. Look and feel only: browse and search are inert (no
// checkout, no cart) - we wire functionality later. Document names and prices
// source from lib/pricing-config.ts and lib/template-ip.ts inside the client
// component; never duplicate prices here.

import type { Metadata } from 'next'
import MarketingHeader from '@/components/landing/MarketingHeader'
import MarketingFooter from '@/components/landing/MarketingFooter'
import DocumentMarketplace from '@/components/landing/DocumentMarketplace'

export const metadata: Metadata = {
  title: 'HQ.ai Document Marketplace - HR documents from $25, no subscription',
  description:
    'Buy individual HR and recruitment documents pay-as-you-go. Pick a document, answer a few questions, and it is ready to sign in three minutes. From $25, no subscription. Offer letters, contracts, warnings, performance plans and more.',
  alternates: { canonical: '/marketplace' },
  robots: { index: true, follow: true },
}

export default function MarketplacePage() {
  return (
    <>
      <MarketingHeader />
      <DocumentMarketplace />
      <MarketingFooter />
    </>
  )
}
