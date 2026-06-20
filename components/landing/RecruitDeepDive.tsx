// HQ Recruit deep-dive - 40/60 split with the columns flipped from
// PeopleDeepDive: copy on the left, mock on the right. Gives the page a
// left-right rhythm. Static mock.

export default function RecruitDeepDive() {
  return (
    <section className="bg-bg-soft py-20 md:py-28" aria-labelledby="recruit-deepdive-heading">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 md:grid-cols-[2fr_3fr] md:gap-16 md:px-10">
        {/* LEFT (40%): copy */}
        <div>
          <p className="mb-4 text-xs font-medium uppercase tracking-[0.18em] text-clay">
            HQ Recruit - decide the hiring stuff
          </p>
          <h2
            id="recruit-deepdive-heading"
            className="font-display text-[28px] font-bold leading-tight tracking-tight text-ink md:text-[36px]"
          >
            Three fewer hours per CV. Zero gut-feel hires.
          </h2>

          <div className="mt-6 space-y-4 text-base leading-relaxed text-ink-soft">
            <p>
              Drop in a pile of CVs and score them against the job in minutes. You set what matters - the AI applies it the same way to every person, with the proof pulled straight from the CV.
            </p>
            <p>
              Send one link for a video or phone interview. The AI scores the answers for you. Compare people side by side, and download a tidy CV with the scores attached.
            </p>
            <p>
              Turn a rough brief into a SEEK-ready job ad in three steps. And when bias could creep in, it quietly hides names and photos so everyone gets a fair go.
            </p>
          </div>
        </div>

        {/* RIGHT (60%): product mock - CV scoring scorecard */}
        <div>
          <div className="rounded-3xl border border-border bg-bg-elevated p-6 shadow-float md:p-8">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-ink-muted">
                  Candidate scorecard
                </p>
                <p className="mt-1 font-display text-xl font-bold tracking-tight text-ink">Daniel M.</p>
              </div>
              <div className="text-right">
                <p className="font-display text-3xl font-bold tracking-tight text-ink">
                  4.2<span className="text-base font-normal text-ink-muted"> / 5</span>
                </p>
                <span className="mt-1 inline-flex rounded-full border border-accent bg-accent-soft px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-accent">
                  Strong yes
                </span>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              {[
                {
                  label: 'Relevant experience',
                  score: 86,
                  evidence: '"7 years running a 12-person front-of-house team at a Sydney venue group."',
                },
                {
                  label: 'Communication',
                  score: 80,
                  evidence: null,
                },
                {
                  label: 'Role fit',
                  score: 74,
                  evidence: null,
                },
              ].map((row) => (
                <div key={row.label}>
                  <div className="flex items-center justify-between text-xs text-ink-soft">
                    <span className="font-medium text-ink">{row.label}</span>
                    <span className="tabular-nums">{row.score}</span>
                  </div>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-bg-soft">
                    <div
                      className="h-full rounded-full bg-accent"
                      style={{ width: `${row.score}%` }}
                    />
                  </div>
                  {row.evidence && (
                    <p className="mt-2 text-xs italic leading-relaxed text-ink-muted">
                      {row.evidence}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
