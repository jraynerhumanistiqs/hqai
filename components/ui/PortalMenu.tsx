'use client'

// PortalMenu - an anchored dropdown that renders into document.body.
//
// Why a portal rather than a plain `absolute` child: the per-row actions
// menus in HQ Recruit sit inside containers that clip. A role row lives in
// a list with `overflow-hidden` (needed so the rounded corners clip the row
// hover fill), and that list can itself sit inside the role-switcher popup,
// which is `overflow-y-auto`. An absolutely-positioned menu is cut off by
// whichever ancestor clips first - the bug where the Edit/Delete menu was
// sliced in half by the bottom of the container.
//
// Positioning is `fixed`, computed from the trigger's bounding rect, so no
// ancestor's overflow or stacking context can reach it. The menu flips above
// the trigger when there isn't room below, and shifts horizontally to stay
// on screen.

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

interface Props {
  open: boolean
  /** The trigger the menu is anchored to. */
  anchorRef: React.RefObject<HTMLElement | null>
  /** Called on outside click, Escape, or an ancestor scroll. */
  onClose: () => void
  /** Which edge of the trigger the menu aligns to. */
  align?: 'left' | 'right'
  /** Menu width in px - needed up front to align the right edge. */
  width?: number
  'aria-label'?: string
  children: React.ReactNode
}

const MARGIN = 8

export default function PortalMenu({
  open,
  anchorRef,
  onClose,
  align = 'right',
  width = 144,
  children,
  ...rest
}: Props) {
  const menuRef = useRef<HTMLDivElement | null>(null)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  // Portals need a DOM target, which does not exist during SSR.
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  // Measure before paint so the menu never flashes at the wrong spot.
  useLayoutEffect(() => {
    if (!open) { setPos(null); return }
    function place() {
      const anchor = anchorRef.current
      if (!anchor) return
      const r = anchor.getBoundingClientRect()
      const h = menuRef.current?.offsetHeight ?? 0
      const below = window.innerHeight - r.bottom
      // Flip above when the menu would run off the bottom of the viewport.
      const top = (h && below < h + MARGIN && r.top > h + MARGIN)
        ? r.top - h - 4
        : r.bottom + 4
      const rawLeft = align === 'right' ? r.right - width : r.left
      const left = Math.max(MARGIN, Math.min(rawLeft, window.innerWidth - width - MARGIN))
      setPos({ top, left })
    }
    place()
    // Re-place once more after the menu has real height, so the flip
    // decision uses a measured height rather than 0 on first open.
    const raf = requestAnimationFrame(place)
    window.addEventListener('resize', place)
    // `true` catches scrolls on any ancestor, not just the window - the
    // menu is fixed, so it must follow a scrolling list or it detaches.
    window.addEventListener('scroll', place, true)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [open, anchorRef, align, width])

  useEffect(() => {
    if (!open) return
    function onDocPointer(e: MouseEvent) {
      const t = e.target as Node
      if (menuRef.current?.contains(t)) return
      if (anchorRef.current?.contains(t)) return   // let the trigger toggle
      onClose()
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { onClose(); anchorRef.current?.focus() }
    }
    document.addEventListener('mousedown', onDocPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, onClose, anchorRef])

  if (!open || !mounted) return null

  return createPortal(
    <div
      ref={menuRef}
      role="menu"
      aria-label={rest['aria-label']}
      onClick={e => e.stopPropagation()}
      style={{
        position: 'fixed',
        top: pos?.top ?? -9999,
        left: pos?.left ?? -9999,
        width,
        // Above the sidebar (z-40) and the role switcher (z-30).
        zIndex: 60,
        visibility: pos ? 'visible' : 'hidden',
      }}
      className="rounded-xl border border-border bg-bg-elevated py-1 shadow-modal"
    >
      {children}
    </div>,
    document.body,
  )
}
