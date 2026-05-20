// Section 3: the problem. 3-column pain breakdown from brief section 5.

export default function ProblemSection() {
  const cards = [
    {
      title: "The Award changed and you didn't know",
      body: 'A new minimum rate or allowance dropped on 1 July. You found out when an employee asked for back-pay.',
    },
    {
      title: "An employee resigned and you don't know what to send",
      body: "Notice, final pay, leave entitlements, the offer of a reference. Each one has a Fair Work answer you don't have time to find.",
    },
    {
      title: 'Employsure rang again',
      body: "The same retainer you've used twice this year is still costing $850 a month. You meant to cancel last quarter.",
    },
  ]

  return (
    <section className="bg-bg py-20 md:py-28" aria-labelledby="problem-heading">
      <div className="mx-auto max-w-6xl px-6 md:px-10">
        <p className="mb-4 text-xs font-medium uppercase tracking-[0.18em] text-ink-muted">The HR problem</p>
        <h2 id="problem-heading" className="font-serif text-3xl leading-tight tracking-tight text-ink md:text-[40px]">
          Modern Awards are 600 pages. Your phone is in your pocket.
        </h2>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {cards.map((c) => (
            <article key={c.title} className="rounded-2xl border border-border bg-bg-elevated p-6 shadow-card">
              <h3 className="font-serif text-xl text-ink">{c.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-ink-soft">{c.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
