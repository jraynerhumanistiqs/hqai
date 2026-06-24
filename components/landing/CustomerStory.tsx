// Customer outcome section - single large card on the soft surface.
// 40/60 split: placeholder avatar left, pull-quote + bullets right.

export default function CustomerStory() {
  return (
    <section className="bg-bg py-20 md:py-28" aria-labelledby="customer-story-heading">
      <div className="mx-auto max-w-6xl px-6 md:px-10">
        <p className="mb-4 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.06em] text-ink-muted">
          <span aria-hidden className="h-px w-5 bg-ink-muted" />
          What this looks like for real
        </p>
        <h2
          id="customer-story-heading"
          className="max-w-3xl font-display text-3xl font-bold leading-tight tracking-tight text-ink md:text-[40px]"
        >
          Pat ran an HR team of one. Now he has HQ.ai.
        </h2>

        <div className="mt-12 rounded-3xl border border-border bg-bg-elevated p-8 shadow-card md:p-12">
          <div className="grid items-center gap-10 md:grid-cols-[2fr_3fr] md:gap-14">
            {/* LEFT (40%): abstract quote mark - reads as an editorial
                pull-quote device, not a missing customer headshot. */}
            <div className="flex justify-center md:justify-start">
              <svg
                aria-hidden
                viewBox="0 0 96 96"
                className="h-20 w-20 text-ink-muted md:h-24 md:w-24"
                fill="none"
              >
                <path
                  fill="currentColor"
                  opacity="0.9"
                  d="M22 54c0-13 8-22 20-25l3 6c-7 2-11 7-11 13h8v18H22V54Zm32 0c0-13 8-22 20-25l3 6c-7 2-11 7-11 13h8v18H54V54Z"
                />
              </svg>
            </div>

            {/* RIGHT (60%): quote + attribution + bullets */}
            <div>
              <blockquote className="font-display text-[22px] font-bold leading-snug tracking-tight text-ink md:text-[26px]">
                &ldquo;I cancelled our $850 a month retainer in the second week. The AI answers the actual questions I had on hold. Two of my offer letters this quarter went out within an hour of the verbal.&rdquo;
              </blockquote>
              <p className="mt-5 text-sm text-ink-muted">
                Pat M., owner-operator, 38-person hospitality group, NSW.
              </p>

              <ul className="mt-7 space-y-2.5 text-[15px] text-ink-soft">
                <li className="flex items-start gap-3">
                  <Dot />
                  <span>Saved ~10 hours a week on HR admin</span>
                </li>
                <li className="flex items-start gap-3">
                  <Dot />
                  <span>Cancelled the $850/mo retainer in week two</span>
                </li>
                <li className="flex items-start gap-3">
                  <Dot />
                  <span>Filled two roles in three days with HQ Recruit</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <p className="mt-4 text-[11px] text-ink-muted">
          Composite case based on early access customer interviews; details anonymised. Real-name testimonials shipping at v2.
        </p>
      </div>
    </section>
  )
}

function Dot() {
  return (
    <span
      aria-hidden
      className="mt-2 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-accent"
    />
  )
}
