// Product pillars overview - replaces the old ProductSection. Two equal
// cards side by side: HQ People + HQ Recruit. Identical dimensions,
// identical bullet counts, identical word weight - no per-card CTAs so
// the page-level CTAs in the hero and footer stay primary.

export default function ProductPillars() {
  return (
    <section className="bg-bg py-14 md:py-20" aria-labelledby="pillars-heading">
      <div className="mx-auto max-w-6xl px-6 md:px-10">
        <p className="mb-4 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.06em] text-clay">
          <span aria-hidden className="h-px w-5 bg-clay" />
          Two tools. One login.
        </p>
        <h2
          id="pillars-heading"
          className="max-w-3xl font-display text-3xl font-bold leading-tight tracking-tight text-ink md:text-[40px]"
        >
          Answers, documents, and hiring - all sorted.
        </h2>
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-ink-soft md:text-lg">
          HQ People handles your staff. HQ Recruit handles your hiring. Both built for Australian workplaces, so you never have to wade through the fine print yourself.
        </p>

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          {/* CARD A - HQ PEOPLE */}
          <article className="flex flex-col rounded-3xl border border-border bg-bg-elevated p-8 shadow-card md:p-10">
            <p className="font-mono text-[11px] uppercase tracking-[0.06em] text-ink-muted">HQ People</p>
            <h3 className="mt-3 font-display text-[26px] font-bold tracking-tight leading-snug text-ink">
              Your HR brain, on tap.
            </h3>
            <p className="mt-4 text-[15px] leading-relaxed text-ink-soft">
              Ask any HR question and get the right answer for your business in under a minute. Need a letter or contract? It writes it for you. When a question gets tricky, a real human advisor steps in.
            </p>

            <ul className="mt-7 space-y-3 text-sm text-ink-soft">
              <li className="flex items-start gap-3">
                <Tick />
                <span>Clear answers to your everyday HR questions</span>
              </li>
              <li className="flex items-start gap-3">
                <Tick />
                <span>A full library of ready-to-use HR documents</span>
              </li>
              <li className="flex items-start gap-3">
                <Tick />
                <span>One-click PDF with your logo</span>
              </li>
              <li className="flex items-start gap-3">
                <Tick />
                <span>The same human advisor every time - never repeat yourself</span>
              </li>
            </ul>
          </article>

          {/* CARD B - HQ RECRUIT */}
          <article className="flex flex-col rounded-3xl border border-border bg-bg-elevated p-8 shadow-card md:p-10">
            <p className="font-mono text-[11px] uppercase tracking-[0.06em] text-ink-muted">HQ Recruit</p>
            <h3 className="mt-3 font-display text-[26px] font-bold tracking-tight leading-snug text-ink">
              Your hiring decisions, faster and fairer.
            </h3>
            <p className="mt-4 text-[15px] leading-relaxed text-ink-soft">
              Score a pile of CVs against the job in minutes, not hours. Run video and phone interviews with the answers scored for you. Write a SEEK-ready job ad in three steps. Names and photos can be hidden so you judge on merit.
            </p>

            <ul className="mt-7 space-y-3 text-sm text-ink-soft">
              <li className="flex items-start gap-3">
                <Tick />
                <span>Score every CV against what the job needs</span>
              </li>
              <li className="flex items-start gap-3">
                <Tick />
                <span>Video and phone interviews from one link</span>
              </li>
              <li className="flex items-start gap-3">
                <Tick />
                <span>Write a SEEK-ready job ad in 5 minutes</span>
              </li>
              <li className="flex items-start gap-3">
                <Tick />
                <span>Every CV scored the same way, with the evidence shown</span>
              </li>
            </ul>
          </article>
        </div>
      </div>
    </section>
  )
}

function Tick() {
  return (
    <svg
      viewBox="0 0 16 16"
      className="mt-1 h-3.5 w-3.5 shrink-0 text-accent"
      aria-hidden
    >
      <path fill="currentColor" d="M6.2 11.4 3 8.2l1.1-1.1 2.1 2.1 5.7-5.7 1.1 1.1z" />
    </svg>
  )
}
