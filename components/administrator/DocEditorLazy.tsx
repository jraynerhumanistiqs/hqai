'use client'

// Lazy wrapper around DocEditor.
//
// TipTap (the ProseMirror-based rich-text engine behind DocEditor) plus its
// 11 extensions is the single heaviest client dependency in the app. Loading
// it eagerly meant /dashboard/documents and the AI Administrator page shipped
// the entire editor in their initial JS bundle - before the user had even
// opened a document.
//
// React.lazy + Suspense defers the editor chunk until it actually renders,
// and forwardRef threads the DocEditorHandle ref (getHTML / getPageSettings /
// focus) straight through to the real editor - so this is a drop-in
// replacement for the static import and document saving keeps working
// unchanged. A skeleton fills the space while the chunk loads (no layout
// shift; the editor sits inside a fixed-height container in both callers).
import { lazy, Suspense, forwardRef } from 'react'
import type { DocEditorHandle, DocEditorProps } from './DocEditor'
import EditorSkeleton from './EditorSkeleton'

const LazyDocEditor = lazy(() => import('./DocEditor'))

const DocEditorLazy = forwardRef<DocEditorHandle, DocEditorProps>(function DocEditorLazy(props, ref) {
  return (
    <Suspense fallback={<EditorSkeleton />}>
      <LazyDocEditor {...props} ref={ref} />
    </Suspense>
  )
})

export default DocEditorLazy
export type { DocEditorHandle, PageSettings } from './DocEditor'
