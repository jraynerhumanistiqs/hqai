import { createClient } from '@/lib/supabase/server'
import ChatInterface from '@/components/chat/ChatInterface'

export default async function PerformancePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles').select('*, businesses(*)').eq('id', user!.id).single()
  const business = profile?.businesses as any
  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="px-4 pt-4 sm:px-6 sm:pt-6">
        <div className="rounded-panel border border-border bg-clay-soft px-5 py-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.06em] text-ink-muted">
            Preview - work in progress
          </p>
          <p className="mt-1.5 text-sm text-ink-soft">
            This will become the <span className="font-medium text-clay-ink">Performance tool</span>. For now, it is general HR chat - ask about reviews, performance plans, or any people question and the advisor will help.
          </p>
        </div>
      </div>
      <div className="flex-1 min-h-0">
        <ChatInterface module="people"
          userName={profile?.full_name || ''}
          bizName={business?.name || 'My Business'}
          advisorName={business?.advisor_name || 'Sarah'}
          industry={business?.industry || ''}
          state={business?.state || ''}
          award={business?.award || ''}
        />
      </div>
    </div>
  )
}