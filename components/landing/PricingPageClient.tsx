'use client'

// Client wrapper for the standalone /pricing page - the pricing block
// and the FAQ.

import PricingSection from './PricingSection'
import FaqSection from './FaqSection'

export default function PricingPageClient() {
  return (
    <>
      <PricingSection />
      <FaqSection />
    </>
  )
}
