// Section 9: footer CTA + trust strip. Brief section 5 verbatim.

import Link from 'next/link'

export default function FooterCta() {
  return (
    <section className="bg-bg-soft py-20 md:py-28" aria-labelledby="footer-cta-heading">
      <div className="mx-auto max-w-4xl px-6 text-center md:px-10">
        <h2 id="footer-cta-heading" className="font-serif text-3xl leading-tight tracking-tight text-ink md:text-[44px]">
          Three minutes. No credit card.
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-base text-ink-soft md:text-lg">
          You&apos;ll have your first Fair Work answer cited, your first document drafted, and your team set up before the kettle boils.
        </p>
        <div className="mt-8">
          <Link
            href="/signup"
            className="inline-flex h-12 items-center justify-center rounded-full bg-accent px-8 text-sm font-semibold text-ink-on-accent shadow-card transition-colors hover:bg-accent-hover"
          >
            Start the trial - it&apos;s three minutes
          </Link>
        </div>

        <div className="mt-14 border-t border-border pt-6 text-sm text-ink-muted">
          Grounded in the Fair Work Act 2009 + 122 Modern Awards. Hosted in Sydney. Built in Australia.
        </div>
      </div>
    </section>
  )
}
