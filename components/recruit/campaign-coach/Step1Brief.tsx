'use client'
import { useWizard } from './wizard-state'

const EXAMPLE_PROMPTS = [
  'Senior estimator in Penrith — full-time, $95–110k. Construction.',
  'Part-time bookkeeper, Adelaide CBD — 2 days a week, must know Xero.',
  'Casual barista, Newtown — multiple shifts across weekday mornings.',
]

export default function Step1Brief() {
  const { state, dispatch } = useWizard()

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl sm:text-2xl font-bold text-charcoal mb-2">
          Step 1 — Tell me about the role
        </h2>
        <p className="text-sm text-mid leading-relaxed max-w-xl">
          Just rough notes are fine. I'll classify the role, find the right Modern Award, and
          draft an ad you can react to.
        </p>
      </div>

      <div className="bg-white shadow-card rounded-3xl p-5 sm:p-6 relative">
        <textarea
          value={state.briefText}
          onChange={e => dispatch({ type: 'SET_BRIEF_TEXT', text: e.target.value })}
          placeholder="Tell me about the role you're hiring for…"
          rows={8}
          className="w-full bg-transparent text-2xl sm:text-3xl text-charcoal placeholder-muted resize-none outline-none leading-relaxed font-medium tracking-tight"
        />

        <div className="absolute top-4 right-4">
          <button
            disabled
            title="Voice input — coming soon"
            className="w-9 h-9 rounded-full bg-light text-muted flex items-center justify-center cursor-not-allowed"
            aria-label="Voice input — coming soon"
          >
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10 2a3 3 0 00-3 3v5a3 3 0 006 0V5a3 3 0 00-3-3z" />
              <path d="M3.5 9.5a.5.5 0 011 0 5.5 5.5 0 0011 0 .5.5 0 011 0 6.5 6.5 0 01-6 6.48V18a.5.5 0 01-1 0v-2.02a6.5 6.5 0 01-6-6.48z" />
            </svg>
          </button>
        </div>
      </div>

      <div>
        <p className="text-[11px] font-bold text-muted uppercase tracking-wider mb-2">
          Or try an example
        </p>
        <div className="flex flex-wrap gap-2">
          {EXAMPLE_PROMPTS.map((p, i) => (
            <button
              key={i}
              onClick={() => dispatch({ type: 'SET_BRIEF_TEXT', text: p })}
              className="bg-light hover:bg-border text-charcoal text-xs sm:text-sm font-medium px-4 py-2 rounded-full transition-colors text-left max-w-full"
            >
              {p}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
