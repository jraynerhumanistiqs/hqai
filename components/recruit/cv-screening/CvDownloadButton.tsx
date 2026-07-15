'use client'
// Small icon button that downloads the ORIGINAL CV file a candidate
// uploaded, via GET /api/cv-screening/screenings/[id]/cv. When the
// original was never stored (historical rows), the route 404s with
// { fallback: 'formatted' } and we quietly fall back to the branded
// formatted CV export instead, telling the user what happened. Errors
// surface as a quiet inline bubble - never an alert().

import { useEffect, useRef, useState } from 'react'

interface Props {
  screeningId: string
  candidateName: string
  /** Which side the message bubble grows from. */
  align?: 'left' | 'right'
  className?: string
}

function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function filenameFrom(res: Response, fallback: string): string {
  const cd = res.headers.get('Content-Disposition') || ''
  const m = /filename="([^"]+)"/.exec(cd)
  return m?.[1] ?? fallback
}

export default function CvDownloadButton({ screeningId, candidateName, align = 'left', className = '' }: Props) {
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ kind: 'notice' | 'error'; text: string } | null>(null)
  const clearTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => { if (clearTimer.current) clearTimeout(clearTimer.current) }, [])

  function showMessage(kind: 'notice' | 'error', text: string) {
    setMessage({ kind, text })
    if (clearTimer.current) clearTimeout(clearTimer.current)
    // Informational notices tidy themselves away; errors stay until
    // dismissed so the user can actually read them.
    if (kind === 'notice') clearTimer.current = setTimeout(() => setMessage(null), 8000)
  }

  async function download(e: React.MouseEvent) {
    e.stopPropagation()
    e.preventDefault()
    if (busy) return
    setMessage(null)
    if (screeningId.startsWith('local-')) {
      showMessage('error', 'This screening was not saved to the database, so there is no stored CV file to download.')
      return
    }
    setBusy(true)
    try {
      const res = await fetch(`/api/cv-screening/screenings/${screeningId}/cv`)
      if (res.ok) {
        const blob = await res.blob()
        triggerBlobDownload(blob, filenameFrom(res, `${candidateName || 'candidate'} - CV`))
      } else {
        let data: { error?: string; fallback?: string } = {}
        try { data = await res.json() } catch {}
        if (res.status === 404 && data.fallback === 'formatted') {
          showMessage('notice', "Original file wasn't stored for this candidate - downloading the branded formatted CV instead.")
          const fres = await fetch(`/api/cv-screening/screenings/${screeningId}/export?mode=formatted`)
          const ct = fres.headers.get('content-type') || ''
          if (!fres.ok || (!ct.includes('officedocument') && !ct.includes('octet-stream'))) {
            let detail = ''
            try { const j = await fres.json(); detail = (j?.error as string) ?? '' } catch {}
            throw new Error(detail || `HTTP ${fres.status}`)
          }
          const blob = await fres.blob()
          triggerBlobDownload(blob, filenameFrom(fres, `${candidateName || 'candidate'} - Formatted CV.docx`))
        } else {
          throw new Error(data.error || `HTTP ${res.status}`)
        }
      }
    } catch (err) {
      showMessage('error', `Could not download the CV - ${err instanceof Error ? err.message : 'unknown error'}`)
    }
    setBusy(false)
  }

  return (
    <span className={`relative inline-flex flex-shrink-0 ${className}`}>
      <button
        type="button"
        onClick={download}
        disabled={busy}
        aria-label={`Download CV - ${candidateName}`}
        title={`Download CV - ${candidateName}`}
        className="w-6 h-6 rounded-full flex items-center justify-center text-ink-muted hover:text-ink hover:bg-bg-soft transition-colors disabled:opacity-60"
      >
        {busy ? (
          <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="2.5" className="opacity-25" />
            <path d="M18 10a8 8 0 00-8-8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        ) : (
          <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M10 3v9" />
            <path d="M6 9l4 4 4-4" />
            <path d="M4 16h12" />
          </svg>
        )}
      </button>
      {message && (
        <span
          role={message.kind === 'error' ? 'alert' : 'status'}
          className={`absolute ${align === 'right' ? 'right-0' : 'left-0'} top-full mt-1.5 z-30 w-64 rounded-xl border border-border bg-bg-elevated shadow-card px-3 py-2 text-left text-[11px] font-normal normal-case tracking-normal leading-relaxed whitespace-normal ${message.kind === 'error' ? 'text-danger' : 'text-ink-soft'}`}
        >
          {message.text}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setMessage(null) }}
            className="ml-2 font-bold text-ink-muted hover:text-ink"
            aria-label="Dismiss message"
          >
            x
          </button>
        </span>
      )}
    </span>
  )
}
