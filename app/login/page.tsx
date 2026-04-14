'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [debug, setDebug] = useState('')
  const [magicSent, setMagicSent] = useState(false)
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setDebug('')

    try {
      if (mode === 'signup') {
        setDebug('Signing up...')
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: name } }
        })

        if (signUpError) {
          setError(signUpError.message)
          setDebug(`Signup error: ${signUpError.message}`)
          setLoading(false)
          return
        }

        setDebug(`Signup OK. Session: ${signUpData.session ? 'YES' : 'NO'}. User: ${signUpData.user?.id?.slice(0, 8) || 'none'}. Confirmed: ${signUpData.user?.confirmed_at ? 'YES' : 'NO'}`)

        // If email confirmation is required, user won't have a session yet
        if (!signUpData.session) {
          // Check if user exists but is unconfirmed (identities array empty = fake signup response)
          if (signUpData.user && (!signUpData.user.identities || signUpData.user.identities.length === 0)) {
            setError('An account with this email already exists. Try signing in instead.')
          } else {
            setError('Check your email to confirm your account, then sign in.')
          }
          setLoading(false)
          return
        }

        // Session exists — go to onboarding
        setDebug('Redirecting to /onboarding...')
        window.location.href = '/onboarding'
        return

      } else {
        setDebug('Signing in...')
        const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password })

        if (signInError) {
          setError(signInError.message)
          setDebug(`Login error: ${signInError.message} (status: ${signInError.status})`)
          setLoading(false)
          return
        }

        if (!data?.user) {
          setError('Sign in failed — no user returned')
          setDebug('No user in response')
          setLoading(false)
          return
        }

        setDebug(`Login OK. User: ${data.user.id.slice(0, 8)}. Checking profile...`)

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('business_id')
          .eq('id', data.user.id)
          .single()

        setDebug(`Profile: ${profile ? `business_id=${profile.business_id?.slice(0, 8) || 'NULL'}` : 'NOT FOUND'}${profileError ? ` Error: ${profileError.message}` : ''}`)

        // Hard navigation so middleware refreshes session cookies
        if (profile?.business_id) {
          setDebug('Redirecting to /dashboard...')
          window.location.href = '/dashboard'
        } else {
          setDebug('Redirecting to /onboarding...')
          window.location.href = '/onboarding'
        }
        return
      }
    } catch (err: any) {
      setError('Unexpected error: ' + err.message)
      setDebug(`Catch: ${err.message}`)
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

  const inputCls = "w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-black transition-colors"

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 mb-3">
            <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center text-white font-serif text-lg">HQ</div>
            <span className="font-serif text-2xl text-gray-900">HQ.ai</span>
          </div>
          <p className="text-sm text-gray-400">by Humanistiqs</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
          <h1 className="font-serif text-2xl font-normal text-gray-900 mb-1">
            {mode === 'login' ? 'Welcome back' : 'Create your account'}
          </h1>
          <p className="text-sm text-gray-500 mb-6">
            {mode === 'login' ? 'Sign in to your HQ.ai workspace' : 'Start your free trial — no credit card required'}
          </p>

          {magicSent ? (
            <div className="text-center py-4">
              <div className="text-3xl mb-4">📬</div>
              <p className="font-medium text-gray-900 mb-2">Check your email</p>
              <p className="text-sm text-gray-500">We sent a sign-in link to <strong>{email}</strong></p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'signup' && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Full name</label>
                  <input
                    type="text" value={name} onChange={e => setName(e.target.value)}
                    placeholder="James Smith"
                    className={inputCls}
                    required
                  />
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Work email</label>
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="james@yourbusiness.com.au"
                  className={inputCls}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Password</label>
                <input
                  type="password" value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={inputCls}
                  required
                  minLength={8}
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-600">
                  {error}
                </div>
              )}

              {/* Debug output — remove after fixing */}
              {debug && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-xs text-blue-700 font-mono">
                  {debug}
                </div>
              )}

              <button
                type="submit" disabled={loading}
                className="w-full bg-black hover:bg-gray-800 text-white font-medium py-2.5 rounded-lg text-sm transition-colors disabled:opacity-60"
              >
                {loading ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
              </button>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200" />
                </div>
                <div className="relative text-center">
                  <span className="bg-white px-3 text-xs text-gray-400">or</span>
                </div>
              </div>

              <button
                type="button" onClick={handleMagicLink} disabled={loading}
                className="w-full bg-gray-50 hover:bg-gray-100 text-gray-700 font-medium py-2.5 rounded-lg text-sm transition-colors border border-gray-200"
              >
                ✉️ Send magic link instead
              </button>
            </form>
          )}

          <p className="text-center text-xs text-gray-400 mt-6">
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button
              onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); setDebug('') }}
              className="text-black font-medium hover:underline"
            >
              {mode === 'login' ? 'Sign up free' : 'Sign in'}
            </button>
          </p>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          By signing in you agree to Humanistiqs{' '}
          <a href="#" className="underline">Terms of Service</a> and{' '}
          <a href="#" className="underline">Privacy Policy</a>
        </p>
      </div>
    </div>
  )
}
