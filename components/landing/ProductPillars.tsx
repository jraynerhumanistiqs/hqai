// Product pillars overview - replaces the old ProductSection. Two equal
// cards side by side: HQ People + HQ Recruit. Identical dimensions,
// identical bullet counts, identical word weight - no per-card CTAs so
// the page-level CTAs in the hero and footer stay primary.

export default function ProductPillars() {
  return (
    <section className="bg-bg-soft py-20 md:py-28" aria-labelledby="pillars-heading">
      <div className="mx-auto max-w-6xl px-6 md:px-10">
        <p className="mb-4 text-xs font-medium uppercase tracking-[0.18em] text-ink-muted">
          Two products. One operating system.
        </p>
        <h2
          id="pillars-heading"
          className="max-w-3xl font-serif text-3xl leading-tight tracking-tight text-ink md:text-[40px]"
        >
          Decisions, drafted, defended.
        </h2>
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-ink-soft md:text-lg">
          HQ People covers the people side. HQ Recruit covers the hiring side. Both grounded in Australian employment law, both built to save you reading the small print.
        </p>

        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          {/* CARD A - HQ PEOPLE */}
          <article className="flex flex-col rounded-3xl border border-border bg-bg-elevated p-8 shadow-card md:p-10">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">HQ People</p>
            <h3 className="mt-3 font-serif text-[26px] leading-snug text-ink">
              Your HR brain, on tap.
            </h3>
            <p className="mt-4 text-[15px] leading-relaxed text-ink-soft">
              Ask any HR question and get the right answer for your business in under a minute. Draft any HR document - contracts, warnings, letters - with the AI Administrator. Hand off to a human advisor on the calls that matter.
            </p>

            <ul className="mt-7 space-y-3 text-sm text-ink-soft">
              <li className="flex items-start gap-3">
                <Tick />
                <span>AI Advisor grounded in Australian employment law</span>
              </li>
              <li className="flex items-start gap-3">
                <Tick />
                <span>33 best-practice HR document templates</span>
              </li>
              <li className="flex items-start gap-3">
                <Tick />
                <span>One-click PDF export with your logo</span>
              </li>
              <li className="flex items-start gap-3">
                <Tick />
                <span>Same human advisor on every escalation - never repeat yourself</span>
              </li>
            </ul>
          </article>

          {/* CARD B - HQ RECRUIT */}
          <article className="flex flex-col rounded-3xl border border-border bg-bg-elevated p-8 shadow-card md:p-10">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">HQ Recruit</p>
            <h3 className="mt-3 font-serif text-[26px] leading-snug text-ink">
              Your hiring decisions, faster and fairer.
            </h3>
            <p className="mt-4 text-[15px] leading-relaxed text-ink-soft">
              Score a stack of CVs against the role in minutes, not hours. Run video and phone screens with AI-scored answers. Write a SEEK-ready job ad in three steps. Bias-trigger anonymisation runs automatically.
            </p>

            <ul className="mt-7 space-y-3 text-sm text-ink-soft">
              <li className="flex items-start gap-3">
                <Tick />
                <span>CV scoring against a role-specific rubric</span>
              </li>
              <li className="flex items-start gap-3">
                <Tick />
                <span>Video + phone screens with one shareable link</span>
              </li>
              <li className="flex items-start gap-3">
                <Tick />
                <span>Campaign Coach drafts SEEK-ready ads in 5 minutes</span>
              </li>
              <li className="flex items-start gap-3">
                <Tick />
                <span>Auto-anonymises candidates when bias signals are detected</span>
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
