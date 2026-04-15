import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/sidebar/Sidebar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*, businesses(*)')
    .eq('id', user.id)
    .single()

  if (!profile?.business_id) {
    redirect('/onboarding')
  }

  const business = profile.businesses as any

  return (
    <div className="flex h-screen overflow-hidden bg-[#000000]">
      <Sidebar
        userName={profile.full_name || ''}
        bizName={business?.name || 'My Business'}
        advisorName={business?.advisor_name || 'Hugo'}
        plan={business?.plan || 'free'}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        {children}
      </div>
    </div>
  )
}