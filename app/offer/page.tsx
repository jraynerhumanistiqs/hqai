// /offer - one-off "Letter of Offer, $25, no signup" landing page.
//
// Marketing route, Option 2 (Ivory & Clay) styling inherited from
// :root in app/globals.css. The page is intentionally single-purpose:
// hero + value props + form + checkout. No sidebar, no chrome -
// every element supports the one conversion.
//
// Tone copied from ops/brand-voice.md:
//   - Specific over generic, plain hyphens only, AU English
//   - First person from the AI ("I'll draft the letter")
//   - "Three minutes, no signup" lifted directly from the brand-voice
//     example phrases
//
// Hosted at the root, NOT under /dashboard, so unauthenticated visitors
// can convert. Form posts to /api/stripe/one-off which redirects to
// Stripe Checkout. On success, /offer/success runs the fulfilment
// endpoint which generates + emails the PDF.

import OfferLandingClient from './OfferLandingClient'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Letter of Offer - $25, ready in three minutes - HQ.ai',
  description: 'A Fair Work compliant Letter of Offer for one new hire. No subscription. No consultant. Emailed to you as a Word doc and a PDF.',
}

export default function OfferPage() {
  return <OfferLandingClient />
}
