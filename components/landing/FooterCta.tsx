// Section 9: footer CTA + trust strip. Brief section 5 verbatim.

import Link from 'next/link'

export default function FooterCta() {
  return (
    <section className="bg-bg-soft py-20 md:py-28" aria-labelledby="footer-cta-heading">
      <div className="mx-auto max-w-4xl px-6 text-center md:px-10">
        <h2 id="footer-cta-heading" className="font-display text-3xl font-bold leading-tight tracking-tight text-ink md:text-[44px]">
          Three minutes. No credit card. Better decisions today.
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-base text-ink-soft md:text-lg">
          You&apos;ll have your first HR answer cited, your first document drafted, and your team set up before the kettle boils.
        </p>
        <div className="mt-8">
          <Link
            href="/signup"
            className="inline-flex h-12 items-center justify-center rounded-full bg-clay px-8 text-sm font-semibold text-white shadow-card transition-opacity hover:opacity-90"
          >
            Start the trial - it&apos;s three minutes
          </Link>
        </div>

        <div className="mt-14 border-t border-border pt-6 text-sm text-ink-muted">
          Built on the Fair Work Act and all 122 awards. Hosted in Sydney. Made in Australia.
        </div>
      </div>
    </section>
  )
}
