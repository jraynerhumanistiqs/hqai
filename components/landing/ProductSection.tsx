// Section 4: the product. HQ People + HQ Recruit side by side.
// Static for v1 with micro-illustration placeholders.

import Link from 'next/link'

export default function ProductSection() {
  return (
    <section className="bg-bg-soft py-20 md:py-28" aria-labelledby="product-heading">
      <div className="mx-auto max-w-6xl px-6 md:px-10">
        <p className="mb-4 text-xs font-medium uppercase tracking-[0.18em] text-ink-muted">The product</p>
        <h2 id="product-heading" className="max-w-3xl font-serif text-3xl leading-tight tracking-tight text-ink md:text-[40px]">
          An AI advisor that cites the law. A team of tools that draft the documents.
        </h2>

        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          <article className="flex flex-col rounded-3xl border border-border bg-bg-elevated p-7 shadow-card">
            <header>
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-accent">HQ People</p>
              <h3 className="mt-2 font-serif text-2xl text-ink">The advisor that picks up at 9pm on a Tuesday.</h3>
            </header>
            <ChatIllustration />
            <ul className="mt-6 space-y-2 text-sm text-ink-soft">
              <li>Ask in plain English. Get the answer with the Fair Work citation.</li>
              <li>33 document templates ready to draft, sign and send.</li>
              <li>Hands off to a real Humanistiqs advisor when it matters.</li>
            </ul>
          </article>

          <article className="flex flex-col rounded-3xl border border-border bg-bg-elevated p-7 shadow-card">
            <header>
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-accent">HQ Recruit</p>
              <h3 className="mt-2 font-serif text-2xl text-ink">Shortlist faster without losing the human in the loop.</h3>
            </header>
            <RecruitIllustration />
            <ul className="mt-6 space-y-2 text-sm text-ink-soft">
              <li>Send a candidate a one-link video prescreen in two minutes.</li>
              <li>AI scores responses against your rubric. You decide who&apos;s in.</li>
              <li>Email invites, shareable shortlists, all in one panel.</li>
            </ul>
          </article>
        </div>

        <div className="mt-10">
          <Link href="/signup" className="inline-flex items-center gap-2 text-sm font-medium text-accent hover:text-accent-hover">
            See the product tour -&gt;
          </Link>
        </div>
      </div>
    </section>
  )
}

function ChatIllustration() {
  return (
    <div className="mt-6 rounded-2xl bg-bg p-4">
      <div className="space-y-3 text-xs">
        <div className="ml-auto max-w-[80%] rounded-2xl rounded-br-sm bg-accent-soft px-3 py-2 text-ink">
          Can I cut a casual&apos;s hours back without notice?
        </div>
        <div className="mr-auto max-w-[88%] rounded-2xl rounded-bl-sm border border-border bg-bg-elevated px-3 py-2 text-ink-soft">
          If they&apos;re a true casual on an irregular basis, yes - their hours aren&apos;t guaranteed under the NES. If they&apos;ve become regular and systematic you may owe notice.
        </div>
        <div className="mr-auto inline-flex items-center gap-1.5 rounded-full border border-accent bg-bg-elevated px-2.5 py-1 text-[10px] font-medium text-accent">
          Cited: s 123 Fair Work Act 2009
        </div>
      </div>
    </div>
  )
}

function RecruitIllustration() {
  return (
    <div className="mt-6 rounded-2xl bg-bg p-4">
      <div className="space-y-2 text-xs">
        {[
          { name: 'Sarah K.', score: 92 },
          { name: 'Daniel M.', score: 87 },
          { name: 'Priya R.', score: 81 },
        ].map((row) => (
          <div key={row.name} className="flex items-center justify-between rounded-xl border border-border bg-bg-elevated px-3 py-2">
            <span className="font-medium text-ink">{row.name}</span>
            <div className="flex items-center gap-3">
              <div className="h-1.5 w-24 overflow-hidden rounded-full bg-bg-soft">
                <div className="h-full rounded-full bg-accent" style={{ width: `${row.score}%` }} />
              </div>
              <span className="tabular-nums text-ink-soft">{row.score}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
