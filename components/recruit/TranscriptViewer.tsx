'use client'
import { useEffect, useRef } from 'react'

export interface Utterance {
  start: number
  end: number
  speaker: number
  transcript: string
}

interface Props {
  utterances: Utterance[]
  currentTimeSec: number
  onSeek: (sec: number) => void
  highlightTimestampSec?: number
}

function fmt(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return '0:00'
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

function speakerLabel(n: number): string {
  if (n === 0) return 'Candidate'
  if (n === 1) return 'Interviewer'
  return `Speaker ${n + 1}`
}

export function TranscriptViewer({ utterances, currentTimeSec, onSeek, highlightTimestampSec }: Props) {
  const listRef = useRef<HTMLDivElement | null>(null)
  const activeRef = useRef<HTMLButtonElement | null>(null)
  const highlightRef = useRef<HTMLButtonElement | null>(null)

  const activeIdx = utterances.findIndex(
    u => currentTimeSec >= u.start && currentTimeSec <= u.end,
  )

  // Auto-scroll active utterance into view.
  useEffect(() => {
    if (activeIdx < 0) return
    activeRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [activeIdx])

  // Yellow ring flash on highlightTimestampSec change.
  useEffect(() => {
    if (highlightTimestampSec === undefined) return
    const el = highlightRef.current
    if (!el) return
    el.scrollIntoView({ block: 'center', behavior: 'smooth' })
    el.classList.add('ring-2', 'ring-yellow-400')
    const t = window.setTimeout(() => {
      el.classList.remove('ring-2', 'ring-yellow-400')
    }, 2000)
    return () => window.clearTimeout(t)
  }, [highlightTimestampSec])

  const highlightIdx = highlightTimestampSec === undefined
    ? -1
    : utterances.findIndex(u => highlightTimestampSec >= u.start && highlightTimestampSec <= u.end)

  if (!utterances.length) {
    return (
      <div className="bg-white rounded-2xl border border-border shadow-card px-5 py-4">
        <p className="text-xs text-mid">Transcript not available yet.</p>
      </div>
    )
  }

  return (
    <div
      ref={listRef}
      className="bg-white rounded-2xl border border-border shadow-card max-h-96 overflow-y-auto divide-y divide-border"
      role="list"
    >
      {utterances.map((u, i) => {
        const isActive = i === activeIdx
        const isHighlight = i === highlightIdx
        const setRef = (el: HTMLButtonElement | null) => {
          if (isActive) activeRef.current = el
          if (isHighlight) highlightRef.current = el
        }
        return (
          <button
            key={`${u.start}-${i}`}
            ref={setRef}
            onClick={() => onSeek(u.start)}
            className={`w-full text-left px-4 py-3 transition-colors flex gap-3 items-start ${
              isActive ? 'bg-yellow-50' : 'hover:bg-bg/60'
            }`}
          >
            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-light text-mid border border-border flex-shrink-0 mt-0.5">
              {fmt(u.start)}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-mid mb-0.5">
                {speakerLabel(u.speaker)}
              </p>
              <p className="text-sm text-charcoal break-words">{u.transcript}</p>
            </div>
          </button>
        )
      })}
    </div>
  )
}
