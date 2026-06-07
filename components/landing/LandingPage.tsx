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

import { useState } from 'react'
import MarketingHeader from './MarketingHeader'
import MarketingFooter from './MarketingFooter'
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

  // The marketing theme scope (data-app="marketing") is set by
  // MarketingHeader, which this page renders - so it is managed in one
  // place across the whole public site.

  return (
    <>
      <MarketingHeader />
      <main className="min-h-screen bg-bg text-ink antialiased">
        <HeroSection />
        <SocialProofRibbon />
        <MetricsStrip />
        <ProblemSection />
        <div id="product"><ProductPillars /></div>
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
      <MarketingFooter />
    </>
  )
}
