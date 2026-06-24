'use client'

export function ThankYouScreen() {
  return (
    <div className="max-w-lg mx-auto px-6 py-20 text-center">
      <div className="w-16 h-16 bg-success/10 text-success rounded-full flex items-center justify-center mx-auto mb-6">
        <svg className="w-8 h-8" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
        </svg>
      </div>
      <h1 className="font-display text-2xl font-bold text-ink mb-3">Responses submitted!</h1>
      <p className="text-ink-soft mb-2">
        Thank you for completing your video pre-screen. The Humanistiqs team will be in touch soon.
      </p>
      <p className="text-sm text-ink-muted">No further action is needed - you can close this window.</p>
    </div>
  )
}
