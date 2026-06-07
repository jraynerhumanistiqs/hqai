// Problem section - decision-making rewrite. Three text-only columns,
// no icons, equal weight: People decisions, Hiring decisions, Cost of
// getting it wrong.

export default function ProblemSection() {
  const cards = [
    {
      title: 'Every HR call feels like a coin flip.',
      body: "A staff member resigns at 4pm Friday. You don't know what to write, what to pay out, or what counts as the right notice. The Award is 600 pages.",
    },
    {
      title: "Hiring takes weeks you don't have.",
      body: "You read 80 CVs, interview six, hire the wrong one. You wrote the ad on a Sunday night, in your second language as a tradie - not a copywriter.",
    },
    {
      title: 'Outside advice costs four figures.',
      body: 'A 30-minute call with a workplace lawyer is $450. A traditional HR retainer runs about $850 a month, often locked in for years. You used it twice.',
    },
  ]

  return (
    <section className="bg-bg py-20 md:py-28" aria-labelledby="problem-heading">
      <div className="mx-auto max-w-6xl px-6 md:px-10">
        <p className="mb-4 text-xs font-medium uppercase tracking-[0.18em] text-ink-muted">
          Where small businesses burn hours and dollars
        </p>
        <h2
          id="problem-heading"
          className="max-w-3xl font-display text-3xl font-bold leading-tight tracking-tight text-ink md:text-[40px]"
        >
          Modern Awards run to 600 pages. You&apos;ve got a business to run.
        </h2>

        <div className="mt-14 grid gap-10 md:grid-cols-3 md:gap-12">
          {cards.map((c) => (
            <article key={c.title} className="max-w-md">
              <h3 className="font-display text-[22px] font-bold tracking-tight leading-snug text-ink">{c.title}</h3>
              <p className="mt-4 text-[15px] leading-relaxed text-ink-soft">{c.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
