'use client'
import { useState } from 'react'

// Bump this version string whenever the consent label text below changes.
// We persist the version on the candidate's response row so we have an
// evidentiary record of which consent text they accepted.
export const CONSENT_VERSION = '2026-05-15.v2'
export const CONSENT_TEXT = 'I consent to my video responses being recorded, transcribed (by Deepgram), scored by AI against the hiring rubric (by Anthropic), and securely stored (by Cloudflare Stream and Supabase). I understand that my browser will also compute three aggregate visual signals from my video (whether my face is in frame, whether my head is roughly facing the camera, and approximate lighting) which are shown to the reviewer as supporting context only - my video frames and any underlying facial landmarks never leave my device. These signals are NOT fed into the AI scoring. I can withdraw consent and request deletion at any time by emailing privacy@humanistiqs.com.au.'

interface Props {
  roleTitle: string
  company: string
  timeLimitSeconds: number
  questionCount: number
  onSubmit: (name: string, email: string, consent: boolean, meta: { text: string; version: string }) => void
}

export function CandidateGate({ roleTitle, company, timeLimitSeconds, questionCount, onSubmit }: Props) {
  const [name, setName]       = useState('')
  const [email, setEmail]     = useState('')
  const [consent, setConsent] = useState(false)
  const [errors, setErrors]   = useState<Record<string, string>>({})

  function validate() {
    const e: Record<string, string> = {}
    if (!name.trim())  e.name    = 'Please enter your full name'
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) e.email = 'Please enter a valid email address'
    if (!consent)      e.consent = 'You must consent to continue'
    return e
  }

  function handleSubmit() {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    onSubmit(name.trim(), email.trim(), consent, { text: CONSENT_TEXT, version: CONSENT_VERSION })
  }

  const mins = Math.floor(timeLimitSeconds / 60)
  const secs = timeLimitSeconds % 60
  const timeLabel = mins > 0
    ? `${mins} minute${mins > 1 ? 's' : ''}${secs > 0 ? ` ${secs}s` : ''}`
    : `${timeLimitSeconds} seconds`

  return (
    <div className="max-w-lg mx-auto px-6 py-10">
      <div className="mb-8 text-center">
        <p className="text-sm font-semibold text-black uppercase tracking-widest mb-2">You&apos;re applying for</p>
        <h1 className="text-3xl font-bold text-gray-900 mb-1">{roleTitle}</h1>
        <p className="text-gray-500 text-lg">{company}</p>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-8 text-sm text-amber-800">
        You&apos;ll answer <strong>{questionCount} question{questionCount !== 1 ? 's' : ''}</strong> on video.{' '}
        Each response has a <strong>{timeLabel}</strong>{' '}time limit.{' '}
        You can re-record before moving on. When you&apos;re ready, fill in your details and press Start.
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Full Name</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Your full name"
            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black/20 focus:border-black"
          />
          {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Email Address</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="your@email.com"
            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black/20 focus:border-black"
          />
          {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
        </div>

        <div className="flex items-start gap-3 pt-2">
          <input
            type="checkbox"
            id="consent"
            checked={consent}
            onChange={e => setConsent(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-gray-300 accent-black"
          />
          <label htmlFor="consent" className="text-sm text-gray-600 leading-snug cursor-pointer">
            I consent to my video responses being recorded, transcribed (by Deepgram), scored by AI against
            the hiring rubric (by Anthropic), and securely stored (by Cloudflare Stream and Supabase).
            My browser will also compute three aggregate visual signals (in-frame %, head roughly
            facing the camera %, approximate lighting) which the reviewer sees as supporting context
            only - my video frames never leave my device for that step, and these signals are <strong className="font-semibold text-gray-800">not</strong> fed
            into the AI scoring. Recordings are retained for up to 80 days after the role closes.
            I can withdraw consent and request deletion at any time by emailing{' '}
            <a href="mailto:privacy@humanistiqs.com.au" className="underline font-semibold text-gray-800">privacy@humanistiqs.com.au</a>.
            Full detail in our{' '}
            <a href="/privacy" target="_blank" rel="noreferrer" className="underline font-semibold text-gray-800">privacy policy</a>.
          </label>
        </div>
        {errors.consent && <p className="text-xs text-red-600">{errors.consent}</p>}

        <button
          onClick={handleSubmit}
          className="w-full mt-2 bg-black hover:bg-[#1a1a1a] text-white font-bold py-3 rounded-full transition-colors text-sm"
        >
          Start Pre-Screen →
        </button>
      </div>
    </div>
  )
}
