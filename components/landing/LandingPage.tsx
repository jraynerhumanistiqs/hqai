'use client'

// Top-level landing-page shell. Composes the nine sections in the order
// prescribed by section 5 of docs/research/landing-page-research-brief.md.
//
// Renders inside the marketing data-app scope so the Ivory & Clay tokens
// from app/globals.css :root apply.

import { useEffect, useState } from 'react'
import HeroSection from './HeroSection'
import SocialProofRibbon from './SocialProofRibbon'
import ProblemSection from './ProblemSection'
import ProductSection from './ProductSection'
import MarketplaceCarousel from './MarketplaceCarousel'
import ComparisonSection from './ComparisonSection'
import PricingSection from './PricingSection'
import FaqSection from './FaqSection'
import FooterCta from './FooterCta'
import StickyMobileCta from './StickyMobileCta'
import ReserveSpotModal from './ReserveSpotModal'

export default function LandingPage() {
  const [reserveOpen, setReserveOpen] = useState(false)

  // Apply the marketing palette scope. Done client-side so this page can
  // sit at the public root without disturbing product surfaces.
  useEffect(() => {
    if (typeof document === 'undefined') return
    const html = document.documentElement
    const prev = html.getAttribute('data-app')
    html.setAttribute('data-app', 'marketing')
    return () => {
      if (prev) html.setAttribute('data-app', prev)
      else html.removeAttribute('data-app')
    }
  }, [])

  return (
    <main className="min-h-screen bg-bg text-ink antialiased">
      <HeroSection />
      <SocialProofRibbon />
      <ProblemSection />
      <ProductSection />
      <MarketplaceCarousel onReserve={() => setReserveOpen(true)} />
      <ComparisonSection />
      <PricingSection onReserve={() => setReserveOpen(true)} />
      <FaqSection />
      <FooterCta />
      <StickyMobileCta onReserve={() => setReserveOpen(true)} />
      <ReserveSpotModal open={reserveOpen} onClose={() => setReserveOpen(false)} />
    </main>
  )
}
