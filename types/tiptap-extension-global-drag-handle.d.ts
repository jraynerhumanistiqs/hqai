// Ambient module declaration for tiptap-extension-global-drag-handle.
//
// The package ships no type definitions. We only need the default export
// (a Tiptap Extension) and its configure() option shape to type the
// DocEditor call site, so declare exactly that. Mirrors the existing shim
// in types/docxtemplater-image-module-free.d.ts.
declare module 'tiptap-extension-global-drag-handle' {
  import type { Extension } from '@tiptap/core'

  export interface GlobalDragHandleOptions {
    /** Width (px) of the hover zone that reveals the handle. */
    dragHandleWidth?: number
    /** Distance (px) from the viewport edge that triggers auto-scroll while dragging. */
    scrollTreshold?: number
    /** CSS selector for a custom handle element instead of the built-in one. */
    dragHandleSelector?: string
    /** HTML tags the handle should never attach to. */
    excludedTags?: string[]
    /** Custom node type names that should be draggable. */
    customNodes?: string[]
  }

  const GlobalDragHandle: Extension<GlobalDragHandleOptions>
  export default GlobalDragHandle
}
