import { createClient } from '@/lib/supabase/server'
import ChatInterface from '@/components/chat/ChatInterface'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('*, businesses(*)')
    .eq('id', user!.id)
    .single()

  const business = profile?.businesses as any

  return (
    <ChatInterface
      module="people"
      userName={profile?.full_name || ''}
      bizName={business?.name || 'My Business'}
      advisorName={business?.advisor_name || 'Sarah'}
      industry={business?.industry || ''}
      state={business?.state || ''}
      award={business?.award || ''}
    />
  )
}