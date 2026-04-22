'use client'
import { useState } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [magicSent, setMagicSent] = useState(false)
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

        window.location.href = '/onboarding'
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
    const { error: magicError } = await supabase.auth.signInWithOtp({ email })
    if (magicError) { setError(magicError.message) } else { setMagicSent(true) }
    setLoading(false)
  }

  const inputCls = "w-full px-3 py-2.5 bg-white border border-border rounded-lg text-sm text-charcoal placeholder-muted focus:outline-none focus:border-black transition-colors"

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-block mb-3">
            <Image src="/logo-black.svg" alt="HQ.ai" width={150} height={150} className="w-[140px] h-auto" />
          </div>
        </div>

        <div className="bg-white shadow-modal rounded-2xl p-8">
          <h1 className="font-display text-2xl font-bold text-charcoal uppercase tracking-wider mb-1">
            {mode === 'login' ? 'Welcome back' : 'Create your account'}
          </h1>
          <p className="text-sm text-mid mb-6">
            {mode === 'login' ? 'Sign in to your HQ.ai workspace' : 'Start your free trial - no credit card required'}
          </p>

          {magicSent ? (
            <div className="text-center py-4">
              <div className="text-3xl mb-4">📬</div>
              <p className="font-medium text-white mb-2">Check your email</p>
              <p className="text-sm text-gray-400">We sent a sign-in link to <strong className="text-white">{email}</strong></p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'signup' && (
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1.5">Full name</label>
                  <input
                    type="text" value={name} onChange={e => setName(e.target.value)}
                    placeholder="James Smith"
                    className={inputCls}
                    required
                  />
                </div>
              )}
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1.5">Work email</label>
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="james@yourbusiness.com.au"
                  className={inputCls}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1.5">Password</label>
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
                className="w-full bg-black hover:bg-[#1a1a1a] text-white font-bold py-2.5 rounded-full text-sm transition-colors disabled:opacity-60"
              >
                {loading ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
              </button>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative text-center">
                  <span className="bg-white px-3 text-xs text-muted">or</span>
                </div>
              </div>

              <button
                type="button" onClick={handleMagicLink} disabled={loading}
                className="w-full bg-white hover:bg-light text-charcoal font-bold py-2.5 rounded-full text-sm transition-colors border border-border"
              >
                ✉️ Send magic link instead
              </button>
            </form>
          )}

          <p className="text-center text-xs text-muted mt-6">
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button
              onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError('') }}
              className="text-black font-bold hover:underline"
            >
              {mode === 'login' ? 'Sign up free' : 'Sign in'}
            </button>
          </p>
        </div>

        <p className="text-center text-xs text-muted mt-6">
          By signing in you agree to Humanistiqs{' '}
          <a href="#" className="underline hover:text-gray-400">Terms of Service</a> and{' '}
          <a href="#" className="underline hover:text-gray-400">Privacy Policy</a>
        </p>
      </div>
    </div>
  )
}
