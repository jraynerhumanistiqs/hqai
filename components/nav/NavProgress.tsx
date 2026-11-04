'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { usePathname } from 'next/navigation'
import { useLinkStatus } from 'next/link'
import NavProgressArt from './NavProgressArt'

/**
 * Dashboard route-transition indicator.
 *
 * ---------------------------------------------------------------------------
 * READ THIS BEFORE "SIMPLIFYING" ANY OF IT
 * ---------------------------------------------------------------------------
 * CLAUDE.md: "Content must NEVER depend on an animation completing to be
 * visible." This overlay sits on top of the whole dashboard, so if it ever
 * failed to tear itself down the app would read as blank or frozen - the
 * exact failure that has already bitten HeroSection, AdaptiveSlider and
 * InlineAction. Three rules follow, and all three are load-bearing:
 *
 *   1. Visibility is owned by this component's state and by setTimeout only.
 *      It is NEVER keyed off an animation event - no onComplete, no
 *      onLoopComplete, no requestAnimationFrame. Timers still fire in a
 *      background tab (throttled, but they fire); rAF does not. Hiding on a
 *      Lottie callback would strand the overlay over the app the moment the
 *      user switched tabs mid-navigation.
 *   2. The route committing is the success path: the `pathname` effect below
 *      hides it. The player is irrelevant to that - the overlay goes away
 *      whether or not the animation ever loaded, let alone finished.
 *   3. MAX_VISIBLE_MS is a hard backstop that tears the overlay down even if
 *      nothing else fires - a navigation that errors, is aborted or hangs.
 *      It is not a nicety; it is what guarantees the app cannot be left
 *      sitting under a stuck overlay.
 *
 * And because "cannot get stuck" is not worth betting the UI on: the overlay
 * root is `pointer-events-none` and contains nothing interactive, so even in
 * a world where it does linger it cannot swallow a single click.
 * ---------------------------------------------------------------------------
 *
 * WHAT TRIGGERS IT - two sources, one state machine:
 *
 *   a) A capture-phase click listener on `document`, which catches EVERY
 *      internal link in the dashboard: the sidebar, the home page tiles,
 *      in-page links inside the recruit flow, anything server-rendered. No
 *      per-link wiring, so a new link cannot forget to opt in.
 *   b) `useLinkStatus()` - Next 16's per-link pending state - via
 *      <NavLinkBeacon />, mounted inside the sidebar links. Verified to work
 *      here: in the App Router layer Next aliases `next/link` to
 *      next/dist/client/app-dir/link, which drives real pending state. The
 *      pages-router module hardcodes `pending: false`, so that alias is what
 *      makes the hook work at all. It earns its place by reporting the END of
 *      a navigation as well - including one that resolves back to the route
 *      we are already on, which (a) cannot see.
 *
 * Navigations are version-stamped, so a stale `end()` from (b) cannot cancel
 * the indicator for a navigation the user has since started.
 */

// Deliberate delay. Most dashboard routes commit inside ~100ms, and flashing
// a spinner for 100ms looks like a bug. Only genuinely slow navigations ever
// paint.
const SHOW_DELAY_MS = 180

// Hard teardown, measured from the moment the overlay becomes visible. Six
// seconds is one full loop of the asset and far longer than any healthy
// dashboard navigation; past that something has gone wrong and the user is
// better off seeing the app than a spinner. The destination content never
// depended on this overlay, so dropping it early only ever reveals the UI.
const MAX_VISIBLE_MS = 6000

type NavProgressApi = {
  /** Arms the indicator. Returns a stamp identifying this navigation. */
  begin: () => number
  /**
   * Hides the indicator. Pass the stamp from `begin()` and the call is
   * ignored if a newer navigation has started since.
   */
  end: (navId?: number) => void
}

const NOOP_API: NavProgressApi = { begin: () => 0, end: () => {} }

const NavProgressContext = createContext<NavProgressApi | null>(null)

/**
 * Falls back to a no-op outside the provider, so <NavLinkBeacon /> stays safe
 * in components (the sidebar) that could be rendered outside the dashboard.
 */
export function useNavProgress(): NavProgressApi {
  return useContext(NavProgressContext) ?? NOOP_API
}

/**
 * Reports one <Link>'s pending state up to the provider. Renders nothing, and
 * must be a CHILD of the Link whose status it reports - that is how
 * useLinkStatus reads its context.
 */
export function NavLinkBeacon() {
  const { pending } = useLinkStatus()
  const { begin, end } = useNavProgress()
  const stamp = useRef<number | null>(null)

  useEffect(() => {
    if (pending) {
      stamp.current = begin()
      return
    }
    if (stamp.current !== null) {
      const id = stamp.current
      stamp.current = null
      // Pending went true -> false: the navigation finished, errored or was
      // abandoned. Either way there is nothing left to wait for.
      end(id)
    }
  }, [pending, begin, end])

  return null
}

