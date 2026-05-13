import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

const TILES = [
  {
    href: '/dashboard/recruit/campaign-coach',
    emoji: '✍️',
    title: 'Campaign Coach',
    blurb: 'Turn rough notes into a fully drafted job ad with rubric, awards, and a careers microsite. The starting point for every new role.',
    order: 1,
  },
  {
    href: '/dashboard/recruit/cv-screening',
    emoji: '📄',
    title: 'CV Scoring Agent',
    blurb: 'Drop the CVs in. Get a ranked, blind-by-default scorecard with verbatim evidence per criterion and a recommended next step per candidate.',
    order: 2,
  },
  {
    href: '/dashboard/recruit/shortlist',
    emoji: '🎯',
    title: 'Shortlist Agent',
    blurb: 'Send video pre-screen invites to your shortlisted candidates, review their answers, score against the rubric, and hand off to interview.',
    order: 3,
  },
]

export default async function RecruitLanding() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="flex-1 overflow-y-auto bg-bg">
      <div className="max-w-5xl mx-auto px-6 py-10">
        <header className="mb-8">
          <h1 className="font-display text-h1 font-bold text-charcoal">HQ Recruit</h1>
          <p className="text-sm text-mid mt-2 max-w-2xl">
            Three tools, one funnel. Brief the role, screen the CVs, run the video pre-screen. Each one feeds the next.
          </p>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {TILES.map(t => (
            <Link
              key={t.href}
              href={t.href}
              className="bg-white shadow-card rounded-3xl p-6 hover:shadow-modal transition-shadow flex flex-col"
            >
              <div className="bg-light rounded-2xl w-14 h-14 flex items-center justify-center text-3xl mb-4">
                {t.emoji}
              </div>
              <p className="text-[11px] font-bold text-muted uppercase tracking-wider mb-1">
                Step {t.order}
              </p>
              <h2 className="font-display text-h3 font-bold text-charcoal mb-2">{t.title}</h2>
              <p className="text-sm text-mid leading-relaxed flex-1">{t.blurb}</p>
              <p className="text-sm font-bold text-charcoal mt-4">Open {t.title} →</p>
            </Link>
          ))}
        </div>

        <p className="text-xs text-muted mt-8 leading-relaxed">
          New here? Start with Campaign Coach. The role you brief there flows automatically into the CV Scoring Agent and the Shortlist Agent.
        </p>
      </div>
    </div>
  )
}
