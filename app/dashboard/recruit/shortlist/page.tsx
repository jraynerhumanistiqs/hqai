import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { RecruitDashboard } from '@/components/recruit/RecruitDashboard'

export const dynamic = 'force-dynamic'

export default async function ShortlistAgentPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // The redundant page banner was removed - RecruitDashboard carries its
  // own "Shortlist Agent" header, and the per-role click-along rail
  // (RoleStepperRail -> RecruitFlowRail) guides the workflow. Letting the
  // tool fill the height gives the content the room back.
  return (
    <div className="h-full min-h-0">
      <RecruitDashboard />
    </div>
  )
}
