'use client'
import { useState } from 'react'
import type { CandidateResponse, PrescreenEvaluation } from '@/lib/recruit-types'

export type KanbanStage = 'new' | 'in_review' | 'video_interview' | 'shortlisted' | 'rejected'

const STAGE_ORDER: KanbanStage[] = ['new', 'in_review', 'video_interview', 'shortlisted', 'rejected']

const STAGE_LABEL: Record<KanbanStage, string> = {
  new: 'New',
  in_review: 'In Review',
  video_interview: 'Video Interview',
  shortlisted: 'Shortlisted',
  rejected: 'Rejected',
}

const STAGE_CLS: Record<KanbanStage, string> = {
  new: 'bg-light text-mid border-border',
  in_review: 'bg-blue-50 text-blue-600 border-blue-200',
  video_interview: 'bg-amber-50 text-amber-700 border-amber-200',
  shortlisted: 'bg-green-50 text-green-600 border-green-200',
  rejected: 'bg-red-50 text-red-600 border-red-200',
}

const STATUS_LABEL: Record<string, string> = {
  submitted: 'Submitted',
  transcribing: 'Transcribing',
  evaluating: 'Evaluating',
  scored: 'Scored',
  staff_reviewed: 'Reviewed',
  shared: 'Shared',
  new: 'Submitted',
  reviewed: 'Reviewed',
}

const STATUS_PILL: Record<string, string> = {
  submitted: 'bg-light text-mid border-border',
  transcribing: 'bg-blue-50 text-blue-600 border-blue-200',
  evaluating: 'bg-blue-50 text-blue-600 border-blue-200',
  scored: 'bg-amber-50 text-amber-700 border-amber-200',
  staff_reviewed: 'bg-green-50 text-green-600 border-green-200',
  shared: 'bg-purple-50 text-purple-600 border-purple-200',
  new: 'bg-light text-mid border-border',
  reviewed: 'bg-green-50 text-green-600 border-green-200',
}

interface Props {
  responses: CandidateResponse[]
  anonymise: boolean
  displayNameFor: (r: CandidateResponse) => string
  evaluations: Record<string, PrescreenEvaluation | null>
  onStageChange: (id: string, stage: KanbanStage) => void
  onSelect?: (id: string) => void
  selectedIds?: Set<string>
  onToggleSelect?: (id: string) => void
}

export function ResponsesKanban({
  responses,
  anonymise,
  displayNameFor,
  evaluations,
  onStageChange,
  onSelect,
  selectedIds,
  onToggleSelect,
}: Props) {
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [overStage, setOverStage] = useState<KanbanStage | null>(null)

  const byStage: Record<KanbanStage, CandidateResponse[]> = {
    new: [], in_review: [], video_interview: [], shortlisted: [], rejected: [],
  }
  for (const r of responses) {
    const s = ((r as any).stage as KanbanStage) || 'new'
    byStage[s in byStage ? s : 'new'].push(r)
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
      {STAGE_ORDER.map(stage => {
        const cards = byStage[stage]
        const isOver = overStage === stage
        return (
          <div
            key={stage}
            onDragOver={e => { e.preventDefault(); setOverStage(stage) }}
            onDragLeave={() => setOverStage(prev => (prev === stage ? null : prev))}
            onDrop={e => {
              e.preventDefault()
              const id = e.dataTransfer.getData('text/plain') || draggingId
              setOverStage(null)
              setDraggingId(null)
              if (id) onStageChange(id, stage)
            }}
            className={`rounded-2xl border bg-bg/50 p-3 min-h-[200px] transition-colors ${
              isOver ? 'border-accent bg-accent/5' : 'border-border'
            }`}
          >
            <div className="flex items-center justify-between mb-2 px-1">
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${STAGE_CLS[stage]}`}>
                {STAGE_LABEL[stage]}
              </span>
              <span className="text-xs text-mid">{cards.length}</span>
            </div>
            <div className="space-y-2">
              {cards.map(r => {
                const evaluation = evaluations[r.id] ?? null
                const statusLabel = STATUS_LABEL[r.status as string] ?? String(r.status)
                const pillCls = STATUS_PILL[r.status as string] ?? 'bg-light text-mid border-border'
                const suggestion = evaluation?.rubric
                  ? `${evaluation.rubric.reduce((a, d) => a + (d.score || 0), 0).toFixed(1)} / ${evaluation.rubric.length * 5}`
                  : null
                const checked = !!selectedIds?.has(r.id)
                const disabled = !!onToggleSelect && !checked && (selectedIds?.size ?? 0) >= 4
                return (
                  <div
                    key={r.id}
                    draggable
                    onDragStart={e => {
                      setDraggingId(r.id)
                      e.dataTransfer.effectAllowed = 'move'
                      e.dataTransfer.setData('text/plain', r.id)
                    }}
                    onDragEnd={() => { setDraggingId(null); setOverStage(null) }}
                    onClick={() => onSelect?.(r.id)}
                    className={`bg-white rounded-2xl border border-border shadow-card px-3 py-2 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow relative ${
                      draggingId === r.id ? 'opacity-40' : ''
                    } ${checked ? 'ring-2 ring-black' : ''}`}
                  >
                    {onToggleSelect && (
                      <label
                        onClick={e => e.stopPropagation()}
                        className="absolute top-2 right-2 flex items-center cursor-pointer"
                        title={disabled ? 'Maximum 4 candidates' : checked ? 'Deselect' : 'Select for compare'}
                      >
                        <input
                          type="checkbox"
                          className="w-4 h-4 accent-black cursor-pointer"
                          checked={checked}
                          disabled={disabled}
                          onChange={() => onToggleSelect(r.id)}
                        />
                      </label>
                    )}
                    <div className="flex items-center gap-2 pr-6">
                      {!anonymise && (
                        <div className="w-7 h-7 rounded-full bg-light flex items-center justify-center text-[10px] font-bold text-ink flex-shrink-0">
                          {displayNameFor(r).split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-ink truncate">{displayNameFor(r)}</p>
                        {!anonymise && (
                          <p className="text-[11px] text-mid truncate">{r.candidate_email}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border capitalize ${pillCls}`}>
                        {statusLabel}
                      </span>
                      {r.rating !== null && r.rating !== undefined && (
                        <span className="text-[10px] font-bold text-warning">{r.rating}/5</span>
                      )}
                      {suggestion && (
                        <span className="text-[10px] font-bold text-mid">AI {suggestion}</span>
                      )}
                    </div>
                  </div>
                )
              })}
              {cards.length === 0 && (
                <p className="text-[11px] text-mid/60 text-center py-6">Drop candidates here</p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
