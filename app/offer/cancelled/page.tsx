// /offer/cancelled - Stripe Checkout cancel target. Keeps the door
// open for retry and links to the subscription path for buyers who
// changed their mind about the one-off.

import Link from 'next/link'

export const metadata = {
  title: 'Checkout cancelled - HQ.ai Letter of Offer',
}

export default function OfferCancelledPage() {
  return (
    <main className="min-h-screen bg-bg text-ink">
      <header className="border-b border-border">
        <div className="max-w-3xl mx-auto px-6 py-5 flex items-center justify-between">
          <Link href="/" className="font-display text-lg font-bold text-ink hover:text-accent">
            HQ.ai
          </Link>
        </div>
      </header>

      <section className="max-w-2xl mx-auto px-6 py-16">
        <div className="bg-bg-elevated border border-border rounded-panel p-8 shadow-card">
          <h1 className="font-display text-h1 font-bold text-ink mb-3">
            Checkout cancelled. No charge.
          </h1>
          <p className="text-body text-ink-soft mb-6 max-w-xl">
            You closed the Stripe window before paying, so nothing has
            been charged and no Letter has been generated. If that was
            a mistake, the form has saved your draft - just head back
            and re-submit.
          </p>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/offer"
              className="bg-accent hover:bg-accent-hover text-ink-on-accent text-small font-bold rounded-full px-5 py-2.5"
            >
              Back to the Letter of Offer form
            </Link>
            <Link
              href="/login?intent=signup"
              className="border border-border hover:bg-bg-soft text-ink text-small font-bold rounded-full px-5 py-2.5"
            >
              Try the 14-day trial instead
            </Link>
            <a
              href="mailto:support@humanistiqs.com.au"
              className="text-small font-bold text-ink-soft hover:text-ink underline-offset-4 hover:underline px-2 py-2.5"
            >
              Email support
            </a>
          </div>
        </div>
      </section>
    </main>
  )
}
