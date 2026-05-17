'use client'
import { useEffect, useRef, useState } from 'react'

export interface Chapter {
  timestampSec: number
  label: string
}

interface Props {
  cloudflareUid: string
  chapters?: Chapter[]
  onTimeUpdate?: (sec: number) => void
  seekToSec?: number
  title?: string
}

declare global {
  interface Window {
    Stream?: (iframe: HTMLIFrameElement) => {
      addEventListener: (evt: string, cb: (e: any) => void) => void
      removeEventListener: (evt: string, cb: (e: any) => void) => void
      play: () => Promise<void>
      pause: () => void
      currentTime: number
      duration: number
    }
  }
}

const SDK_URL = 'https://embed.videodelivery.net/embed/sdk.latest.js'

function loadStreamSdk(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') return resolve(false)
    if (window.Stream) return resolve(true)
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SDK_URL}"]`)
    if (existing) {
      existing.addEventListener('load', () => resolve(!!window.Stream))
      existing.addEventListener('error', () => resolve(false))
      return
    }
    const s = document.createElement('script')
    s.src = SDK_URL
    s.async = true
    s.onload = () => resolve(!!window.Stream)
    s.onerror = () => resolve(false)
    document.head.appendChild(s)
  })
}

export function VideoPlayer({ cloudflareUid, chapters = [], onTimeUpdate, seekToSec, title }: Props) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null)
  const playerRef = useRef<ReturnType<NonNullable<Window['Stream']>> | null>(null)
  const [sdkReady, setSdkReady] = useState(false)
  const [sdkFailed, setSdkFailed] = useState(false)
  const [duration, setDuration] = useState(0)
  const [currentSec, setCurrentSec] = useState(0)

  useEffect(() => {
    let cancelled = false
    loadStreamSdk().then((ok) => {
      if (cancelled) return
      if (!ok) { setSdkFailed(true); return }
      if (!iframeRef.current || !window.Stream) { setSdkFailed(true); return }
      try {
        const player = window.Stream(iframeRef.current)
        playerRef.current = player
        const onTime = () => {
          const t = player.currentTime || 0
          setCurrentSec(t)
          onTimeUpdate?.(t)
        }
        const onLoaded = () => {
          setDuration(player.duration || 0)
        }
        player.addEventListener('timeupdate', onTime)
        player.addEventListener('loadedmetadata', onLoaded)
        player.addEventListener('durationchange', onLoaded)
        setSdkReady(true)
        return () => {
          player.removeEventListener('timeupdate', onTime)
          player.removeEventListener('loadedmetadata', onLoaded)
          player.removeEventListener('durationchange', onLoaded)
        }
      } catch {
        setSdkFailed(true)
      }
    })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cloudflareUid])

  // External seek requests.
  useEffect(() => {
    if (seekToSec === undefined) return
    const p = playerRef.current
    if (!p) return
    try { p.currentTime = seekToSec } catch { /* no-op */ }
  }, [seekToSec])

  const baseSrc = `https://iframe.videodelivery.net/${cloudflareUid}?primaryColor=000000`

  if (sdkFailed) {
    return (
      <div className="aspect-video bg-black rounded-2xl overflow-hidden">
        <iframe
          src={baseSrc}
          className="w-full h-full"
          allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
          title={title ?? 'Candidate video'}
        />
      </div>
    )
  }

  return (
    <div>
      <div className="aspect-video bg-black rounded-2xl overflow-hidden">
        <iframe
          ref={iframeRef}
          src={baseSrc}
          className="w-full h-full"
          allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
          title={title ?? 'Candidate video'}
        />
      </div>

      {sdkReady && chapters.length > 0 && duration > 0 && (
        <div className="mt-2">
          <div className="relative h-6">
            <div className="absolute inset-x-0 top-1/2 h-[2px] -translate-y-1/2 bg-border rounded-full" />
            {chapters.map((c, i) => {
              const pct = Math.max(0, Math.min(100, (c.timestampSec / duration) * 100))
              return (
                <button
                  key={i}
                  onClick={() => { if (playerRef.current) playerRef.current.currentTime = c.timestampSec }}
                  className="absolute top-0 -translate-x-1/2 flex flex-col items-center group"
                  style={{ left: `${pct}%` }}
                  title={`${c.label} - jump`}
                >
                  <span className="w-[2px] h-4 bg-black group-hover:bg-accent transition-colors" />
                  <span className="text-[10px] font-bold text-mid group-hover:text-ink transition-colors whitespace-nowrap">
                    {c.label}
                  </span>
                </button>
              )
            })}
          </div>
          <p className="text-[10px] text-mid mt-1 tabular-nums">
            {Math.floor(currentSec)}s / {Math.floor(duration)}s
          </p>
        </div>
      )}
    </div>
  )
}
