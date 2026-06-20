// HQ People deep-dive - 60/40 split, mock on the left, copy on the
// right. Static mock (no animation) - the live moment is the hero.

export default function PeopleDeepDive() {
  return (
    <section className="bg-bg py-20 md:py-28" aria-labelledby="people-deepdive-heading">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 md:grid-cols-[3fr_2fr] md:gap-16 md:px-10">
        {/* LEFT (60%): product mock */}
        <div className="order-2 md:order-1">
          <div className="rounded-3xl border border-border bg-bg-elevated p-6 shadow-float md:p-7">
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-accent" />
              <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-ink-muted">
                HQ People - AI Advisor
              </span>
            </div>

            <div className="mt-5 space-y-3">
              <button
                type="button"
                className="block w-full cursor-default rounded-2xl border border-border bg-bg px-4 py-3 text-left text-sm text-ink-soft"
              >
                Do I have to approve a flexible-work request?
              </button>
              <button
                type="button"
                className="block w-full cursor-default rounded-2xl border border-accent bg-accent-soft px-4 py-3 text-left text-sm text-ink"
              >
                Termination notice for a 7-month employee?
              </button>
            </div>

            <div className="mt-5 rounded-2xl bg-bg p-4">
              <p className="text-sm leading-relaxed text-ink">
                After 6 months but under 1 year, the legal minimum notice is 1 week (plus an extra week if they are over 45 with 2+ years service - not your case). Check the contract in case it offers more.
              </p>
              <div className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-accent bg-bg-elevated px-2.5 py-1 text-[10px] font-medium text-accent">
                <svg aria-hidden viewBox="0 0 12 12" className="h-3 w-3">
                  <path
                    fill="currentColor"
                    d="M6 1l1.5 3 3.3.5-2.4 2.3.6 3.3L6 8.5l-3 1.6.6-3.3L1.2 4.5l3.3-.5z"
                  />
                </svg>
                Cited: s 117 Fair Work Act 2009
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT (40%): copy */}
        <div className="order-1 md:order-2">
          <p className="mb-4 text-xs font-medium uppercase tracking-[0.18em] text-clay">
            HQ People - decide the people stuff
          </p>
          <h2
            id="people-deepdive-heading"
            className="font-display text-[28px] font-bold leading-tight tracking-tight text-ink md:text-[36px]"
          >
            Every HR call, with the right answer in 30 seconds.
          </h2>

          <div className="mt-6 space-y-4 text-base leading-relaxed text-ink-soft">
            <p>
              Notice periods. Probation. Casual conversion. Flexible-work requests. The right award. The 30-odd questions every small-business owner faces in a year, answered in plain English.
            </p>
            <p>
              Every answer shows where it comes from - the Fair Work Act or your award. You see the proof. You decide.
            </p>
            <p>
              Need a document? It writes contracts, warnings, offer letters and more - 33 in all - with your logo on them, in an editor that feels just like Word.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
