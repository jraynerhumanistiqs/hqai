import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { LocalGreeting } from '@/components/dashboard/LocalGreeting'
import { HomeTiles, HomeNextActions, type HomeEscalation } from '@/components/dashboard/HomeTiles'

// Home = greeting + Next actions + a tile grid. Rebuilt Oct 2026 on the
// owner's brief: "make the home page tiled, with the chat bot the same size
// as the tiles, remove chat history, clean and easily navigated."
//
// What went:
//   - Recent conversations (the chat history), with its query, its
//     error/empty states and the EmptyState + ChatIcon it used here.
//   - The three top-right HQ People / HQ Recruit / Settings shortcut pills -
//     every one of those destinations is now a tile.
//   - The full-width ChatComposer hero; it is one tile in the grid now.
//
// Kept, per the owner's confirmation: the greeting and Next actions.
//
// This file is now just the data load. The view lives in
// components/dashboard/HomeTiles.tsx.

export default async function DashboardHome() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*, businesses(*)')
    .eq('id', user.id)
    .single()

  const business = profile?.businesses as any
  const firstName = (profile?.full_name || '').split(' ')[0] || 'there'

  // Open escalations - the "outstanding" signal that feeds Next actions. The
  // OR catches conversations created with a business_id as well as ones
  // created against user_id only (business_id null at creation time).
  const escQuery = business?.id
    ? supabase
        .from('conversations')
        .select('id, title, module, created_at, escalation_summary')
        .eq('escalated', true)
        .or(`business_id.eq.${business.id},user_id.eq.${user.id}`)
        .order('created_at', { ascending: false })
        .limit(5)
    : supabase
        .from('conversations')
        .select('id, title, module, created_at, escalation_summary')
        .eq('escalated', true)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5)
  const { data: openEscalations } = await escQuery

  const escalations: HomeEscalation[] = openEscalations ?? []

  return (
    <div className="flex-1 overflow-y-auto bg-bg text-ink">
      <div className="min-h-full max-w-6xl mx-auto px-4 sm:px-8 pt-4 sm:pt-6 pb-8 sm:pb-10 flex flex-col gap-6 sm:gap-7">
        <LocalGreeting firstName={firstName} bizName={business?.name || 'HQ.ai'} />
        <HomeNextActions escalations={escalations} />
        <HomeTiles firstName={firstName} />
      </div>
    </div>
  )
}
