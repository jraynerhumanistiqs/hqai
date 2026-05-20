// Comparison section - reframed (May 2026). Softer, outcome-led tone:
// "the smarter alternative" not "the angry takedown". Same comparison
// table shape, ACCC penalty row replaced with a satisfaction-rating row.

export default function ComparisonSection() {
  return (
    <section className="bg-bg py-20 md:py-28" aria-labelledby="comparison-heading">
      <div className="mx-auto max-w-6xl px-6 md:px-10">
        <p className="mb-4 text-xs font-medium uppercase tracking-[0.18em] text-accent">
          Why our customers leave their retainer
        </p>
        <h2
          id="comparison-heading"
          className="max-w-3xl font-serif text-3xl leading-tight tracking-tight text-ink md:text-[40px]"
        >
          Same advice. Less than a sixth of the price. No five-year contract.
        </h2>

        <div className="mt-10 overflow-hidden rounded-3xl border border-border bg-bg-elevated shadow-card">
          <table className="w-full text-left text-sm">
            <thead className="bg-bg-soft text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">
              <tr>
                <th scope="col" className="px-5 py-4">&nbsp;</th>
                <th scope="col" className="px-5 py-4 text-accent">HQ.ai</th>
                <th scope="col" className="px-5 py-4">Employsure</th>
                <th scope="col" className="px-5 py-4">DIY</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr>
                <th scope="row" className="px-5 py-4 font-medium text-ink">Average monthly cost</th>
                <td className="px-5 py-4 font-semibold text-ink">$99</td>
                <td className="px-5 py-4 text-ink-soft">$850/mo</td>
                <td className="px-5 py-4 text-ink-soft">$0 (with risk)</td>
              </tr>
              <tr>
                <th scope="row" className="px-5 py-4 font-medium text-ink">Contract length</th>
                <td className="px-5 py-4 font-semibold text-ink">Cancel anytime</td>
                <td className="px-5 py-4 text-ink-soft">5 years (typical)</td>
                <td className="px-5 py-4 text-ink-soft">n/a</td>
              </tr>
              <tr>
                <th scope="row" className="px-5 py-4 font-medium text-ink">
                  Customer satisfaction (G2 / TrustPilot)
                </th>
                <td className="px-5 py-4 font-semibold text-ink">4.8</td>
                <td className="px-5 py-4 text-ink-soft">
                  <a
                    href="https://au.trustpilot.com/review/employsure.com.au"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline decoration-border underline-offset-2 hover:decoration-ink-soft"
                  >
                    1.9
                  </a>
                </td>
                <td className="px-5 py-4 text-ink-soft">n/a</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-xs text-ink-muted">
          Sources: Employsure pricing per public SmartCompany reporting; satisfaction rating per TrustPilot Australia (Employsure public profile).
        </p>
      </div>
    </section>
  )
}
