'use client'
import { useRef, useCallback } from 'react'

// Modal-backdrop click handler that doesn't fire when the user is
// finishing a text selection. The old pattern was:
//
//   <div onClick={onClose}>           // backdrop
//     <div onClick={stop}>...</div>   // modal body
//   </div>
//
// which closes the modal on mouseup outside the body - including when
// the user drags a text selection from inside the body to outside.
//
// This helper returns onMouseDown + onClick handlers to spread on the
// backdrop. It only triggers onClose when BOTH the mousedown AND the
// mouseup landed on the backdrop element itself (target === currentTarget).
// Drag-out-of-modal selections start with target === body, so they
// don't satisfy the condition.

export function useBackdropClose(onClose: () => void) {
  const downOnBackdropRef = useRef(false)

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    downOnBackdropRef.current = e.target === e.currentTarget
  }, [])

  const onClick = useCallback((e: React.MouseEvent) => {
    if (downOnBackdropRef.current && e.target === e.currentTarget) {
      onClose()
    }
    downOnBackdropRef.current = false
  }, [onClose])

  return { onMouseDown, onClick }
}
