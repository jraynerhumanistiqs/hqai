'use client'

// SlashCommand - Notion-style "/" menu for the DocEditor.
//
// Built on @tiptap/suggestion (an MIT Tiptap primitive) so the trigger,
// query matching and keyboard plumbing come for free, and rendered as a
// plain fixed-position popup positioned from the caret rect the suggestion
// utility hands us - no tippy.js / floating-ui dependency, keeping the
// lazy-loaded editor chunk lean.
//
// Every command maps to an extension DocEditor already loads, so the menu
// adds zero new document capabilities - it is just a faster keyboard-driven
// way to reach the same blocks the toolbar exposes.

import { Extension } from '@tiptap/core'
import type { Editor, Range } from '@tiptap/core'
import Suggestion from '@tiptap/suggestion'
import type { SuggestionOptions, SuggestionProps, SuggestionKeyDownProps } from '@tiptap/suggestion'
import { ReactRenderer } from '@tiptap/react'
import { useEffect, useState } from 'react'

interface SlashItem {
  title: string
  desc: string
  keywords: string
  run: (o: { editor: Editor; range: Range }) => void
}

// Shared handle the suggestion plugin uses to forward keydowns to the live
// React list. We deliberately do NOT lean on ReactRenderer's own `ref` - in
// the portal render path it can be null when the first keydown arrives - so
// the list writes its handler into this box every render instead.
type KbdHandler = (p: SuggestionKeyDownProps) => boolean
interface KbdRef { current: KbdHandler | null }

// The block palette. Order is the display order; keywords widen matching so
// "/ul" or "/points" both reach the bullet list, etc.
const ITEMS: SlashItem[] = [
  { title: 'Text', desc: 'Plain paragraph', keywords: 'paragraph body plain text',
    run: ({ editor, range }) => editor.chain().focus().deleteRange(range).setParagraph().run() },
  { title: 'Heading 1', desc: 'Large section title', keywords: 'h1 title big header',
    run: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleHeading({ level: 1 }).run() },
  { title: 'Heading 2', desc: 'Medium section title', keywords: 'h2 subtitle header',
    run: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleHeading({ level: 2 }).run() },
  { title: 'Heading 3', desc: 'Small section title', keywords: 'h3 header',
    run: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleHeading({ level: 3 }).run() },
  { title: 'Bullet list', desc: 'Simple bulleted list', keywords: 'unordered ul bullet points dot',
    run: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleBulletList().run() },
  { title: 'Numbered list', desc: 'Ordered 1. 2. 3. list', keywords: 'ordered ol numbered steps',
    run: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleOrderedList().run() },
  { title: 'Quote', desc: 'Indented block quote', keywords: 'blockquote citation callout',
    run: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleBlockquote().run() },
  { title: 'Table', desc: '3 x 3 table with header row', keywords: 'grid rows columns cells',
    run: ({ editor, range }) => editor.chain().focus().deleteRange(range).insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run() },
  { title: 'Divider', desc: 'Horizontal rule', keywords: 'hr separator line rule break',
    run: ({ editor, range }) => editor.chain().focus().deleteRange(range).setHorizontalRule().run() },
]

// -- The dropdown -------------------------------------------------
// Receives the live SuggestionProps (items + command) from ReactRenderer,
// plus the shared kbd box it keeps pointed at its current keydown handler.
type SlashListProps = SuggestionProps<SlashItem> & { kbd: KbdRef }

function SlashList({ items, command, kbd }: SlashListProps) {
  const [sel, setSel] = useState(0)

  // Reset the highlight to the top whenever the filtered set changes.
  useEffect(() => setSel(0), [items])

  // Keep the shared handler current: it closes over the latest items + sel
  // so arrow/enter always act on what the user sees.
  useEffect(() => {
    kbd.current = ({ event }) => {
      if (!items.length) return false
      if (event.key === 'ArrowDown') { setSel(s => (s + 1) % items.length); return true }
      if (event.key === 'ArrowUp')   { setSel(s => (s - 1 + items.length) % items.length); return true }
      if (event.key === 'Enter')     { command(items[sel]); return true }
      return false
    }
    return () => { kbd.current = null }
  }, [items, sel, command, kbd])

  if (!items.length) {
    return <div className="slash-menu"><div className="slash-empty">No matching blocks</div></div>
  }

  return (
    <div className="slash-menu" role="listbox" aria-label="Insert block">
      {items.map((item, i) => (
        <button
          key={item.title}
          type="button"
          role="option"
          aria-selected={i === sel}
          className={`slash-item${i === sel ? ' is-active' : ''}`}
          onMouseEnter={() => setSel(i)}
          // mousedown (not click) so the editor keeps focus and the range
          // delete lands on the right selection.
          onMouseDown={e => { e.preventDefault(); command(item) }}
        >
          <span className="slash-item-title">{item.title}</span>
          <span className="slash-item-desc">{item.desc}</span>
        </button>
      ))}
    </div>
  )
}

// -- The extension ------------------------------------------------
export const SlashCommand = Extension.create({
  name: 'slashCommand',

  addProseMirrorPlugins() {
    const suggestion: Omit<SuggestionOptions<SlashItem>, 'editor'> = {
      char: '/',
      // Execute the picked item. The suggestion util passes the chosen item
      // through as `props`.
      command: ({ editor, range, props }) => props.run({ editor, range }),
      items: ({ query }) => {
        const q = query.toLowerCase()
        if (!q) return ITEMS
        return ITEMS.filter(i => i.title.toLowerCase().includes(q) || i.keywords.includes(q))
      },
      render: () => {
        let renderer: ReactRenderer<unknown, SlashListProps>
        let popup: HTMLDivElement | null = null
        const kbd: KbdRef = { current: null }

        // Position the fixed popup from the caret rect. Flips above the caret
        // when it would overflow the bottom of the viewport.
        const place = (rect: DOMRect | null | undefined) => {
          if (!popup || !rect) return
          const gap = 6
          const h = popup.offsetHeight
          const below = rect.bottom + gap
          const flip = below + h > window.innerHeight && rect.top - gap - h > 0
          popup.style.left = `${Math.round(rect.left)}px`
          popup.style.top = `${Math.round(flip ? rect.top - gap - h : below)}px`
        }

        return {
          onStart: props => {
            renderer = new ReactRenderer(SlashList, {
              props: { ...props, kbd },
              editor: props.editor,
            })
            popup = document.createElement('div')
            popup.className = 'slash-popup'
            popup.appendChild(renderer.element)
            document.body.appendChild(popup)
            place(props.clientRect?.())
          },
          onUpdate: props => {
            renderer.updateProps({ ...props, kbd })
            place(props.clientRect?.())
          },
          onKeyDown: props => {
            if (props.event.key === 'Escape') { popup?.remove(); popup = null; return true }
            return kbd.current?.(props) ?? false
          },
          onExit: () => {
            popup?.remove()
            popup = null
            renderer?.destroy()
          },
        }
      },
    }

    return [Suggestion({ editor: this.editor, ...suggestion })]
  },
})
