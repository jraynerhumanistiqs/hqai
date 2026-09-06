'use client'

// Accept control on the invite page.
//   - Signed in as the invited address -> accept, then into the dashboard.
//   - Signed in as someone else -> say so; do not accept.
//   - Not signed in -> to login in signup mode, carrying the invite token, so
//     login can send them straight back here after auth (not to onboarding).

import { useState } from 'react'

interface Props {
  token: string
  inviteEmail: string
  signedInAs: string | null
}

export default function InviteAccept({ token, inviteEmail, signedInAs }: Props) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loginHref = `/login?mode=signup&invite=${encodeURIComponent(token)}&email=${encodeURIComponent(inviteEmail)}`

  if (!signedInAs) {
    return (
      <div className="mt-5 space-y-2">
        <a href={loginHref} className="inline-block rounded-full bg-accent px-5 py-2.5 text-sm font-bold text-ink-on-accent hover:bg-accent-hover">
          Create your login and accept
        </a>
        <p className="text-xs text-ink-muted">
          Already have an HQ.ai login? <a href={`/login?invite=${encodeURIComponent(token)}`} className="underline underline-offset-2 text-ink-soft hover:text-ink">Sign in instead</a>
        </p>
      </div>
    )
  }

  if (signedInAs.toLowerCase() !== inviteEmail.toLowerCase()) {
    return (
      <div className="mt-5 rounded-2xl border border-border p-3">
        <p className="text-sm text-ink">You are signed in as {signedInAs}.</p>
        <p className="mt-1 text-xs text-ink-soft">This invite is for {inviteEmail}. Sign out and sign in with that address to accept it.</p>
      </div>
    )
  }

  async function accept() {
    setBusy(true); setError(null)
    try {
      const res = await fetch('/api/team/invites/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Could not accept the invite')
      window.location.href = '/dashboard'
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not accept the invite')
      setBusy(false)
    }
  }

  return (
    <div className="mt-5 space-y-2">
      <button
        onClick={() => void accept()}
        disabled={busy}
        className="rounded-full bg-accent px-5 py-2.5 text-sm font-bold text-ink-on-accent hover:bg-accent-hover disabled:opacity-40"
      >
        {busy ? 'Joining...' : 'Accept and join'}
      </button>
      {error && <p className="text-xs text-ink-soft">{error}</p>}
    </div>
  )
}
