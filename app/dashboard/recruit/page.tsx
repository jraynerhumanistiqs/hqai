import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import RecruitTabs from './RecruitTabs'

export default async function RecruitPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*, businesses(*)')
    .eq('id', user.id)
    .single()

  const business = profile?.businesses as any
  const params = await searchParams

  return (
    <RecruitTabs
      initialTab={params.tab === 'prescreen' ? 'prescreen' : 'advisor'}
      userName={profile?.full_name || ''}
      bizName={business?.name || 'My Business'}
      advisorName={business?.advisor_name || 'Sarah'}
      industry={business?.industry || ''}
      state={business?.state || ''}
      award={business?.award || ''}
    />
  )
}
