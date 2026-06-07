'use client'

// Top-level landing-page shell. Composes the sections in the
// decision-making narrative order (May 2026 restructure):
//
//   Hero -> SocialProof -> Metrics -> Problem -> ProductPillars ->
//   PeopleDeepDive -> RecruitDeepDive -> Marketplace -> CustomerStory ->
//   Comparison -> Pricing -> FAQ -> FooterCta -> StickyMobile -> ReserveModal
//
// Renders inside the marketing data-app scope so the Ivory & Clay
// tokens from app/globals.css :root apply.

import { useEffect, useState } from 'react'
import HeroSection from './HeroSection'
import SocialProofRibbon from './SocialProofRibbon'
import MetricsStrip from './MetricsStrip'
import ProblemSection from './ProblemSection'
import ProductPillars from './ProductPillars'
import PeopleDeepDive from './PeopleDeepDive'
import RecruitDeepDive from './RecruitDeepDive'
import MarketplaceCarousel from './MarketplaceCarousel'
import CustomerStory from './CustomerStory'
import FounderNote from './FounderNote'
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
      <MetricsStrip />
      <ProblemSection />
      <ProductPillars />
      <PeopleDeepDive />
      <RecruitDeepDive />
      <MarketplaceCarousel onReserve={() => setReserveOpen(true)} />
      <CustomerStory />
      <FounderNote />
      <ComparisonSection />
      <PricingSection onReserve={() => setReserveOpen(true)} />
      <FaqSection />
      <FooterCta />
      <StickyMobileCta onReserve={() => setReserveOpen(true)} />
      <ReserveSpotModal open={reserveOpen} onClose={() => setReserveOpen(false)} />
    </main>
  )
}
