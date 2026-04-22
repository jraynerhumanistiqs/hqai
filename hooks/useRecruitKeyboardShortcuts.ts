'use client'
import { useEffect } from 'react'

export interface RecruitKeyboardHandlers {
  onNextCandidate?: () => void
  onPrevCandidate?: () => void
  onPlayPause?: () => void
  onRate?: (n: 1 | 2 | 3 | 4 | 5) => void
  onShare?: () => void
  onAccept?: () => void
  onReject?: () => void
  onToggleLegend?: () => void
}

function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false
  const tag = el.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
  if (el.isContentEditable) return true
  return false
}

export function useRecruitKeyboardShortcuts(
  enabled: boolean,
  handlers: RecruitKeyboardHandlers,
) {
  useEffect(() => {
    if (!enabled) return

    function onKey(e: KeyboardEvent) {
      if (isTypingTarget(e.target)) return
      if (e.metaKey || e.ctrlKey || e.altKey) return

      const k = e.key

      if (k === 'j' || k === 'J') { handlers.onNextCandidate?.(); e.preventDefault(); return }
      if (k === 'k' || k === 'K') { handlers.onPrevCandidate?.(); e.preventDefault(); return }
      if (k === ' ' || k === 'Spacebar') { handlers.onPlayPause?.(); e.preventDefault(); return }
      if (k === 's' || k === 'S') { handlers.onShare?.(); e.preventDefault(); return }
      if (k === 'a' || k === 'A') { handlers.onAccept?.(); e.preventDefault(); return }
      if (k === 'r' || k === 'R') { handlers.onReject?.(); e.preventDefault(); return }
      if (k === '?') { handlers.onToggleLegend?.(); e.preventDefault(); return }
      if (k === '1' || k === '2' || k === '3' || k === '4' || k === '5') {
        handlers.onRate?.(Number(k) as 1 | 2 | 3 | 4 | 5)
        e.preventDefault()
        return
      }
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [enabled, handlers])
}

export const RECRUIT_SHORTCUTS: Array<{ key: string; label: string }> = [
  { key: 'J',     label: 'Next candidate' },
  { key: 'K',     label: 'Previous candidate' },
  { key: 'Space', label: 'Play / pause active video' },
  { key: '1-5',   label: 'Set staff star rating' },
  { key: 'A',     label: 'Accept AI suggestion' },
  { key: 'R',     label: 'Reject AI suggestion' },
  { key: 'S',     label: 'Share with client' },
  { key: '?',     label: 'Toggle this shortcut legend' },
  { key: 'Esc',   label: 'Close legend' },
]
