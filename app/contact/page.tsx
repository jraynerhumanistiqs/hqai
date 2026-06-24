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
  description: 'Get in touch with the Humanistiqs team behind HQ.ai. We read every message and reply, usually within one business day.',
  alternates: { canonical: '/contact' },
  robots: { index: true, follow: true },
}

export default function ContactPage() {
  return (
    <>
      <MarketingHeader />
      <main className="min-h-screen bg-bg text-ink antialiased">
        <section className="mx-auto max-w-3xl px-6 py-16 md:px-10 md:py-24">
          <p className="mb-4 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.06em] text-ink-muted">
            <span aria-hidden className="h-px w-5 bg-ink-muted" />
            Contact
          </p>
          <h1 className="font-display text-[36px] font-bold leading-[1.05] tracking-tight text-ink md:text-[48px]">
            Talk to the team behind HQ.ai.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink-soft">
            Got a question about HQ People, HQ Recruit, or pricing? Not sure if it suits your business?
            Send us a note. A real person reads every message.
          </p>
          <p className="mt-3 text-sm text-ink-muted">
            Want a dedicated advisor on call?{' '}
            <Link href="/enterprise" className="font-semibold text-accent hover:underline">
              See outsourced HR &amp; recruitment
            </Link>{' '}
            and book a call.
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
