'use client'
import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

// Magic link / OAuth callback. Handles three flows in one place:
//   1. Implicit flow - tokens in the URL fragment (#access_token=&refresh_token=)
//   2. PKCE / OAuth - ?code= query param
//   3. Email OTP - ?token_hash=&type= query params
// The browser is the only thing that can read the hash fragment, so we run
// this client-side rather than via a route handler.

function CallbackInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [detail, setDetail] = useState<string>('')
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    const next = searchParams.get('next') ?? '/dashboard'

    async function run() {
      try {
        // 1. Hash fragment first
        const hash = typeof window !== 'undefined' ? window.location.hash?.slice(1) : ''
        if (hash) {
          const params = new URLSearchParams(hash)
          const errParam = params.get('error_description')
          if (errParam) throw new Error(errParam)
          const accessToken = params.get('access_token')
          const refreshToken = params.get('refresh_token')
          if (accessToken && refreshToken) {
            const { error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            })
            if (error) throw new Error(error.message)
            window.history.replaceState(null, '', window.location.pathname + window.location.search)
            router.replace(next)
            return
          }
        }

        // 2. PKCE / OAuth code
        const code = searchParams.get('code')
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code)
          if (error) throw new Error(error.message)
          router.replace(next)
          return
        }

        // 3. Email OTP token_hash + type
        const tokenHash = searchParams.get('token_hash')
        const type = searchParams.get('type')
        if (tokenHash) {
          const otpType = (type as any) || 'email'
          const { error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: otpType,
          })
          if (error) throw new Error(error.message)
          router.replace(next)
          return
        }

        // 4. Already signed in (link clicked twice / refreshed page)
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          router.replace(next)
          return
        }

        throw new Error('No verifiable token in URL')
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        setDetail(msg)
        setFailed(true)
      }
    }

    run()
  }, [router, searchParams])

  if (!failed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <div className="text-sm text-mid">Signing you in...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg p-6">
      <div className="bg-white shadow-card rounded-2xl p-6 max-w-md text-center">
        <p className="font-bold text-charcoal text-base mb-2">Sign-in link didn't work</p>
        <p className="text-sm text-mid mb-4">
          Most common reason: the link expired or was already used. Get a fresh one.
        </p>
        {detail && <p className="text-xs text-muted mb-4 break-all">Details: {detail}</p>}
        <a
          href="/login"
          className="inline-block bg-black text-white text-sm font-bold rounded-full px-4 py-2 hover:bg-charcoal"
        >
          Back to sign in
        </a>
      </div>
    </div>
  )
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-bg"><div className="text-sm text-mid">Signing you in...</div></div>}>
      <CallbackInner />
    </Suspense>
  )
}
