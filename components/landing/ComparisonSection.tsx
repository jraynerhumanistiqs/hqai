// Section 6: comparison block (named-and-shamed Employsure).
// Copy lifted verbatim from brief section 5.

export default function ComparisonSection() {
  return (
    <section className="bg-bg py-20 md:py-28" aria-labelledby="comparison-heading">
      <div className="mx-auto max-w-6xl px-6 md:px-10">
        <p className="mb-4 text-xs font-medium uppercase tracking-[0.18em] text-accent">The Employsure tax</p>
        <h2 id="comparison-heading" className="max-w-3xl font-serif text-3xl leading-tight tracking-tight text-ink md:text-[40px]">
          Don&apos;t pay $50,000 for advice you barely use.
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
                <td className="px-5 py-4 text-ink-soft">~$850 (per public reports)</td>
                <td className="px-5 py-4 text-ink-soft">$0 (with risk)</td>
              </tr>
              <tr>
                <th scope="row" className="px-5 py-4 font-medium text-ink">Contract length</th>
                <td className="px-5 py-4 font-semibold text-ink">Cancel anytime</td>
                <td className="px-5 py-4 text-ink-soft">5 years (typical)</td>
                <td className="px-5 py-4 text-ink-soft">n/a</td>
              </tr>
              <tr>
                <th scope="row" className="px-5 py-4 font-medium text-ink">ACCC public penalty</th>
                <td className="px-5 py-4 font-semibold text-ink">None</td>
                <td className="px-5 py-4 text-ink-soft">$3M, 2020 (Federal Court)</td>
                <td className="px-5 py-4 text-ink-soft">n/a</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-xs text-ink-muted">
          Sources: Employsure pricing per public SmartCompany reporting; ACCC Federal Court penalty record at accc.gov.au.
        </p>
      </div>
    </section>
  )
}
