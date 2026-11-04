import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AssistantWorklist from '@/components/assistant/AssistantWorklist'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'AI Assistant - HQ.AI',
}

// The AI Assistant - a worklist, not a chat.
//
// Auth-gated like the rest of the dashboard. The page itself fetches nothing:
// AssistantWorklist calls GET /api/assistant/worklist on mount, which keeps
// the page cheap and lets the list refresh after an action without a
// route-level revalidate. All data access is business-scoped through that
// route, and RLS enforces the same boundary at the database.
//
// Questions belong to the AI Advisor (/dashboard/people/advisor), which is
// RAG-grounded. This surface only works on the user's own register, and
// deliberately makes no model call at all.
export default async function AssistantPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return <AssistantWorklist />
}
