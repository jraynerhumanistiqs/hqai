import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { RecruitDashboard } from '@/components/recruit/RecruitDashboard'

export const dynamic = 'force-dynamic'

export default async function ShortlistAgentPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return <RecruitDashboard />
}
