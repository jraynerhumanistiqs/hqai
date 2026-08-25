'use client'

// The 3-tier safety surfacing from the UX brief (section 4), built as three
// calm, first-class response states - never error states.
//
//   safe     -> no banner. The answer stands on its own (rendered by the
//               transcript). Kept deliberately friction-free.
//   caution  -> amber heads-up. The assistant still helped; it just flags
//               "worth a professional's eyes before you act". Low-friction and
//               non-alarming so the classifier can prefer it over Escalate.
//   escalate -> red-but-reassuring. The assistant declines the risky task,
//               says why in one plain sentence, and pivots to preparing the
//               user for their advisor. Never a dead end.
//
// Colours come from the semantic tokens (warning / danger) so both product
// themes stay calm and legible. Copy is plain, warm, Australian, and never
// positions the assistant as giving legal advice.

import { RiAlertLine, RiLifebuoyLine, RiSendPlaneLine } from '@remixicon/react'

export type Tier = 'safe' | 'caution' | 'escalate'

interface TierNoticeProps {
  tier: Tier
  onPrepare: () => void
  onContinue: () => void
  onToggleContext: () => void
  showContextInput: boolean
  extraContext: string
  onExtraContextChange: (value: string) => void
  onSendContext: () => void
}

export default function TierNotice({
  tier,
  onPrepare,
  onContinue,
  onToggleContext,
  showContextInput,
  extraContext,
  onExtraContextChange,
  onSendContext,
}: TierNoticeProps) {
  if (tier === 'safe') return null

  if (tier === 'caution') {
    return (
      <div className="mt-3 rounded-2xl border border-[color-mix(in_srgb,var(--warning)_32%,transparent)] bg-[color-mix(in_srgb,var(--warning)_8%,transparent)] p-3.5">
        <div className="flex gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--warning)_16%,transparent)] text-warning">
            <RiAlertLine className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="flex-1">
            <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-warning">
              Worth a professional's eyes
            </p>
            <p className="mt-1 text-xs leading-relaxed text-ink-soft">
              You can keep going with me on this. Given what is involved, it is worth having your
              Humanistiqs advisor take a look before you act - just so you are covered.
            </p>
            <div className="mt-2.5 flex flex-wrap gap-2">
              <button
                onClick={onPrepare}
                className="rounded-full border border-[color-mix(in_srgb,var(--warning)_42%,transparent)] px-3 py-1.5 text-xs font-bold text-ink transition-colors hover:bg-[color-mix(in_srgb,var(--warning)_10%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                Prepare for your advisor
              </button>
              <button
                onClick={onContinue}
                className="rounded-full px-3 py-1.5 text-xs font-bold text-ink-soft transition-colors hover:bg-bg-soft hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
              >
                Keep going with the AI
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // tier === 'escalate'
  return (
    <div className="mt-3 rounded-2xl border border-[color-mix(in_srgb,var(--danger)_32%,transparent)] bg-[color-mix(in_srgb,var(--danger)_7%,transparent)] p-3.5">
      <div className="flex gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--danger)_13%,transparent)] text-danger">
          <RiLifebuoyLine className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="flex-1">
          <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-danger">
            Let us get your advisor on this
          </p>
          <p className="mt-1 text-xs leading-relaxed text-ink-soft">
            This one carries real risk, so I would not want you acting on AI guidance alone. The safe
            move is to bring in your Humanistiqs advisor - I can package everything you have told me so
            they are ready, no repeating yourself.
          </p>
          <div className="mt-2.5 flex flex-wrap gap-2">
            <button
              onClick={onPrepare}
              className="rounded-full bg-accent px-3 py-1.5 text-xs font-bold text-ink-on-accent transition-colors hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
            >
              Get you ready for your advisor
            </button>
            <button
              onClick={onContinue}
              className="rounded-full border border-border px-3 py-1.5 text-xs font-bold text-ink-soft transition-colors hover:bg-bg-soft hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
            >
              Keep talking with the AI
            </button>
            <button
              onClick={onToggleContext}
              className="rounded-full px-3 py-1.5 text-xs font-bold text-ink-muted transition-colors hover:bg-bg-soft hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
            >
              + Add context
            </button>
          </div>
          {showContextInput && (
            <div className="mt-3 space-y-2">
              <textarea
                value={extraContext}
                onChange={(e) => onExtraContextChange(e.target.value)}
                placeholder="Add anything else about your situation..."
                rows={3}
                className="w-full resize-none rounded-lg border border-border bg-bg-elevated px-3 py-2 text-sm text-ink outline-none transition-colors placeholder:text-ink-muted"
              />
              <button
                onClick={onSendContext}
                disabled={!extraContext.trim()}
                className="inline-flex items-center gap-1.5 rounded-full bg-accent px-4 py-1.5 text-xs font-bold text-ink-on-accent transition-colors hover:bg-accent-hover disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
              >
                <RiSendPlaneLine className="h-3 w-3" aria-hidden="true" />
                Send context
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
