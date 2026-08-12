'use client'

// SET-05 - loading skeleton. The form used to render empty then pop in
// after the Supabase round-trip (a visible content shift on the workspace
// screen). This matches the app's animate-pulse skeleton idiom and the
// real settings layout (nav rail + narrow form column) so nothing jumps
// when the data arrives.

export function SettingsSkeleton() {
  return (
    <div className="lg:grid lg:grid-cols-[180px_minmax(0,1fr)] lg:gap-10" aria-hidden="true">
      <div className="hidden lg:block">
        <div className="sticky top-8 space-y-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="h-7 rounded-lg bg-bg-soft animate-pulse" />
          ))}
        </div>
      </div>
      <div className="w-full max-w-2xl mx-auto lg:mx-0">
        <div className="mb-6 space-y-3">
          <div className="h-3 w-24 rounded bg-bg-soft animate-pulse" />
          <div className="h-9 w-2/3 rounded bg-bg-soft animate-pulse" />
          <div className="h-4 w-3/4 rounded bg-bg-soft animate-pulse" />
        </div>
        {[0, 1, 2].map((i) => (
          <div key={i} className="bg-bg-elevated border border-border rounded-3xl p-6 mb-5">
            <div className="h-5 w-40 rounded bg-bg-soft animate-pulse mb-4" />
            <div className="space-y-3">
              <div className="h-9 w-full rounded bg-bg-soft animate-pulse" />
              <div className="h-9 w-full rounded bg-bg-soft animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
