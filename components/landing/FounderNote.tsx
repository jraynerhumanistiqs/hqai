// Founder credibility block - "Why we built this". The landing research
// brief ranks a real founder bio (face + LinkedIn + background) as ~27%
// higher-trust than an anonymous "About" page, especially for
// compliance-anxious SME buyers who want a human behind the AI.
//
// FOUNDER TO-DO before launch:
//   1. Drop headshots into /public/team/ (e.g. /public/team/jimmy-rayner.jpg)
//      and set `photoUrl` on each person below.
//   2. Set each person's `linkedin` URL.
//   Until both are set, the block gracefully shows an initials avatar and
//   hides the LinkedIn link - so it never looks broken.

import Image from 'next/image'

interface Person {
  name: string
  role: string
  linkedin?: string   // e.g. 'https://www.linkedin.com/in/jimmy-rayner'
  photoUrl?: string   // e.g. '/team/jimmy-rayner.jpg'
}

// Seed with the founder. Add more team members to this array and they
// render automatically in the grid.
const TEAM: Person[] = [
  {
    name: 'Jimmy Rayner',
    role: 'Founder, Humanistiqs',
    linkedin: '',   // TODO: founder to add LinkedIn URL
    photoUrl: '',   // TODO: founder to add /team/jimmy-rayner.jpg
  },
]

function initials(name: string): string {
  return name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
}

export default function FounderNote() {
  return (
    <section className="bg-bg-soft py-20 md:py-28" aria-labelledby="founder-heading">
      <div className="mx-auto max-w-6xl px-6 md:px-10">
        <p className="mb-4 text-xs font-medium uppercase tracking-[0.18em] text-ink-muted">
          Why we built this
        </p>
        <h2
          id="founder-heading"
          className="max-w-3xl font-display text-3xl font-bold leading-tight tracking-tight text-ink md:text-[40px]"
        >
          Built by the people who used to answer these calls.
        </h2>

        <div className="mt-8 grid gap-10 md:grid-cols-[3fr_2fr] md:gap-14">
          {/* Left: the story */}
          <div className="max-w-2xl space-y-4 text-[15px] leading-relaxed text-ink-soft md:text-base">
            <p>
              HQ.ai is made by Humanistiqs, an Australian HR and recruitment consultancy. For years we
              answered the same Fair Work questions for small businesses - and watched them either
              overpay for a locked-in retainer or guess their way through a 600-page Award.
            </p>
            <p>
              So we built the tool we wished they had: AI grounded in the actual legislation that cites
              its sources, with a real advisor on hand when the stakes are high. We only do Australian
              employment law - the Fair Work Act, the NES, and the Modern Awards. That is the whole
              point.
            </p>
            <p className="text-ink">
              If the AI ever gets something wrong, you reply to a human - not a ticket queue.
            </p>
          </div>

          {/* Right: the people */}
          <div className="space-y-4">
            {TEAM.map((p) => (
              <div
                key={p.name}
                className="flex items-center gap-4 rounded-3xl border border-border bg-bg-elevated p-5 shadow-card"
              >
                {p.photoUrl ? (
                  <Image
                    src={p.photoUrl}
                    alt={p.name}
                    width={64}
                    height={64}
                    className="h-16 w-16 flex-shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <div
                    aria-hidden
                    className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent"
                  >
                    <span className="font-display text-xl font-bold">{initials(p.name)}</span>
                  </div>
                )}
                <div className="min-w-0">
                  <p className="font-display text-base font-bold tracking-tight text-ink">{p.name}</p>
                  <p className="text-sm text-ink-muted">{p.role}</p>
                  {p.linkedin && (
                    <a
                      href={p.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:underline"
                    >
                      <svg aria-hidden viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current">
                        <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.07 2.07 0 1 1 0-4.14 2.07 2.07 0 0 1 0 4.14zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z" />
                      </svg>
                      Connect on LinkedIn
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
