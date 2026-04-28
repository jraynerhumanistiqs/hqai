'use client'
import { useEffect, useRef } from 'react'
import { useWizard } from './wizard-state'
import { BLOCK_LABELS, type BlockKey } from '@/lib/campaign-types'

export default function CoachPanel({ onClose }: { onClose?: () => void }) {
  const { state, dispatch } = useWizard()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [state.coach_messages])

  const showScore = state.step >= 3
  const score = state.coach_score?.overall

  return (
    <div className="flex flex-col w-full h-full">
      <div className="px-4 py-4 border-b border-border flex items-center gap-3 flex-shrink-0">
        <div className="w-9 h-9 rounded-full bg-black text-white font-display text-sm flex items-center justify-center">
          C
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-display text-sm font-bold text-charcoal uppercase tracking-wider">
            Campaign Coach
          </h2>
          <p className="text-[11px] text-muted">
            {state.streaming ? 'Thinking…' : 'Ready when you are'}
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full hover:bg-light flex items-center justify-center text-mid"
            aria-label="Close coach"
          >
            ×
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-4 space-y-3">
        {state.coach_messages.length === 0 && !state.streaming && (
          <p className="text-xs text-muted leading-relaxed">
            Hi - I'll guide you through writing a great ad and getting it live. Tell me about
            the role on the left and I'll take it from there.
          </p>
        )}
        {state.coach_messages.map((m, i) => (
          <div
            key={i}
            className={
              m.role === 'coach'
                ? 'text-sm text-charcoal leading-relaxed whitespace-pre-wrap'
                : 'text-sm text-mid leading-relaxed whitespace-pre-wrap'
            }
          >
            {m.role === 'user' && (
              <span className="text-[10px] font-bold text-muted uppercase tracking-wider block mb-0.5">
                You
              </span>
            )}
            {m.text || (
              <span className="inline-block w-2 h-2 rounded-full bg-charcoal animate-pulse" />
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {showScore && (
        <div className="border-t border-border px-4 py-4 flex-shrink-0">
          <div className="flex items-baseline gap-3 mb-3">
            <span className="font-display text-3xl font-bold text-charcoal tabular-nums">
              {typeof score === 'number' ? score : '-'}
            </span>
            <span className="text-[10px] font-bold text-muted uppercase tracking-wider">
              AD HEALTH
            </span>
          </div>

          {state.coach_score?.warnings && state.coach_score.warnings.length > 0 ? (
            <ul className="space-y-2">
              {state.coach_score.warnings.slice(0, 5).map((w, i) => {
                const dotCls =
                  w.severity === 'error'
                    ? 'text-danger'
                    : w.severity === 'warn'
                    ? 'text-warning'
                    : 'text-mid'
                return (
                  <li key={i} className="flex items-start gap-2 text-xs">
                    <span className={`${dotCls} font-bold leading-tight mt-0.5`}>!</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-bold text-charcoal uppercase tracking-wider">
                        {BLOCK_LABELS[w.block as BlockKey] || w.block}
                      </p>
                      <p className="text-xs text-mid leading-relaxed">{w.message}</p>
                      <button
                        onClick={() => {
                          dispatch({ type: 'FLASH_BLOCK', key: w.block as BlockKey })
                          setTimeout(
                            () => dispatch({ type: 'FLASH_BLOCK', key: undefined }),
                            1500,
                          )
                        }}
                        className="text-[11px] font-bold text-charcoal hover:underline mt-1"
                      >
                        Fix →
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="text-xs text-muted">No warnings - looking good.</p>
          )}
        </div>
      )}

      <div className="border-t border-border px-4 py-3 flex-shrink-0">
        <textarea
          disabled
          rows={1}
          placeholder="Coming soon - chat back to the coach"
          className="w-full bg-light text-xs text-muted placeholder-muted rounded-2xl px-3 py-2 resize-none outline-none cursor-not-allowed"
        />
      </div>
    </div>
  )
}
