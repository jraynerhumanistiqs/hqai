import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

// HQ People landing / hub. Mirrors the HQ Recruit launcher
// (app/dashboard/recruit/page.tsx): an auth-gated hero + a grid of tool
// tiles, so clicking "HQ People" lands on a hub that presents the module's
// tools rather than dropping straight into one of them.
//
// Unlike Recruit (a sequential funnel with numbered steps), HQ People is a
// set of PARALLEL tools, so there are no "Step N" labels - just a short
// descriptor per tile. The AI Advisor is the only tool in the pillar today;
// the hub stays in place so the ?prompt= deep-link and the pillar nav keep
// one stable entry point as more tools land.
//
// The ?prompt= passthrough is preserved: seed prompts from elsewhere in the
// product still deep-link past the hub straight into the AI Advisor chat, so
// those flows keep working exactly as they did when this route was a plain
// redirect.
const TILES = [
  {
    href: '/dashboard/people/advisor',
    emoji: '💬',
    kicker: 'Chat',
    title: 'AI Advisor',
    blurb: 'Ask any HR or people question - performance, leave, awards, tricky conversations - and get clear, practical steps. It flags the hard cases for your human advisor.',
  },
  {
    href: '/dashboard/people/team',
    emoji: '👥',
    kicker: 'Records',
    title: 'Your team',
    blurb: 'Keep the people you employ in one place, with a record of what has been done for each of them. It is what lets HQ keep track of the dates that matter - and what you show if you are ever asked.',
  },
]

export default async function PeopleLanding({
  searchParams,
}: {
  searchParams: Promise<{ prompt?: string }>
}) {
  const params = await searchParams
  // Preserve the ?prompt= deep-link into the AI Advisor chat (seed prompts
  // from elsewhere in the product bypass the hub).
  if (params.prompt) {
    redirect(`/dashboard/people/advisor?prompt=${encodeURIComponent(params.prompt)}`)
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="flex-1 overflow-y-auto bg-bg">
      <div className="max-w-6xl mx-auto px-4 sm:px-8 py-8">
        <p className="text-xs font-bold uppercase tracking-wider text-ink-muted mb-2">
          HQ People
        </p>
        <h1 className="font-display text-h1 font-bold text-ink mb-2 tracking-tight">
          Your HR, off your plate.
        </h1>
        <p className="text-body text-ink-soft mb-6 max-w-2xl">
          Ask your AI Advisor anything - performance, leave, awards, tricky
          conversations. Your human advisor steps in when it gets complex.
        </p>

        <div className="grid grid-cols-1 gap-4 sm:max-w-md">
          {TILES.map(t => (
            <Link
              key={t.href}
              href={t.href}
              className="bg-bg-elevated border border-border shadow-card rounded-3xl p-6 hover:shadow-modal hover:border-ink/30 transition-all flex flex-col focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
            >
              <div className="bg-bg-soft rounded-2xl w-14 h-14 flex items-center justify-center text-3xl mb-4">
                {t.emoji}
              </div>
              <p className="text-[11px] font-bold text-ink-muted uppercase tracking-wider mb-1">
                {t.kicker}
              </p>
              <h2 className="font-display text-h3 font-bold text-ink mb-2">{t.title}</h2>
              <p className="text-sm text-ink-soft leading-relaxed flex-1">{t.blurb}</p>
              <p className="text-sm font-bold text-ink mt-4">Open {t.title} →</p>
            </Link>
          ))}
        </div>

        <p className="text-xs text-ink-muted mt-8 leading-relaxed">
          New here? Just describe the situation in your own words - the AI
          Advisor will ask for whatever else it needs.
        </p>
      </div>
    </div>
  )
}
