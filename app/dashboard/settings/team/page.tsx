import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import TeamMembers from '@/components/people/TeamMembers'

export const dynamic = 'force-dynamic'

// Team access - owner only. Admins and members see a plain explanation
// rather than a 403, because they may land here from a link.

export default async function TeamSettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: me } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()

  if (me?.role !== 'owner') {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
        <p className="font-mono text-[11px] uppercase tracking-wider text-ink-muted">Settings</p>
        <h1 className="font-display text-2xl text-ink mt-1">Team access</h1>
        <p className="mt-2 text-sm text-ink-soft">Only the account owner can invite people or change who has access.</p>
        <Link href="/dashboard/settings" className="mt-4 inline-block text-sm font-bold text-ink underline underline-offset-2">Back to settings</Link>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <TeamMembers currentUserId={user.id} />
    </div>
  )
}
