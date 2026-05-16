'use client'
import { useEffect, useRef, useState } from 'react'
import { useWizard } from './wizard-state'

interface RecentCampaign {
  id: string
  title: string
  brief: string
  created_at: string
}

interface SuggestionsResponse {
  industry: string | null
  industry_source: 'profile' | 'inferred' | 'fallback'
  examples: string[]
  recent_campaigns: RecentCampaign[]
}

// PLACEHOLDER_EXAMPLES (the old "Common roles in [industry]" chips)
// was removed - the suggestion surface is now exclusively the user's
// own recent campaigns rather than a generic AU role library.

export default function Step1Brief() {
  const { state, dispatch, business } = useWizard()
  const [suggestions, setSuggestions] = useState<SuggestionsResponse | null>(null)
  const [loadingSuggestions, setLoadingSuggestions] = useState(true)

  // Fetch industry-tuned examples + recent campaigns from the backend.
  // Backend reads business.industry from the profile, falls back to inferring
  // the industry from the business name, then asks Claude for 3 contextual
  // example briefs. Recent campaigns come from the campaigns table.
  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const res = await fetch('/api/campaign-coach/suggestions', { cache: 'no-store' })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = (await res.json()) as SuggestionsResponse
        if (!cancelled) setSuggestions(data)
      } catch {
        if (!cancelled) {
          setSuggestions({
            industry: null,
            industry_source: 'fallback',
            examples: [],
            recent_campaigns: [],
          })
        }
      } finally {
        if (!cancelled) setLoadingSuggestions(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  // Push initial coaching messages on first Step 1 render so the right-side
  // panel reads like a real conversation. Tips are AU-tuned best-practice
  // and reference industrial award + protected-attribute compliance.
  const seededRef = useRef(false)
  useEffect(() => {
    if (seededRef.current) return
    if (state.coach_messages.length > 0) return
    seededRef.current = true
    const tips = [
      "Hi - I'll guide you through writing a great ad and getting it live. Tell me about the role on the left and I'll take it from there.",
      "Quick coaching tip while you type: the best-performing AU ads lead with the specific outcome someone will own in their first 90 days, not a generic 'about us' pitch.",
      "Compliance heads-up: I'll auto-classify the Modern Award and check the rate against the Fair Work Pay Calculator on the next step. No need to know it now.",
      "Plain English wins. Skip the rockstar/ninja/guru words - they discourage women and older candidates from applying and they're not specific enough to filter for skill.",
    ]
    tips.forEach((text, i) => {
      const stagger = i === 0 ? 0 : 200 + i * 800
      setTimeout(() => {
        dispatch({ type: 'PUSH_COACH_MESSAGE', msg: { role: 'coach', text, ts: Date.now() } })
      }, stagger)
    })
  }, [dispatch, state.coach_messages.length])

  const recentCampaigns = suggestions?.recent_campaigns ?? []

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-xl sm:text-2xl font-bold text-charcoal mb-1.5">
          Step 1 - Tell me about the role
        </h2>
        <p className="text-sm text-mid leading-relaxed max-w-xl">
          Just rough notes are fine. I'll classify the role, find the right Modern Award, and
          draft an ad you can react to.
        </p>
      </div>

      <div className="bg-bg-elevated shadow-card rounded-2xl p-4 sm:p-5 relative">
        <textarea
          value={state.briefText}
          onChange={e => dispatch({ type: 'SET_BRIEF_TEXT', text: e.target.value })}
          placeholder={"Try something like: 'Site Manager in Brisbane, full-time, $130k + super, residential builds.'\n\nA few rough notes on the role, location, contract type, salary, and the 2-3 things you really need them to be good at is plenty - I'll take it from there."}
          rows={5}
          className="w-full bg-transparent text-base sm:text-lg text-charcoal placeholder-muted resize-none outline-none leading-relaxed pr-12"
        />

        <div className="absolute bottom-3 right-3">
          <button
            disabled
            title="Voice input - coming soon"
            className="w-9 h-9 rounded-full bg-black text-white flex items-center justify-center cursor-not-allowed shadow-card"
            aria-label="Voice input - coming soon"
          >
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10 2a3 3 0 00-3 3v5a3 3 0 006 0V5a3 3 0 00-3-3z" />
              <path d="M3.5 9.5a.5.5 0 011 0 5.5 5.5 0 0011 0 .5.5 0 011 0 6.5 6.5 0 01-6 6.48V18a.5.5 0 01-1 0v-2.02a6.5 6.5 0 01-6-6.48z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Recent campaigns - up to 5 of the user's most recent role
          briefs. Replaces the old "Common roles in [industry]" chip row.
          When there are zero campaigns yet, show a single helper
          card explaining what will populate here later, rather than a
          gap in the page. */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-2">
          <p className="text-[11px] font-bold text-muted uppercase tracking-wider">
            {loadingSuggestions ? 'Loading your recent campaigns...' : 'Reuse a recent campaign'}
          </p>
          {!loadingSuggestions && recentCampaigns.length > 0 && (
            <p className="text-[10px] text-muted">Click to pre-fill - edit anything you want</p>
          )}
        </div>

        {!loadingSuggestions && recentCampaigns.length === 0 ? (
          <div className="bg-bg-elevated shadow-card rounded-2xl px-5 py-5 border border-dashed border-border">
            <p className="text-sm font-bold text-charcoal mb-1">No recent campaigns yet</p>
            <p className="text-xs text-mid leading-relaxed">
              Once you publish your first role through Campaign Coach it will appear here. From then on you can pre-fill new briefs from any of your five most recent campaigns and edit from there.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {(loadingSuggestions ? Array.from({ length: 3 }) : recentCampaigns).slice(0, 5).map((c, i) => {
              if (loadingSuggestions || !c) {
                return (
                  <div key={`skeleton-${i}`} className="bg-bg-elevated shadow-card rounded-2xl px-4 py-3 animate-pulse">
                    <div className="h-3 w-32 bg-light rounded-full mb-2" />
                    <div className="h-2 w-full bg-light rounded-full mb-1.5" />
                    <div className="h-2 w-3/4 bg-light rounded-full" />
                  </div>
                )
              }
              const campaign = c as RecentCampaign
              return (
                <button
                  key={campaign.id}
                  onClick={() => dispatch({ type: 'SET_BRIEF_TEXT', text: campaign.brief })}
                  className="bg-bg-elevated shadow-card hover:shadow-modal hover:-translate-y-0.5 rounded-2xl px-4 py-3 text-left transition-all border border-transparent hover:border-charcoal/15 group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-bold text-charcoal leading-tight flex-1 truncate">{campaign.title}</p>
                    <span className="text-[10px] text-muted whitespace-nowrap pt-0.5">
                      {new Date(campaign.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                  <p className="text-xs text-mid leading-relaxed line-clamp-2 mt-1">{campaign.brief}</p>
                  <p className="text-[11px] font-bold text-charcoal mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    Use as starting point &rarr;
                  </p>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
