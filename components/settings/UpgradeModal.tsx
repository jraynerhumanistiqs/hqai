'use client'

// Fallback "email us to upgrade" modal, shown when the Stripe checkout
// route returns 503 (price ids not configured yet) so the user is never
// dead-ended.
export function UpgradeModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null
  return (
    <div
      className="fixed inset-0 bg-ink/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-bg-elevated border border-border rounded-2xl shadow-modal max-w-md w-full p-6"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="upgrade-modal-title"
      >
        <h3 id="upgrade-modal-title" className="font-display text-lg font-bold tracking-tight text-ink mb-1">
          Upgrades coming soon
        </h3>
        <p className="text-sm text-ink-soft mb-5">
          Self-serve checkout is on its way. In the meantime, email us and we'll upgrade your plan manually - usually within one business day.
        </p>
        <div className="flex items-center gap-3">
          <a
            href="mailto:support@humanistiqs.com.au?subject=Upgrade%20my%20HQ.ai%20plan"
            className="flex-1 text-center bg-accent hover:bg-accent-hover text-ink-on-accent font-bold px-5 py-2.5 rounded-full transition-colors text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
          >
            Email support
          </a>
          <button
            onClick={onClose}
            className="text-sm font-bold text-ink-soft hover:text-ink transition-colors px-3 py-2.5 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
