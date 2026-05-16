// AI Advisor - the chat-first HR advisory surface.
//
// Lives under HQ People alongside AI Administrator. This page hosts the
// existing ChatInterface (RAG-grounded, citation-emitting, escalation-
// aware). The split into Advisor + Administrator is described in the
// implementation brief Part B0 and the teardown report section 0.

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ChatInterface from '@/components/chat/ChatInterface'

export default async function AdvisorPage({
  searchParams,
}: {
  searchParams: Promise<{ prompt?: string }>
}) {
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
    <ChatInterface
      module="people"
      userName={profile?.full_name || ''}
      bizName={business?.name || 'My Business'}
      advisorName={business?.advisor_name || 'Hugo'}
      industry={business?.industry || ''}
      state={business?.state || ''}
      award={business?.award || ''}
      initialPrompt={params.prompt}
    />
  )
}
