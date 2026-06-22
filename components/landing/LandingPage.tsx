'use client'

// Top-level landing-page shell. Qase-modelled narrative (June 2026 rebuild):
//
//   Hero -> SocialProof -> Problem (Without/With) -> Metrics (deltas) ->
//   ToolExplorer (animated tabbed centerpiece) -> Persona band ->
//   Marketplace -> CustomerStory -> Comparison -> Pricing -> FAQ ->
//   FooterCta -> StickyMobile -> ReserveModal
//
// The single-tool deep-dives (ProductPillars / People / Recruit) now live
// on the /product/* subpages; the homepage explains all three tools through
// the interactive ToolExplorer instead. Renders inside the marketing
// data-app scope (set by MarketingHeader) so the dark tokens apply.

import { useState } from 'react'
import MarketingHeader from './MarketingHeader'
import MarketingFooter from './MarketingFooter'
import HeroSection from './HeroSection'
import SocialProofRibbon from './SocialProofRibbon'
import MetricsStrip from './MetricsStrip'
import ProblemSection from './ProblemSection'
import ToolExplorer from './ToolExplorer'
import PersonaBand from './PersonaBand'
import MarketplaceCarousel from './MarketplaceCarousel'
import CustomerStory from './CustomerStory'
import ComparisonSection from './ComparisonSection'
import PricingSection from './PricingSection'
import FaqSection from './FaqSection'
import FooterCta from './FooterCta'
import StickyMobileCta from './StickyMobileCta'
import ReserveSpotModal from './ReserveSpotModal'

export default function LandingPage() {
  const [reserveOpen, setReserveOpen] = useState(false)

  return (
    <>
      <MarketingHeader />
      <main className="min-h-screen bg-bg text-ink antialiased">
        <HeroSection />
        <SocialProofRibbon />
        <ProblemSection />
        <MetricsStrip />
        <div id="product"><ToolExplorer /></div>
        <PersonaBand />
        <MarketplaceCarousel onReserve={() => setReserveOpen(true)} />
        <CustomerStory />
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