export default function NavProgressProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [visible, setVisible] = useState(false)
  const visibleRef = useRef(false)
  const showTimer = useRef<number | null>(null)
  const killTimer = useRef<number | null>(null)
  const navId = useRef(0)

  const clearTimers = useCallback(() => {
    if (showTimer.current !== null) {
      window.clearTimeout(showTimer.current)
      showTimer.current = null
    }
    if (killTimer.current !== null) {
      window.clearTimeout(killTimer.current)
      killTimer.current = null
    }
  }, [])

  const hide = useCallback(() => {
    clearTimers()
    if (visibleRef.current) {
      visibleRef.current = false
      setVisible(false)
    }
  }, [clearTimers])

  const begin = useCallback(() => {
    navId.current += 1
    // Re-arm from scratch. A second click during a slow navigation restarts
    // both clocks, which is right: it is a new navigation.
    clearTimers()
    showTimer.current = window.setTimeout(() => {
      showTimer.current = null
      visibleRef.current = true
      setVisible(true)
      killTimer.current = window.setTimeout(hide, MAX_VISIBLE_MS)
    }, SHOW_DELAY_MS)
    return navId.current
  }, [clearTimers, hide])

  const end = useCallback(
    (id?: number) => {
      if (id !== undefined && id !== navId.current) return
      hide()
    },
    [hide],
  )

  // THE success path: the destination route has committed, so stop. Runs on
  // mount too, which is harmless - hide() is a no-op when nothing is armed.
  useEffect(() => {
    hide()
  }, [pathname, hide])

  // Catches every internal link in the dashboard, including the ones rendered
  // on the server (home tiles, recruit lists) that cannot host a
  // useLinkStatus hook. Capture phase, so it runs before <Link> swallows the
  // event with preventDefault().
  useEffect(() => {
    function onDocumentClick(event: MouseEvent) {
      // Primary button only, and not a modified click - cmd/ctrl/shift/alt
      // clicks open a new tab or window, they do not navigate this one.
      if (event.button !== 0) return
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return

      const target = event.target
      if (!(target instanceof Element)) return
      const anchor = target.closest('a[href]')
      if (!(anchor instanceof HTMLAnchorElement)) return
      if (anchor.hasAttribute('download')) return

      const explicitTarget = anchor.getAttribute('target')
      if (explicitTarget && explicitTarget !== '_self') return

      let url: URL
      try {
        url = new URL(anchor.href, window.location.href)
      } catch {
        return
      }
      if (url.origin !== window.location.origin) return
      // Same path means there is no route transition to wait for: hash links,
      // query-only links (the recruit role switcher, filter tabs) and the tab
      // the user is already on. Arming for those would leave the overlay up
      // until the safety timeout for no reason.
      if (url.pathname === window.location.pathname) return

      begin()
    }

    document.addEventListener('click', onDocumentClick, true)
    return () => document.removeEventListener('click', onDocumentClick, true)
  }, [begin])

  // Unmount (eg. signing out) must not leave timers behind.
  useEffect(() => clearTimers, [clearTimers])

  const api = useMemo<NavProgressApi>(() => ({ begin, end }), [begin, end])

  return (
    <NavProgressContext.Provider value={api}>
      {children}
      {visible && <NavProgressOverlay />}
    </NavProgressContext.Provider>
  )
}

function NavProgressOverlay() {
  return (
    <div
      // pointer-events-none here AND nothing interactive inside: a lingering
      // overlay must never be able to trap a click. Do not add a dismiss
      // button or a backdrop click handler - that would undo it.
      // z-[80] clears the modal (z-50) and the mobile drawer (z-40) and stays
      // under the sidebar tooltip portal (z-[100]).
      className="pointer-events-none fixed inset-0 z-[80] flex items-center justify-center animate-in fade-in duration-150"
      role="status"
      aria-live="polite"
    >
      {/* Scrim. color-mix rather than a Tailwind alpha modifier: every colour
          token is a bare var(), and v3 alpha modifiers need channel triplets,
          so `bg-bg/70` would emit no CSS at all. A browser that cannot parse
          color-mix simply drops the declaration and the card still reads. */}
      <div
        className="absolute inset-0 backdrop-blur-[2px]"
        style={{ backgroundColor: 'color-mix(in srgb, var(--bg) 72%, transparent)' }}
      />
      <div className="relative flex flex-col items-center gap-3 rounded-3xl border border-border bg-bg-elevated px-9 py-8 shadow-modal">
        <NavProgressArt />
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-muted">
          Loading
        </p>
      </div>
    </div>
  )
}
