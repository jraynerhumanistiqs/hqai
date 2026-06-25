// Founder / team credibility block - "Why we built this". The landing
// research brief ranks a real team bio (faces + LinkedIn + background)
// as a top trust signal for compliance-anxious SME buyers who want a
// human behind the AI.
//
// Headshots live in /public/team/ (extracted from the Humanistiqs
// capabilities deck). LinkedIn URLs are the directors' public profiles.

import Image from 'next/image'

interface Person {
  name: string
  role: string
  linkedin: string
  photoUrl: string
}

// The four Humanistiqs directors - 80+ years combined HR, recruitment,
// leadership and business-performance experience.
const TEAM: Person[] = [
  {
    name: 'Steve Rayner',
    role: 'Founder & Managing Director',
    linkedin: 'https://www.linkedin.com/in/stevehumanistiqs',
    photoUrl: '/team/steve-rayner.jpg',
  },
  {
    name: 'James Rayner',
    role: 'Director, HR365',
    linkedin: 'https://www.linkedin.com/in/james-rayner-7a958599/',
    photoUrl: '/team/james-rayner.jpg',
  },
  {
    name: 'Bianca Hayes',
    role: 'Director, People & Culture',
    linkedin: 'https://www.linkedin.com/in/bianca-hayes/',
    photoUrl: '/team/bianca-hayes.jpg',
  },
  {
    name: 'Rav Prasad',
    role: 'Director, Recruitment',
    linkedin: 'https://www.linkedin.com/in/rav-prasad-5ab77336/',
    photoUrl: '/team/rav-prasad.jpg',
  },
]

export default function FounderNote() {
  return (
    <section className="bg-bg py-20 md:py-28" aria-labelledby="founder-heading">
      <div className="mx-auto max-w-6xl px-6 md:px-10">
        <p className="mb-4 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.06em] text-clay">
          <span aria-hidden className="h-px w-5 bg-clay" />
          Why we built this
        </p>
        <h2
          id="founder-heading"
          className="max-w-3xl font-display text-3xl font-bold leading-tight tracking-tight text-ink md:text-[40px]"
        >
          Built by the people who used to answer these calls.
        </h2>

        <div className="mt-6 max-w-2xl space-y-4 text-[15px] leading-relaxed text-ink-soft md:text-base">
          <p>
            HQ.ai is made by Humanistiqs, an Australian HR and recruitment consultancy whose directors
            bring more than 80 years of combined experience across HR, leadership development,
            recruitment and business performance.
          </p>
          <p>
            For years we answered the same questions for small businesses - and watched them either
            overpay for a locked-in retainer or guess their way through a 600-page Award. So we built
            the tool we wished they had: AI that handles the everyday people work in minutes, with a
            real advisor on hand when the stakes are high. We only do Australian workplaces - no
            overseas clutter.
          </p>
          <p className="text-ink">
            If the AI ever gets something wrong, you reply to a human - not a ticket queue.
          </p>
        </div>

        {/* The directors - editorial masthead. Larger photos, names in
            Fraunces, roles in mono, a top hairline rule per person. No
            shadowed tiles - the faces are the brand's strongest asset. */}
        <div className="mt-12 grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-4">
          {TEAM.map((p) => (
            <div key={p.name} className="flex flex-col items-start border-t border-border pt-5">
              <Image
                src={p.photoUrl}
                alt={p.name}
                width={144}
                height={144}
                className="h-24 w-24 rounded-full object-cover md:h-28 md:w-28"
                style={{ objectPosition: '50% 22%' }}
              />
              <p className="mt-5 font-display text-xl font-semibold tracking-[-0.01em] text-ink">{p.name}</p>
              <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.06em] text-ink-muted">{p.role}</p>
              <a
                href={p.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${p.name} on LinkedIn`}
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:underline"
              >
                <svg aria-hidden viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current">
                  <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.07 2.07 0 1 1 0-4.14 2.07 2.07 0 0 1 0 4.14zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z" />
                </svg>
                LinkedIn
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
