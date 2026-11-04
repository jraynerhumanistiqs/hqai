'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * The artwork inside the dashboard's route-transition overlay.
 *
 * RENDERER CHOICE - lottie-web's `lottie_light` build, dynamically imported.
 *
 * Why not @lottiefiles/dotlottie-react: it plays the .lottie archive
 * directly but ships a WASM player (megabytes, plus a separate .wasm
 * fetch). For something that is on screen for a few hundred milliseconds
 * during a route change that is indefensible.
 *
 * Why lottie_light rather than the full lottie-web build: 168KB raw /
 * ~47KB gzip against 306KB / ~77KB. The light build drops expression
 * support and the canvas/html renderers, none of which this asset uses
 * (checked: no expressions, no images, no fonts, one stroke colour).
 *
 * It is imported INSIDE the effect, so it lands in its own async chunk and
 * is never part of the dashboard's initial JS. The first slow navigation
 * pays for the chunk; after that it is in the browser cache. The animation
 * JSON is fetched from /public (35KB raw, ~1.9KB gzip) rather than imported,
 * so it does not enter a bundle either.
 *
 * The honest tradeoff: on the very first slow navigation the player may
 * well arrive AFTER the route has committed, in which case the user only
 * ever sees the CSS ring below. That is why the ring exists and why it is
 * painted first - the overlay must look finished without the player, and
 * must never wait for it.
 */

// Lives in /public so it is a plain static fetch, cacheable and out of the
// JS bundles.
const ANIMATION_SRC = '/animations/nav-loading.json'

// The source canvas is 800x600 with the art sitting in roughly a 300x300
// square around the centre, so two thirds of the canvas is empty. Cropping
// the SVG viewBox zooms onto the art instead of rendering it postage-stamp
// sized inside the card.
const VIEW_BOX_CROP = '250 150 300 300'
const BOX_PX = 104

type LottieAnimation = { destroy: () => void }

// One in-flight request per page load, shared by every mount.
let sourceRequest: Promise<unknown> | null = null
function loadSource(): Promise<unknown> {
  if (!sourceRequest) {
    sourceRequest = fetch(ANIMATION_SRC)
      .then((res) => {
        if (!res.ok) throw new Error(`nav-loading.json: HTTP ${res.status}`)
        return res.json()
      })
      .catch((err) => {
        // Do not cache a failure - let the next navigation retry.
        sourceRequest = null
        throw err
      })
  }
  return sourceRequest
}

/** `#RGB` / `#RRGGBB` -> Lottie's 0..1 rgb triple. */
function parseHex(value: string): [number, number, number] | null {
  const hex = value.trim().replace(/^#/, '')
  const full = hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null
  return [
    parseInt(full.slice(0, 2), 16) / 255,
    parseInt(full.slice(2, 4), 16) / 255,
    parseInt(full.slice(4, 6), 16) / 255,
  ]
}

/**
 * Repaint every fill and stroke in the animation with the resolved `--ink`
 * token.
 *
 * The supplied asset carries exactly one hard-coded colour, a near-black
 * navy, which is all but invisible on the dashboard's DEFAULT dark theme
 * (page #202020 / card #292929). Reading the token at runtime keeps the
 * indicator theme-correct in light and dark without a colour literal in
 * this file. If the token cannot be parsed the asset keeps its own colour.
 */
function tintToInk(data: any, host: Element): any {
  const rgb = parseHex(getComputedStyle(host).getPropertyValue('--ink'))
  if (!rgb) return data
  const walk = (node: any): void => {
    if (Array.isArray(node)) {
      node.forEach(walk)
      return
    }
    if (!node || typeof node !== 'object') return
    const isPaint = node.ty === 'fl' || node.ty === 'st'
    if (isPaint && node.c && Array.isArray(node.c.k) && typeof node.c.k[0] === 'number') {
      node.c.k = [rgb[0], rgb[1], rgb[2], 1]
      return
    }
    for (const key of Object.keys(node)) walk(node[key])
  }
  walk(data)
  return data
}

export default function NavProgressArt() {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    // prefers-reduced-motion: do not even fetch the player. The static ring
    // below IS the indicator for those users.
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches) return

    let cancelled = false
    let animation: LottieAnimation | null = null

    void (async () => {
      try {
        const [mod, source] = await Promise.all([
          import('lottie-web/build/player/lottie_light'),
          loadSource(),
        ])
        // The overlay may already have been torn down - by the navigation
        // completing, or by the hard safety timeout in NavProgress. Either
        // way, do not mount a player into a detached node.
        if (cancelled) return
        // Clone before tinting: lottie-web annotates the data it is given,
        // so the shared cached copy must stay pristine.
        const data = tintToInk(JSON.parse(JSON.stringify(source)), host)
        animation = mod.default.loadAnimation({
          container: host,
          renderer: 'svg',
          loop: true,
          autoplay: true,
          animationData: data,
          rendererSettings: {
            viewBoxSize: VIEW_BOX_CROP,
            preserveAspectRatio: 'xMidYMid meet',
            progressiveLoad: true,
          },
        })
        setPlaying(true)
      } catch {
        // Chunk 404, offline, malformed JSON - the ring stays up and the
        // overlay still tears itself down on schedule. Nothing about the
        // navigation depends on this resolving.
      }
    })()

    return () => {
      cancelled = true
      animation?.destroy()
    }
  }, [])

  return (
    <div className="relative" style={{ width: BOX_PX, height: BOX_PX }}>
      <div ref={hostRef} className="absolute inset-0" aria-hidden="true" />
      {!playing && (
        /* Painted immediately, by CSS only, so the card is never empty
           while the player chunk is in flight. It is also the entire
           indicator under prefers-reduced-motion, where the global reduce
           rule in globals.css collapses the spin to a standing ring. */
        <svg
          viewBox="0 0 100 100"
          aria-hidden="true"
          className="absolute inset-0 h-full w-full animate-spin text-ink"
        >
          <circle
            cx="50"
            cy="50"
            r="38"
            fill="none"
            stroke="currentColor"
            strokeWidth="9"
            strokeLinecap="round"
            strokeDasharray="168 239"
          />
        </svg>
      )}
    </div>
  )
}
