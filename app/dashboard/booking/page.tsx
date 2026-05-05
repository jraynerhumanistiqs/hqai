'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function BookingPage() {
  const [calendlyUrl, setCalendlyUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profile } = await supabase
        .from('profiles').select('businesses(calendly_link)')
        .eq('id', user.id).single()
      const biz = profile?.businesses as any
      setCalendlyUrl(biz?.calendly_link || '')
      setLoading(false)
    }
    load()
  }, [])

  useEffect(() => {
    if (!calendlyUrl) return
    // Load Calendly widget script
    const existing = document.querySelector('script[src*="calendly.com"]')
    if (!existing) {
      const script = document.createElement('script')
      script.src = 'https://assets.calendly.com/assets/external/widget.js'
      script.async = true
      document.head.appendChild(script)
    }
  }, [calendlyUrl])

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-pulse text-sm text-mid">Loading...</div>
      </div>
    )
  }

  if (!calendlyUrl) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#000000]">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-accent/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-accent" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd"/>
            </svg>
          </div>
          <h2 className="font-display text-h3 font-bold text-white uppercase tracking-wider mb-2">Book a call with your Humanistiqs advisor</h2>
          <p className="text-sm text-gray-400 mb-6">
            No Calendly link has been set up yet. Add your advisor&apos;s Calendly link in Settings to enable booking.
          </p>
          <a href="/dashboard/settings" className="inline-block px-5 py-2.5 bg-accent text-white rounded-lg text-sm font-bold hover:bg-accent2 transition-colors">
            Go to Settings
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto bg-[#000000]">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="font-display text-h3 font-bold text-white uppercase tracking-wider mb-1">Book a call with your Humanistiqs advisor</h1>
          <p className="text-sm text-gray-400">
            Schedule a 1-on-1 session with your dedicated Humanistiqs advisor.
            Same advisor every time - no repeating yourself.
          </p>
        </div>

        <div className="bg-[#111111] rounded-2xl border border-[#222222] overflow-hidden">
          <div
            className="calendly-inline-widget"
            data-url={calendlyUrl}
            style={{ minWidth: '320px', height: '700px' }}
          />
        </div>
      </div>
    </div>
  )
}
