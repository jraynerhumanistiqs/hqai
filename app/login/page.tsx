'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [magicSent, setMagicSent] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (mode === 'signup') {
      const { error: signUpError } = await supabase.auth.signUp({
        email, password,
        options: { data: { full_name: name } }
      })
      if (signUpError) { setError(signUpError.message); setLoading(false); return }
      router.push('/onboarding')
    } else {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
      if (signInError) { setError(signInError.message); setLoading(false); return }
      router.push('/dashboard')
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

  return (
    <div className="min-h-screen bg-sand flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 mb-3">
            <div className="w-10 h-10 bg-teal rounded-xl flex items-center justify-center text-white font-serif text-lg">HQ</div>
            <span className="font-serif text-2xl text-ink">HQ.ai</span>
          </div>
          <p className="text-sm text-ink3">by Humanistiqs</p>
        </div>

        <div className="bg-cream rounded-2xl border border-sand3 p-8 shadow-sm">
          <h1 className="font-serif text-2xl font-normal text-ink mb-1">
            {mode === 'login' ? 'Welcome back' : 'Create your account'}
          </h1>
          <p className="text-sm text-ink3 mb-6">
            {mode === 'login' ? 'Sign in to your HQ.ai workspace' : 'Start your free trial — no credit card required'}
          </p>

          {magicSent ? (
            <div className="text-center py-4">
              <div className="text-3xl mb-4">📬</div>
              <p className="font-medium text-ink mb-2">Check your email</p>
              <p className="text-sm text-ink3">We sent a sign-in link to <strong>{email}</strong></p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'signup' && (
                <div>
                  <label className="block text-xs font-medium text-ink2 mb-1.5">Full name</label>
                  <input
                    type="text" value={name} onChange={e => setName(e.target.value)}
                    placeholder="James Smith"
                    className="w-full px-3 py-2.5 bg-sand border border-sand3 rounded-lg text-sm text-ink placeholder-stone focus:outline-none focus:border-teal2 transition-colors"
                    required
                  />
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-ink2 mb-1.5">Work email</label>
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="james@yourbusiness.com.au"
                  className="w-full px-3 py-2.5 bg-sand border border-sand3 rounded-lg text-sm text-ink placeholder-stone focus:outline-none focus:border-teal2 transition-colors"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-ink2 mb-1.5">Password</label>
                <input
                  type="password" value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2.5 bg-sand border border-sand3 rounded-lg text-sm text-ink placeholder-stone focus:outline-none focus:border-teal2 transition-colors"
                  required minLength={8}
                />
              </div>

              {error && (
                <div className="bg-coral2 border border-red-200 rounded-lg px-3 py-2 text-sm text-coral">{error}</div>
              )}

              <button
                type="submit" disabled={loading}
                className="w-full bg-teal hover:bg-teal2 text-white font-medium py-2.5 rounded-lg text-sm transition-colors disabled:opacity-60"
              >
                {loading ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
              </button>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-sand3" /></div>
                <div className="relative text-center"><span className="bg-cream px-3 text-xs text-stone">or</span></div>
              </div>

              <button
                type="button" onClick={handleMagicLink} disabled={loading}
                className="w-full bg-sand2 hover:bg-sand3 text-ink2 font-medium py-2.5 rounded-lg text-sm transition-colors border border-sand3"
              >
                ✉️ Send magic link instead
              </button>
            </form>
          )}

          <p className="text-center text-xs text-ink3 mt-6">
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError('') }}
              className="text-teal font-medium hover:underline">
              {mode === 'login' ? 'Sign up free' : 'Sign in'}
            </button>
          </p>
        </div>

        <p className="text-center text-xs text-stone mt-6">
          By signing in you agree to Humanistiqs{' '}
          <a href="#" className="underline">Terms of Service</a> and{' '}
          <a href="#" className="underline">Privacy Policy</a>
        </p>
      </div>
    </div>
  )
}
