// Loading state for the document editor.
//
// Shown in the editor canvas while (a) the TipTap chunk downloads (used as
// the React.lazy Suspense fallback in DocEditorLazy) and (b) TipTap
// initialises inside DocEditor - so the transition is seamless across both
// phases and the recruiter always sees the same on-brand "preparing" state
// instead of a blank flash or bare "Loading..." text. It's swapped out for
// the real editable paper the moment the editor is ready.
//
// Dark, on-brand panel with shimmering "sentence" lines standing in for the
// document text. Kept dependency-free (no TipTap) so using it as the lazy
// fallback doesn't pull the editor into the initial bundle.
export default function EditorSkeleton() {
  return (
    <div className="h-full w-full overflow-hidden bg-[#0f0f10] px-6 py-8 sm:px-10 sm:py-10">
      <div className="mx-auto w-full max-w-[210mm]">
        <p className="mb-8 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-clay">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-clay" />
          Preparing your document...
        </p>
        <div className="animate-pulse space-y-8">
          {/* Title + meta lines */}
          <div className="space-y-3">
            <div className="h-6 w-2/3 rounded bg-clay/25" />
            <div className="h-3 w-40 rounded bg-white/10" />
            <div className="h-3 w-32 rounded bg-white/10" />
          </div>
          {/* Paragraph blocks - each a faux heading + sentence lines of
              varying width so it reads like real document copy. */}
          {[0, 1, 2, 3].map(block => (
            <div key={block} className="space-y-2.5">
              <div className="h-3.5 w-1/3 rounded bg-white/20" />
              <div className="h-3 w-full rounded bg-white/10" />
              <div className="h-3 w-full rounded bg-white/10" />
              <div className="h-3 w-11/12 rounded bg-white/10" />
              <div className="h-3 w-3/4 rounded bg-white/10" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
