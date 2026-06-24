'use client'
import { useState } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'

// Carry the plan choice from the marketing pages (/signup?plan=...&cycle=
// ...&foundation=1) through signup into onboarding so the user's pick
// isn't lost. Read once, client-side, to avoid a Suspense boundary.
function readPlanQuery(): string {
  if (typeof window === 'undefined') return ''
  const p = new URLSearchParams(window.location.search)
  const keep = ['plan', 'cycle', 'foundation']
  const out = new URLSearchParams()
  for (const k of keep) { const v = p.get(k); if (v) out.set(k, v) }
  const s = out.toString()
  return s ? `?${s}` : ''
}

export default function LoginPage() {
  // Default to signup when the marketing CTAs link here as /signup (which
  // redirects to /login?mode=signup). Falls back to login otherwise.
  const [mode, setMode] = useState<'login' | 'signup'>(() => {
    if (typeof window !== 'undefined') {
      if (new URLSearchParams(window.location.search).get('mode') === 'signup') return 'signup'
    }
    return 'login'
  })
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [magicSent, setMagicSent] = useState(false)
  const [sentToEmail, setSentToEmail] = useState('')
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      if (mode === 'signup') {
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: name } }
        })

        if (signUpError) {
          setError(signUpError.message)
          setLoading(false)
          return
        }

        if (!signUpData.session) {
          if (signUpData.user && (!signUpData.user.identities || signUpData.user.identities.length === 0)) {
            setError('An account with this email already exists. Try signing in instead.')
          } else {
            setError('Check your email to confirm your account, then sign in.')
          }
          setLoading(false)
          return
        }

        window.location.href = `/onboarding${readPlanQuery()}`
        return

      } else {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password })

        if (signInError) {
          setError(signInError.message)
          setLoading(false)
          return
        }

        if (!data?.user) {
          setError('Sign in failed - no user returned')
          setLoading(false)
          return
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('business_id')
          .eq('id', data.user.id)
          .single()

        if (profile?.business_id) {
          window.location.href = '/dashboard'
        } else {
          window.location.href = '/onboarding'
        }
        return
      }
    } catch (err: any) {
      setError('Unexpected error: ' + err.message)
    }

    setLoading(false)
  }

  async function handleMagicLink() {
    if (!email) { setError('Enter your email first'); return }
    setLoading(true)
    const callback = typeof window !== 'undefined'
      ? `${window.location.origin}/auth/callback`
      : `${process.env.NEXT_PUBLIC_BASE_URL || 'https://www.humanistiqs.ai'}/auth/callback`
    const { error: magicError } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: callback },
    })
    if (magicError) {
      setError(magicError.message)
    } else {
      setSentToEmail(email)
      setMagicSent(true)
    }
    setLoading(false)
  }

  // Premium-minimal underline input. Replaces the boxed input pattern
  // per the kit's rule 6 - keeps the field calm on a clean white page
  // and lets the focus state read as a confident black underline.
  const inputCls = "w-full border-b border-ink/30 focus:border-ink focus:ring-2 focus:ring-accent/30 bg-transparent px-1 py-2.5 text-sm text-ink placeholder-ink-muted outline-none transition-colors"

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <Image src="/logo-black.svg" alt="HQ.ai" width={1760} height={570} className="w-[112px] h-auto mx-auto block" />
        </div>

        <div className="bg-white shadow-modal rounded-2xl p-8">
          <h1 className="font-display text-2xl font-bold text-ink uppercase tracking-wider mb-1">
            {mode === 'login' ? 'Welcome back' : 'Create your account'}
          </h1>
          <p className="text-sm text-ink-soft mb-6">
            {mode === 'login' ? 'Sign in to your HQ.ai workspace' : 'Start your free trial - no credit card required'}
          </p>

          {magicSent ? (
            <div className="text-center py-4">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-clay-soft text-clay-ink">
                <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="3" y="5" width="18" height="14" rx="2" />
                  <path d="m3 7 9 6 9-6" />
                </svg>
              </div>
              <p className="font-bold text-ink text-base mb-2">Check your email</p>
              <p className="text-sm text-ink-soft">
                We sent a sign-in link to{' '}
                <strong className="text-ink break-all">
                  {sentToEmail || email || 'your inbox'}
                </strong>
                .
              </p>
              <p className="text-xs text-ink-muted mt-3">
                The link expires in 60 minutes. If it doesn't arrive within a couple of minutes, check your spam folder or try again.
              </p>
              <button
                onClick={() => { setMagicSent(false); setSentToEmail('') }}
                className="text-xs text-ink-soft hover:text-ink underline underline-offset-2 mt-4"
              >
                Use a different email
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'signup' && (
                <div>
                  <label className="block text-xs font-bold text-ink-muted mb-1.5">Full name</label>
                  <input
                    type="text" value={name} onChange={e => setName(e.target.value)}
                    placeholder="James Smith"
                    className={inputCls}
                    required
                  />
                </div>
              )}
              <div>
                <label className="block text-xs font-bold text-ink-muted mb-1.5">Work email</label>
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="james@yourbusiness.com.au"
                  className={inputCls}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-ink-muted mb-1.5">Password</label>
                <input
                  type="password" value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={inputCls}
                  required
                  minLength={8}
                />
              </div>

              {error && (
                <div className="bg-danger/10 border border-danger/30 rounded-lg px-3 py-2 text-sm text-danger">
                  {error}
                </div>
              )}

              <button
                type="submit" disabled={loading}
                className="w-full bg-accent hover:bg-accent-hover text-ink-on-accent font-bold py-2.5 rounded-full text-sm transition-colors disabled:opacity-60"
              >
                {loading ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
              </button>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative text-center">
                  <span className="bg-white px-3 text-xs text-ink-muted">or</span>
                </div>
              </div>

              <button
                type="button" onClick={handleMagicLink} disabled={loading}
                className="w-full bg-white hover:bg-bg-soft text-ink font-bold py-2.5 rounded-full text-sm transition-colors border border-border focus-visible:ring-2 focus-visible:ring-accent/30 inline-flex items-center justify-center gap-2"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="3" y="5" width="18" height="14" rx="2" />
                  <path d="m3 7 9 6 9-6" />
                </svg>
                Send magic link instead
              </button>
            </form>
          )}

          <p className="text-center text-xs text-ink-muted mt-6">
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button
              onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError('') }}
              className="text-ink font-bold hover:underline"
            >
              {mode === 'login' ? 'Sign up free' : 'Sign in'}
            </button>
          </p>
        </div>

        <p className="text-center text-xs text-ink-muted mt-6">
          By signing in you agree to Humanistiqs{' '}
          <a href="/terms" className="underline hover:text-ink">Terms of Service</a> and{' '}
          <a href="/privacy" className="underline hover:text-ink">Privacy Policy</a>
        </p>
      </div>
    </div>
  )
}
