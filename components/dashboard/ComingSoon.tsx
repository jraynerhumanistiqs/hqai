'use client'

interface Props {
  title: string                  // e.g. "Workplace Compliance Assessment"
  blurb?: string                 // Optional override for the body copy
}

export default function ComingSoon({ title, blurb }: Props) {
  const body = blurb ?? `We're putting the finishing touches on this. The team is in the final stages of build and testing - it'll land in the next release. Thanks for your patience.`

  return (
    <div className="flex-1 min-h-screen bg-bg flex items-center justify-center px-6 py-16">
      <div className="bg-bg-elevated rounded-2xl shadow-card max-w-xl w-full px-8 py-10 text-center">
        <p className="text-[10px] font-bold text-muted uppercase tracking-widest mb-3">Coming soon</p>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-charcoal uppercase tracking-wider mb-4">{title}</h1>
        <p className="text-sm text-mid leading-relaxed max-w-md mx-auto">{body}</p>
        <div className="mt-7 inline-flex items-center gap-2 text-xs font-bold text-mid">
          <span className="w-1.5 h-1.5 rounded-full bg-warning animate-pulse" />
          In active development
        </div>
      </div>
    </div>
  )
}
