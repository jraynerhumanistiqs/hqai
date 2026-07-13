'use client'

// Top-level landing-page shell. Qase-modelled narrative (June 2026 rebuild):
//
//   Hero -> SocialProof -> Problem (Without/With) -> Metrics (deltas) ->
//   ToolExplorer (animated tabbed centerpiece) -> Persona band ->
//   Marketplace -> CustomerStory -> Comparison -> Pricing -> FAQ ->
//   FooterCta -> StickyMobile
//
// The single-tool deep-dives (ProductPillars / People / Recruit) now live
// on the /product/* subpages; the homepage explains all three tools through
// the interactive ToolExplorer instead. Renders inside the marketing
// data-app scope (set by MarketingHeader) so the dark tokens apply.

import dynamic from 'next/dynamic'
import MarketingHeader from './MarketingHeader'
import MarketingFooter from './MarketingFooter'
import HeroSection from './HeroSection'
import MetricsStrip from './MetricsStrip'
import ProblemSection from './ProblemSection'
import PersonaBand from './PersonaBand'
import CustomerStory from './CustomerStory'
import ComparisonSection from './ComparisonSection'
import PricingSection from './PricingSection'
import FaqSection from './FaqSection'
import FooterCta from './FooterCta'
import StickyMobileCta from './StickyMobileCta'

// Below-the-fold, interaction-heavy sections are code-split so they don't
// weigh down the landing page's initial JS bundle. ToolExplorer (the
// animated tabbed centerpiece) and the Marketplace carousel keep SSR on
// (ssr defaults to true) so their content still server-renders - no layout
// shift or SEO loss - while their client JS is deferred into separate chunks
// that hydrate after the above-the-fold content. A min-height placeholder
// reserves space to avoid CLS if a chunk is slow.
const ToolExplorer = dynamic(() => import('./ToolExplorer'), {
  loading: () => <div className="min-h-[560px]" aria-hidden="true" />,
})
const MarketplaceCarousel = dynamic(() => import('./MarketplaceCarousel'), {
  loading: () => <div className="min-h-[420px]" aria-hidden="true" />,
})

export default function LandingPage() {
  return (
    <>
      <MarketingHeader />
      <main className="min-h-screen bg-bg text-ink antialiased">
        <HeroSection />
        <ProblemSection />
        <MetricsStrip />
        <div id="product"><ToolExplorer /></div>
        <PersonaBand />
        <MarketplaceCarousel />
        <CustomerStory />
        <ComparisonSection />
        <PricingSection />
        <FaqSection />
        <FooterCta />
        <StickyMobileCta />
      </main>
      <MarketingFooter />
    </>
  )
}
