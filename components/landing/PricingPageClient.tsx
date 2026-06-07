'use client'

// Client wrapper for the standalone /pricing page - owns the reserve
// modal state shared by the pricing block and the marketplace CTA.

import { useState } from 'react'
import PricingSection from './PricingSection'
import FaqSection from './FaqSection'
import ReserveSpotModal from './ReserveSpotModal'

export default function PricingPageClient() {
  const [reserveOpen, setReserveOpen] = useState(false)
  return (
    <>
      <PricingSection onReserve={() => setReserveOpen(true)} />
      <FaqSection />
      <ReserveSpotModal open={reserveOpen} onClose={() => setReserveOpen(false)} />
    </>
  )
}
