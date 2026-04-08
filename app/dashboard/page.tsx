import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ChatInterface from '@/components/chat/ChatInterface'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*, businesses(*)')
    .eq('id', session.user.id)
    .single()

  const business = profile?.businesses as any

  return (
    <ChatInterface
      module="people"
      userName={profile?.full_name || ''}
      bizName={business?.name || 'My Business'}
      advisorName={business?.advisor_name || 'Hugo'}
      industry={business?.industry || ''}
      state={business?.state || ''}
      award={business?.award || ''}
    />
  )
}