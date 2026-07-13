// Comparison section - harder "retainer trap" angle (June 2026) per the
// landing research brief, but DEFAMATION-SAFE: no competitor is named.
// The column is the generic "Traditional HR retainer" and the ACCC
// penalty is cited as a true, public-record buyer-beware fact about the
// sector without attributing it to any one firm. Truth + public record
// + no name keeps this safe to publish. Founder should still get their
// own legal comfort on tone before launch.

import Cited from './Cited'

export default function ComparisonSection() {
  return (
    <section className="bg-bg py-20 md:py-28" aria-labelledby="comparison-heading">
      <div className="mx-auto max-w-6xl px-6 md:px-10">
        <p className="mb-4 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.06em] text-clay">
          <span aria-hidden className="h-px w-5 bg-clay" />
          The retainer trap
        </p>
        <h2
          id="comparison-heading"
          className="max-w-3xl font-display text-3xl font-bold leading-tight tracking-tight text-ink md:text-[40px]"
        >
          Don&apos;t lock into a multi-year contract for support you&apos;re not ready to use.
        </h2>
        <p className="mt-4 max-w-2xl text-base text-ink-soft md:text-lg">
          The same everyday HR and hiring support, minus the lock-in contract with exit penalties, and the wait. A fraction of the price. Cancel any time.
        </p>

        <div className="mt-10 overflow-hidden rounded-3xl border border-border bg-bg-elevated shadow-card">
          <table className="w-full text-left text-sm">
            <thead className="bg-bg-soft text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">
              <tr>
                <th scope="col" className="px-5 py-4">&nbsp;</th>
                <th scope="col" className="px-5 py-4 text-accent">HQ.ai</th>
                <th scope="col" className="px-5 py-4">Traditional HR &amp; recruitment retainer</th>
                <th scope="col" className="px-5 py-4">DIY</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr>
                <th scope="row" className="px-5 py-4 font-medium text-ink">Average monthly cost</th>
                <td className="px-5 py-4 font-semibold text-ink">From $59</td>
                <td className="px-5 py-4 text-ink-soft">~$850/mo</td>
                <td className="px-5 py-4 text-ink-soft">$0 (with risk)</td>
              </tr>
              <tr>
                <th scope="row" className="px-5 py-4 font-medium text-ink">Contract length</th>
                <td className="px-5 py-4 font-semibold text-ink">Cancel anytime</td>
                <td className="px-5 py-4 text-ink-soft">Multi-year lock-in (typical)</td>
                <td className="px-5 py-4 text-ink-soft">n/a</td>
              </tr>
              <tr>
                <th scope="row" className="px-5 py-4 font-medium text-ink">Pricing</th>
                <td className="px-5 py-4 font-semibold text-ink">Published, transparent</td>
                <td className="px-5 py-4 text-ink-soft">Quote on a sales call</td>
                <td className="px-5 py-4 text-ink-soft">n/a</td>
              </tr>
              <tr>
                <th scope="row" className="px-5 py-4 font-medium text-ink">
                  <Cited placement="top" note="The admin and the documents, done for you - not just pointed at.">Handles the admin and the documents</Cited>
                </th>
                <td className="px-5 py-4 font-semibold text-ink">Yes</td>
                <td className="px-5 py-4 text-ink-soft">Sometimes</td>
                <td className="px-5 py-4 text-ink-soft">No</td>
              </tr>
              <tr>
                <th scope="row" className="px-5 py-4 font-medium text-ink">Covers hiring too</th>
                <td className="px-5 py-4 font-semibold text-ink">Yes - full recruit suite</td>
                <td className="px-5 py-4 text-ink-soft">Usually extra</td>
                <td className="px-5 py-4 text-ink-soft">No</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Public-record buyer-beware callout. States a true Federal Court
            fact (ACCC, 2020, $3M, unfair contract terms) WITHOUT naming
            the firm - so it is safe to publish while still landing the
            "read the contract before you sign" point. */}
        <div className="mt-6 rounded-2xl border border-warning/30 bg-warning/5 px-5 py-4">
          <p className="text-sm leading-relaxed text-ink-soft">
            <strong className="text-ink">Worth knowing:</strong> in 2020 the Federal Court ordered a
            $3 million penalty against a major Australian workplace-advice firm for unfair contract
            terms and misleading conduct. Always read the contract before you sign a multi-year
            retainer.
          </p>
        </div>

        <p className="mt-4 text-xs text-ink-muted">
          Sources: retainer pricing per public SmartCompany reporting; Federal Court penalty per the
          ACCC public record (accc.gov.au). Comparison is to a typical HR retainer, not any specific
          provider.
        </p>
      </div>
    </section>
  )
}
