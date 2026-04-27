'use client'
import { useEffect, useRef, useState } from 'react'
import { useWizard, allBlocksApproved } from './wizard-state'
import { ALL_BLOCK_KEYS, BLOCK_LABELS, type BlockKey } from '@/lib/campaign-types'

export default function Step3DraftCoach() {
  const { state, dispatch, callDraft } = useWizard()

  useEffect(() => {
    if (!state.draftedStep3 && !state.streaming) {
      dispatch({ type: 'MARK_DRAFTED_STEP3' })
      dispatch({
        type: 'PUSH_COACH_MESSAGE',
        msg: {
          role: 'coach',
          text: "I've drafted something for each section — have a look and approve when you're happy.",
          ts: Date.now(),
        },
      })
      callDraft(2).catch(() => {})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const allApproved = allBlocksApproved(state)

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-xl sm:text-2xl font-bold text-charcoal mb-2">
            Step 3 — Draft & approve
          </h2>
          <p className="text-sm text-mid leading-relaxed max-w-xl">
            Edit each block, then hit <strong className="text-charcoal">Approve section</strong>.
            All blocks must be approved before you continue.
          </p>
        </div>
        {state.job_ad_draft && (
          <span
            className={`text-[11px] font-bold uppercase tracking-wider rounded-full px-3 py-1.5 ${
              allApproved ? 'bg-charcoal text-white' : 'bg-light text-mid'
            }`}
          >
            {Object.values(state.block_states).filter(s => s === 'approved').length}/
            {ALL_BLOCK_KEYS.length} approved
          </span>
        )}
      </div>

      {!state.job_ad_draft ? (
        <div className="bg-white shadow-card rounded-3xl p-6 text-sm text-mid">
          {state.streaming
            ? 'Coach is drafting your ad…'
            : 'Waiting for draft. If nothing arrives, go back and confirm the brief.'}
        </div>
      ) : (
        ALL_BLOCK_KEYS.map(key => <BlockCard key={key} blockKey={key} />)
      )}
    </div>
  )
}

function BlockCard({ blockKey }: { blockKey: BlockKey }) {
  const { state, dispatch } = useWizard()
  const blockState = state.block_states[blockKey] || 'draft'
  const flashing = state.flashBlock === blockKey
  const ref = useRef<HTMLDivElement>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [diff, setDiff] = useState<{ old: string; next: string } | null>(null)

  useEffect(() => {
    if (flashing && ref.current) {
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [flashing])

  if (!state.job_ad_draft) return null
  const blocks = state.job_ad_draft.blocks
  const value = readBlock(blocks, blockKey)
  const isList = Array.isArray(value)

  const setValue = (v: any) => dispatch({ type: 'PATCH_JOB_AD_BLOCK', key: blockKey, value: v })
  const approve = () => dispatch({ type: 'SET_BLOCK_STATE', key: blockKey, state: 'approved' })

  const aiRewrite = (mode: 'rewrite' | 'shorter' | 'warmer') => {
    const oldText = isList ? (value as string[]).join('\n') : (value as string)
    let nextText = oldText
    if (mode === 'shorter') nextText = oldText.split('. ').slice(0, 2).join('. ')
    if (mode === 'warmer') nextText = oldText + ' We genuinely care about getting this hire right.'
    if (mode === 'rewrite') nextText = oldText + ' (rewritten)'
    setDiff({ old: oldText, next: nextText })
    setMenuOpen(false)
  }

  const acceptDiff = () => {
    if (!diff) return
    setValue(isList ? diff.next.split('\n').filter(Boolean) : diff.next)
    setDiff(null)
  }

  return (
    <div
      ref={ref}
      className={`bg-white shadow-card rounded-3xl p-5 sm:p-6 transition-all ${
        flashing ? 'ring-2 ring-warning' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <h3 className="font-display text-base font-bold text-charcoal uppercase tracking-wider">
          {BLOCK_LABELS[blockKey]}
        </h3>
        <div className="flex items-center gap-2">
          <StatusPill state={blockState} />
          <div className="relative">
            <button
              onClick={() => setMenuOpen(o => !o)}
              className="w-7 h-7 rounded-full hover:bg-light flex items-center justify-center text-mid"
              aria-label="Block actions"
            >
              ⋯
            </button>
            {menuOpen && (
              <div
                className="absolute right-0 top-9 bg-white shadow-card rounded-2xl py-1 w-48 z-10"
                onMouseLeave={() => setMenuOpen(false)}
              >
                <MenuItem onClick={() => aiRewrite('rewrite')}>Rewrite this section</MenuItem>
                <MenuItem onClick={() => aiRewrite('shorter')}>Make shorter</MenuItem>
                <MenuItem onClick={() => aiRewrite('warmer')}>Make warmer</MenuItem>
              </div>
            )}
          </div>
        </div>
      </div>

      {diff ? (
        <DiffView old={diff.old} next={diff.next} onAccept={acceptDiff} onReject={() => setDiff(null)} />
      ) : isList ? (
        <ListEditor items={value as string[]} onChange={setValue} />
      ) : (
        <textarea
          value={value as string}
          onChange={e => setValue(e.target.value)}
          rows={4}
          className="w-full bg-bg border border-border rounded-2xl px-3.5 py-2.5 text-sm text-charcoal leading-relaxed outline-none focus:border-charcoal resize-y"
        />
      )}

      <div className="flex items-center justify-end mt-4">
        <button
          onClick={approve}
          disabled={blockState === 'approved'}
          className={`text-sm font-bold px-5 py-2.5 rounded-full transition-colors ${
            blockState === 'approved'
              ? 'bg-charcoal text-white cursor-default'
              : 'bg-black text-white hover:bg-[#1a1a1a]'
          }`}
        >
          {blockState === 'approved' ? 'Approved ✓' : 'Approve section ✓'}
        </button>
      </div>
    </div>
  )
}

function StatusPill({ state }: { state: 'draft' | 'edited' | 'approved' }) {
  if (state === 'approved') {
    return (
      <span className="bg-charcoal text-white text-[10px] font-bold uppercase tracking-wider rounded-full px-2.5 py-1">
        Approved ✓
      </span>
    )
  }
  if (state === 'edited') {
    return (
      <span className="bg-charcoal/10 text-charcoal text-[10px] font-bold uppercase tracking-wider rounded-full px-2.5 py-1">
        Edited
      </span>
    )
  }
  return (
    <span className="bg-light text-mid text-[10px] font-bold uppercase tracking-wider rounded-full px-2.5 py-1">
      Draft
    </span>
  )
}

function MenuItem({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left text-xs text-charcoal hover:bg-light px-3 py-2"
    >
      {children}
    </button>
  )
}

function ListEditor({ items, onChange }: { items: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="space-y-1.5">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="text-mid text-xs">•</span>
          <input
            value={item}
            onChange={e => {
              const next = [...items]
              next[i] = e.target.value
              onChange(next)
            }}
            className="flex-1 bg-bg border border-border rounded-full px-3 py-1.5 text-sm text-charcoal outline-none focus:border-charcoal"
          />
          <button
            onClick={() => onChange(items.filter((_, idx) => idx !== i))}
            className="w-6 h-6 rounded-full hover:bg-light flex items-center justify-center text-mid text-sm"
            aria-label="Remove"
          >
            ×
          </button>
        </div>
      ))}
      <button
        onClick={() => onChange([...items, ''])}
        className="text-xs font-bold text-mid hover:text-charcoal px-3 py-1.5"
      >
        + Add item
      </button>
    </div>
  )
}

function DiffView({
  old,
  next,
  onAccept,
  onReject,
}: {
  old: string
  next: string
  onAccept: () => void
  onReject: () => void
}) {
  return (
    <div className="space-y-3">
      <div className="bg-bg rounded-2xl p-3.5 text-sm text-muted line-through whitespace-pre-wrap">
        {old}
      </div>
      <div className="bg-bg rounded-2xl p-3.5 text-sm text-charcoal whitespace-pre-wrap">{next}</div>
      <div className="flex gap-2">
        <button
          onClick={onAccept}
          className="bg-black text-white text-sm font-bold px-4 py-2 rounded-full hover:bg-[#1a1a1a] transition-colors"
        >
          Keep new
        </button>
        <button
          onClick={onReject}
          className="bg-white border border-border text-charcoal text-sm font-bold px-4 py-2 rounded-full hover:bg-light transition-colors"
        >
          Keep mine
        </button>
      </div>
    </div>
  )
}

function readBlock(blocks: any, key: BlockKey): string | string[] {
  switch (key) {
    case 'overview': return blocks.overview || ''
    case 'about_us': return blocks.about_us || ''
    case 'responsibilities': return blocks.responsibilities || []
    case 'requirements_must': return blocks.requirements?.must || []
    case 'requirements_nice': return blocks.requirements?.nice || []
    case 'benefits': return blocks.benefits || []
    case 'apply_cta': return blocks.apply_cta || ''
  }
}
