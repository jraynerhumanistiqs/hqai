import Link from 'next/link'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import InviteAccept from '@/components/people/InviteAccept'

export const dynamic = 'force-dynamic'

// Kept out of render so the React-compiler lint does not flag Date.now().
function isExpired(iso: string): boolean {
  return new Date(iso).getTime() < Date.now()
}

// Public invite page. Shows who invited you and to what, then hands off to
// the accept control. Reads the invite with service-role because the visitor
// is not (yet) in the business; only the business name is exposed.

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const valid = /^[a-f0-9]{48}$/.test(token)

  const { data: invite } = valid
    ? await supabaseAdmin
        .from('business_invites')
        .select('email, role, expires_at, accepted_at, businesses(name), profiles!business_invites_invited_by_fkey(full_name)')
        .eq('token', token)
        .maybeSingle()
    : { data: null }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const biz = (invite as { businesses?: { name?: string } | null } | null)?.businesses?.name ?? 'a business'
  const inviter = (invite as { profiles?: { full_name?: string } | null } | null)?.profiles?.full_name ?? 'A colleague'
  const expired = invite ? isExpired(invite.expires_at) : false
  const used = Boolean(invite?.accepted_at)

  return (
    <main className="min-h-screen bg-bg text-ink flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-3xl border border-border bg-bg-elevated p-6 sm:p-8 shadow-card">
        <p className="font-mono text-[11px] uppercase tracking-wider text-ink-muted">HQ.ai</p>

        {!invite ? (
          <>
            <h1 className="font-display text-2xl mt-2">This invite is not valid</h1>
            <p className="mt-2 text-sm text-ink-soft">The link may be incomplete. Ask the person who invited you to send it again.</p>
          </>
        ) : used ? (
          <>
            <h1 className="font-display text-2xl mt-2">This invite has been used</h1>
            <p className="mt-2 text-sm text-ink-soft">If that was you, just sign in.</p>
            <Link href="/login" className="mt-4 inline-block rounded-full bg-accent px-5 py-2.5 text-sm font-bold text-ink-on-accent hover:bg-accent-hover">Sign in</Link>
          </>
        ) : expired ? (
          <>
            <h1 className="font-display text-2xl mt-2">This invite has expired</h1>
            <p className="mt-2 text-sm text-ink-soft">Invites last 7 days. Ask {inviter} to send a new one.</p>
          </>
        ) : (
          <>
            <h1 className="font-display text-2xl mt-2">You are invited to {biz}</h1>
            <p className="mt-2 text-sm text-ink-soft">
              {inviter} has invited you to {invite.role === 'admin' ? 'help manage people records' : 'join the team'} on HQ.ai.
              The invite was sent to <span className="text-ink">{invite.email}</span>.
            </p>
            <InviteAccept token={token} inviteEmail={invite.email} signedInAs={user?.email ?? null} />
          </>
        )}
      </div>
    </main>
  )
}
