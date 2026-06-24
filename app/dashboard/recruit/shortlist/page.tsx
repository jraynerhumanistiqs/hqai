import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { RecruitDashboard } from '@/components/recruit/RecruitDashboard'

export const dynamic = 'force-dynamic'

export default async function ShortlistAgentPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="px-4 pt-4 sm:px-6 sm:pt-6">
        <div className="rounded-panel border border-border bg-clay-soft px-5 py-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.06em] text-ink-muted">
            HQ Recruit - Step 3
          </p>
          <p className="mt-1.5 text-sm text-ink-soft">
            <span className="font-medium text-clay-ink">Shortlist Agent.</span> Send video pre-screen invites to shortlisted candidates, review their answers, score against the rubric, and hand off to interview.
          </p>
        </div>
      </div>
      <div className="flex-1 min-h-0">
        <RecruitDashboard />
      </div>
    </div>
  )
}
