// Public /contact page - general (non-Enterprise) enquiries. Wrapped in
// the shared marketing chrome. Enterprise prospects are pointed at the
// /enterprise discovery-call funnel instead.

import type { Metadata } from 'next'
import Link from 'next/link'
import MarketingHeader from '@/components/landing/MarketingHeader'
import MarketingFooter from '@/components/landing/MarketingFooter'
import ContactForm from '@/components/landing/ContactForm'

export const metadata: Metadata = {
  title: 'Contact HQ.ai',
  description: 'Get in touch with the Humanistiqs team behind HQ.ai. We read every enquiry and reply, usually within one business day.',
  alternates: { canonical: '/contact' },
  robots: { index: true, follow: true },
}

export default function ContactPage() {
  return (
    <>
      <MarketingHeader />
      <main className="min-h-screen bg-bg text-ink antialiased">
        <section className="mx-auto max-w-3xl px-6 py-16 md:px-10 md:py-24">
          <p className="mb-4 text-xs font-medium uppercase tracking-[0.18em] text-ink-muted">Contact</p>
          <h1 className="font-display text-[36px] font-bold leading-[1.05] tracking-tight text-ink md:text-[48px]">
            Talk to the team behind HQ.ai.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink-soft">
            Questions about HQ People, HQ Recruit, pricing, or whether it fits your business? Send us a
            note. A real person from Humanistiqs reads every enquiry.
          </p>
          <p className="mt-3 text-sm text-ink-muted">
            Looking for a dedicated advisor or talent partner?{' '}
            <Link href="/enterprise" className="font-semibold text-accent hover:underline">
              See HQ.ai Enterprise
            </Link>{' '}
            and book a discovery call.
          </p>

          <div className="mt-10">
            <ContactForm />
          </div>
        </section>
      </main>
      <MarketingFooter />
    </>
  )
}
