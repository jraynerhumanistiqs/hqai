'use client'

// DocEditor - Word-level rich text editor for AI Administrator documents.
//
// Powered by TipTap (ProseMirror) so we get the same family of editing
// primitives Notion / Google Docs / Word offer (block-level structured
// editing, not raw contenteditable). The toolbar exposes the formatting
// the founder called out: bold / italic / underline, bullet + numbered
// lists, heading levels, font size, image insert + resize, tables,
// links, alignment, undo / redo.
//
// Page-level controls (header text, footer text, A4/Letter, margins) sit
// outside the editor in a separate band so they map cleanly to the
// print stylesheet driving the PDF export. The exported HTML from
// `editor.getHTML()` is concatenated with the header/footer at PDF
// render time (see app/api/administrator/documents/[id]/render-html).

import { useEditor, EditorContent, type Editor } from '@tiptap/react'
import { StarterKit } from '@tiptap/starter-kit'
import { Image } from '@tiptap/extension-image'
import { Link } from '@tiptap/extension-link'
import { Underline } from '@tiptap/extension-underline'
import { TextStyle, FontSize as TiptapFontSize } from '@tiptap/extension-text-style'
import { TextAlign } from '@tiptap/extension-text-align'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableHeader } from '@tiptap/extension-table-header'
import { TableCell } from '@tiptap/extension-table-cell'
import { Placeholder } from '@tiptap/extension-placeholder'
import { useEffect, useImperativeHandle, forwardRef, useRef, useState, useCallback } from 'react'

// FontSize ships with @tiptap/extension-text-style in v3.

// -- Resizable image node view --------------------------------------
// TipTap's stock Image extension renders a static <img>. To get the
// Word-style "drag the handle to resize" behaviour, we extend it with
// a width attribute and a custom node view that draws drag handles in
// each corner.
const ResizableImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: { default: null, parseHTML: el => (el as HTMLElement).style.width || (el as HTMLImageElement).getAttribute('width'), renderHTML: a => a.width ? { style: `width: ${a.width}` } : {} },
      alignment: { default: 'left', parseHTML: el => (el as HTMLElement).style.float || 'left', renderHTML: a => a.alignment && a.alignment !== 'left' ? { style: `float: ${a.alignment}` } : {} },
    }
  },
})

// -- Editor handle exposed to the parent ---------------------------
export interface DocEditorHandle {
  getHTML: () => string
  getPageSettings: () => PageSettings
  focus: () => void
}

export interface PageSettings {
  size: 'A4' | 'Letter'
  marginTopMm: number
  marginRightMm: number
  marginBottomMm: number
  marginLeftMm: number
  headerHtml: string
  footerHtml: string
}

const DEFAULT_SETTINGS: PageSettings = {
  size: 'A4',
  marginTopMm: 24,
  marginRightMm: 22,
  marginBottomMm: 24,
  marginLeftMm: 22,
  headerHtml: '',
  footerHtml: '',
}

interface Props {
  initialHtml: string
  initialSettings?: Partial<PageSettings>
  onChange?: (html: string) => void
}

const DocEditor = forwardRef<DocEditorHandle, Props>(function DocEditor(
  { initialHtml, initialSettings, onChange },
  ref,
) {
  const [settings, setSettings] = useState<PageSettings>({ ...DEFAULT_SETTINGS, ...(initialSettings ?? {}) })
  const [linkOpen, setLinkOpen] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const [showPageMenu, setShowPageMenu] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4] },
        // StarterKit's bullet + ordered lists are on by default.
      }),
      Underline,
      Link.configure({ openOnClick: false, HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' } }),
      TextStyle,
      TiptapFontSize,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      ResizableImage.configure({ inline: false, allowBase64: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      Placeholder.configure({ placeholder: 'Start typing or paste the AI draft above to begin editing...' }),
    ],
    content: initialHtml || '<p></p>',
    immediatelyRender: false,
    onUpdate: ({ editor }) => onChange?.(editor.getHTML()),
  })

  useEffect(() => {
    if (!editor) return
    if (initialHtml && editor.getHTML() !== initialHtml) {
      editor.commands.setContent(initialHtml, { emitUpdate: false })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialHtml, editor])

  useImperativeHandle(ref, () => ({
    getHTML: () => editor?.getHTML() ?? initialHtml,
    getPageSettings: () => settings,
    focus: () => editor?.commands.focus(),
  }), [editor, initialHtml, settings])

  const insertImage = useCallback((file: File) => {
    if (!editor) return
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      editor.chain().focus().setImage({ src: dataUrl, alt: file.name } as { src: string; alt?: string }).run()
    }
    reader.readAsDataURL(file)
  }, [editor])

  const applyLink = useCallback(() => {
    if (!editor) return
    if (!linkUrl) { editor.chain().focus().unsetLink().run() }
    else { editor.chain().focus().extendMarkRange('link').setLink({ href: linkUrl }).run() }
    setLinkOpen(false)
    setLinkUrl('')
  }, [editor, linkUrl])

  if (!editor) {
    return <div className="text-xs text-ink-muted p-6">Loading editor...</div>
  }

  // Grid layout with explicit auto rows for the toolbar / optional
  // settings bands and a final 1fr row for the editor canvas. This
  // gives the canvas a fully-resolved height inside whatever parent
  // the editor is mounted in (modal grid cell, full-page route, etc.)
  // so the inner overflow-y-auto pane always knows when to scroll.
  // The flex flex-col chain previously here was failing to clamp when
  // ProseMirror's intrinsic content was taller than the viewport.
  const gridRows = [
    'auto', // toolbar
    showPageMenu ? 'auto' : null,
    linkOpen     ? 'auto' : null,
    '1fr',  // editor canvas
  ].filter(Boolean).join(' ')

  return (
    <div className="grid h-full max-h-full" style={{ gridTemplateRows: gridRows }}>
      {/* Tailwind's preflight strips list-style + padding from <ul>
          and <ol>, which made the bullet / numbered list buttons in
          the toolbar look like no-ops (the editor inserted real list
          DOM but the markers + indentation were hidden). Re-apply
          inside the editor page only so the rest of the marketing
          chrome isn't affected. Same fix for blockquote, headings,
          tables and resizable images.
          Fix #5 (M2): hardcoded hex -> CSS vars. */}
      <style>{`
        .doc-editor-page .ProseMirror { outline: none; }
        .doc-editor-page .ProseMirror p { margin: 0 0 8px; }
        .doc-editor-page .ProseMirror ul {
          list-style: disc;
          padding-left: 1.5rem;
          margin: 0 0 12px;
        }
        .doc-editor-page .ProseMirror ol {
          list-style: decimal;
          padding-left: 1.5rem;
          margin: 0 0 12px;
        }
        .doc-editor-page .ProseMirror ul ul { list-style: circle; }
        .doc-editor-page .ProseMirror ul ul ul { list-style: square; }
        .doc-editor-page .ProseMirror li { margin: 0 0 4px; }
        .doc-editor-page .ProseMirror li > p { margin: 0; }
        .doc-editor-page .ProseMirror h1 { font-size: 22px; font-weight: 700; margin: 18px 0 10px; }
        .doc-editor-page .ProseMirror h2 { font-size: 18px; font-weight: 700; margin: 16px 0 8px; }
        .doc-editor-page .ProseMirror h3 { font-size: 16px; font-weight: 700; margin: 14px 0 6px; }
        .doc-editor-page .ProseMirror h4 { font-size: 15px; font-weight: 700; margin: 12px 0 4px; }
        .doc-editor-page .ProseMirror blockquote {
          border-left: 3px solid var(--border);
          padding-left: 12px;
          color: var(--ink-muted);
          margin: 0 0 12px;
        }
        .doc-editor-page .ProseMirror hr {
          border: 0;
          border-top: 1px solid var(--border);
          margin: 16px 0;
        }
        .doc-editor-page .ProseMirror table {
          border-collapse: collapse;
          width: 100%;
          margin: 0 0 12px;
        }
        .doc-editor-page .ProseMirror table td,
        .doc-editor-page .ProseMirror table th {
          border: 1px solid var(--border);
          padding: 6px 10px;
          vertical-align: top;
        }
        .doc-editor-page .ProseMirror table th { background: var(--bg-soft); font-weight: 700; }
        .doc-editor-page .ProseMirror img {
          max-width: 100%;
          height: auto;
          display: block;
          margin: 8px 0;
        }
        .doc-editor-page .ProseMirror .is-editor-empty:first-child::before {
          color: var(--ink-muted);
          content: attr(data-placeholder);
          float: left;
          height: 0;
          pointer-events: none;
        }
      `}</style>
      <Toolbar
        editor={editor}
        onInsertImage={() => fileInputRef.current?.click()}
        onOpenLink={() => { setLinkUrl(editor.getAttributes('link').href ?? ''); setLinkOpen(true) }}
        onTogglePageMenu={() => setShowPageMenu(v => !v)}
      />
      {showPageMenu && (
        <PageSettingsBar
          settings={settings}
          onChange={setSettings}
          onClose={() => setShowPageMenu(false)}
        />
      )}
      {linkOpen && (
        <div className="flex items-center gap-2 px-4 py-2 bg-bg-soft border-b border-border text-xs">
          <span className="text-ink-muted">URL:</span>
          <input
            value={linkUrl}
            onChange={e => setLinkUrl(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') applyLink() }}
            placeholder="https://..."
            className="flex-1 bg-bg-elevated border border-border rounded px-2 py-1 text-ink focus:outline-none focus:border-ink"
          />
          <button onClick={applyLink} className="font-bold text-ink hover:text-accent">{linkUrl ? 'Apply' : 'Remove'}</button>
          <button onClick={() => setLinkOpen(false)} className="text-ink-muted">Cancel</button>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => {
          const f = e.target.files?.[0]
          if (f) insertImage(f)
          e.currentTarget.value = ''
        }}
      />

      {/* The page canvas - A4 width + dynamic margins. The header/
          footer bands are pinned above/below the editor body so the
          recruiter can see them while editing, even though in the PDF
          they sit inside the page margins.

          min-h-0 + items-start is critical: without min-h-0 the flex
          child grows to fit the 297mm A4 page and the overflow-y-auto
          never engages. items-start keeps the page top-aligned so the
          scroll starts at the top of the document, not the centre. */}
      <div className="min-h-0 overflow-y-auto bg-bg-soft p-4 sm:p-6 scrollbar-thin flex justify-center items-start">
        <div
          className="bg-white shadow-card rounded-sm doc-editor-page"
          style={{
            width:    settings.size === 'A4' ? '210mm' : '216mm',
            minHeight: settings.size === 'A4' ? '297mm' : '279mm',
            maxWidth: '100%',
            paddingTop:    `${settings.marginTopMm}mm`,
            paddingRight:  `${settings.marginRightMm}mm`,
            paddingBottom: `${settings.marginBottomMm}mm`,
            paddingLeft:   `${settings.marginLeftMm}mm`,
          }}
        >
          {settings.headerHtml && (
            <div
              className="border-b border-border pb-2 mb-4 text-[11px] text-ink-soft"
              contentEditable
              suppressContentEditableWarning
              onBlur={e => setSettings(s => ({ ...s, headerHtml: (e.currentTarget as HTMLElement).innerHTML }))}
              dangerouslySetInnerHTML={{ __html: settings.headerHtml }}
            />
          )}
          <EditorContent editor={editor} className="prose prose-sm max-w-none focus:outline-none [&_*]:outline-none" />
          {settings.footerHtml && (
            <div
              className="border-t border-border pt-2 mt-6 text-[11px] text-ink-soft"
              contentEditable
              suppressContentEditableWarning
              onBlur={e => setSettings(s => ({ ...s, footerHtml: (e.currentTarget as HTMLElement).innerHTML }))}
              dangerouslySetInnerHTML={{ __html: settings.footerHtml }}
            />
          )}
        </div>
      </div>
    </div>
  )
})

export default DocEditor

// -- Toolbar -------------------------------------------------------
const FONT_SIZES = ['10px', '11px', '12px', '14px', '16px', '18px', '20px', '24px', '32px']

function Toolbar({ editor, onInsertImage, onOpenLink, onTogglePageMenu }: {
  editor: Editor
  onInsertImage: () => void
  onOpenLink: () => void
  onTogglePageMenu: () => void
}) {
  const isActive = (name: string, attrs?: Record<string, unknown>) => editor.isActive(name, attrs)
  // Fix #2 (H3 touch): bump button hit-area toward 44px on touch via min-h-touch.
  // min-w-[28px] is kept for narrow glyphs; min-h-touch handles the vertical tap target.
  const btn = (active: boolean) =>
    `inline-flex items-center justify-center min-w-[28px] min-h-touch px-2 rounded text-xs font-bold transition-colors ` +
    (active ? 'bg-ink text-bg-elevated' : 'text-ink hover:bg-bg-soft')

  return (
    // Fix #2 (H3 touch): overflow-x-auto flex-nowrap on mobile so buttons don't wrap below usable size.
    <div className="flex flex-nowrap overflow-x-auto items-center gap-1 px-3 py-2 bg-bg-elevated border-b border-border sticky top-0 z-10 scrollbar-thin">
      {/* Undo / Redo - Fix #3 (H10 a11y): aria-label on glyph buttons */}
      <button title="Undo" aria-label="Undo" className={btn(false)} onClick={() => editor.chain().focus().undo().run()}>&#8630;</button>
      <button title="Redo" aria-label="Redo" className={btn(false)} onClick={() => editor.chain().focus().redo().run()}>&#8631;</button>
      <Sep />

      {/* Heading level */}
      <select
        value={isActive('heading', { level: 1 }) ? '1' : isActive('heading', { level: 2 }) ? '2' : isActive('heading', { level: 3 }) ? '3' : isActive('heading', { level: 4 }) ? '4' : 'p'}
        onChange={e => {
          const v = e.target.value
          if (v === 'p') editor.chain().focus().setParagraph().run()
          else editor.chain().focus().toggleHeading({ level: Number(v) as 1 | 2 | 3 | 4 }).run()
        }}
        className="h-7 bg-bg-elevated border border-border rounded px-1 text-xs font-bold text-ink focus:outline-none focus:border-ink"
        title="Block type"
      >
        <option value="p">Body</option>
        <option value="1">Heading 1</option>
        <option value="2">Heading 2</option>
        <option value="3">Heading 3</option>
        <option value="4">Heading 4</option>
      </select>

      {/* Font size */}
      <select
        defaultValue=""
        onChange={e => {
          const v = e.target.value
          if (!v) editor.chain().focus().unsetMark('textStyle').run()
          else (editor.chain().focus() as unknown as { setFontSize: (s: string) => { run: () => void } }).setFontSize(v).run()
        }}
        className="h-7 bg-bg-elevated border border-border rounded px-1 text-xs font-bold text-ink focus:outline-none focus:border-ink"
        title="Font size"
      >
        <option value="">Size</option>
        {FONT_SIZES.map(s => <option key={s} value={s}>{s.replace('px', '')}</option>)}
      </select>

      <Sep />

      {/* Inline marks - Fix #3 (H10 a11y): aria-label on all glyph buttons */}
      <button title="Bold (Ctrl+B)"      aria-label="Bold"          className={btn(isActive('bold'))}      onClick={() => editor.chain().focus().toggleBold().run()}><b>B</b></button>
      <button title="Italic (Ctrl+I)"    aria-label="Italic"        className={btn(isActive('italic'))}    onClick={() => editor.chain().focus().toggleItalic().run()}><i>I</i></button>
      <button title="Underline (Ctrl+U)" aria-label="Underline"     className={btn(isActive('underline'))} onClick={() => editor.chain().focus().toggleUnderline().run()}><u>U</u></button>
      <button title="Strikethrough"      aria-label="Strikethrough" className={btn(isActive('strike'))}    onClick={() => editor.chain().focus().toggleStrike().run()}><s>S</s></button>

      <Sep />

      {/* Lists */}
      <button title="Bullet list"  aria-label="Bullet list"   className={btn(isActive('bulletList'))}  onClick={() => editor.chain().focus().toggleBulletList().run()}>&#8226;</button>
      <button title="Numbered list" aria-label="Numbered list" className={btn(isActive('orderedList'))} onClick={() => editor.chain().focus().toggleOrderedList().run()}>1.</button>
      <button title="Blockquote"   aria-label="Blockquote"    className={btn(isActive('blockquote'))}  onClick={() => editor.chain().focus().toggleBlockquote().run()}>&ldquo;&rdquo;</button>

      <Sep />

      {/* Align */}
      <button title="Align left"   aria-label="Align left"   className={btn(isActive({ textAlign: 'left' }))}    onClick={() => editor.chain().focus().setTextAlign('left').run()}>L</button>
      <button title="Align centre" aria-label="Align centre" className={btn(isActive({ textAlign: 'center' }))}  onClick={() => editor.chain().focus().setTextAlign('center').run()}>C</button>
      <button title="Align right"  aria-label="Align right"  className={btn(isActive({ textAlign: 'right' }))}   onClick={() => editor.chain().focus().setTextAlign('right').run()}>R</button>
      <button title="Justify"      aria-label="Justify"      className={btn(isActive({ textAlign: 'justify' }))} onClick={() => editor.chain().focus().setTextAlign('justify').run()}>J</button>

      <Sep />

      {/* Insert */}
      <button title="Insert image"      aria-label="Insert image"      className={btn(false)} onClick={onInsertImage}>&#128444;</button>
      <button title="Insert link"       aria-label="Insert link"       className={btn(isActive('link'))} onClick={onOpenLink}>&#128279;</button>
      <button title="Insert table"      aria-label="Insert table"      className={btn(false)} onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}>&#8862;</button>
      <button title="Horizontal rule"   aria-label="Horizontal rule"   className={btn(false)} onClick={() => editor.chain().focus().setHorizontalRule().run()}>&#9135;</button>

      <Sep />

      {/* Image resize - works on selected image */}
      {isActive('image') && (
        <>
          <span className="text-[10px] font-bold text-ink-muted px-1">Image:</span>
          {[200, 300, 450, 600].map(w => (
            <button
              key={w}
              title={`Resize to ${w}px`}
              aria-label={`Resize image to ${w}px`}
              className={btn(false)}
              onClick={() => editor.chain().focus().updateAttributes('image', { width: `${w}px` }).run()}
            >
              {w}px
            </button>
          ))}
          <Sep />
        </>
      )}

      <button title="Page setup" aria-label="Page setup" className={btn(false)} onClick={onTogglePageMenu}>Page setup</button>
    </div>
  )
}

function Sep() {
  return <span className="inline-block w-px h-5 bg-border mx-1 flex-shrink-0" />
}

// -- Page settings panel -------------------------------------------
function PageSettingsBar({ settings, onChange, onClose }: {
  settings: PageSettings
  onChange: (next: PageSettings) => void
  onClose: () => void
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 px-4 py-3 bg-bg-soft border-b border-border text-xs">
      <div className="space-y-1">
        <label className="block text-[10px] font-bold uppercase tracking-wider text-ink-muted">Page size</label>
        <select
          value={settings.size}
          onChange={e => onChange({ ...settings, size: e.target.value as 'A4' | 'Letter' })}
          className="w-full bg-bg-elevated border border-border rounded px-2 py-1 text-ink"
        >
          <option value="A4">A4 (210 x 297 mm)</option>
          <option value="Letter">Letter (216 x 279 mm)</option>
        </select>
      </div>

      <div>
        <label className="block text-[10px] font-bold uppercase tracking-wider text-ink-muted mb-1">Margins (mm)</label>
        <div className="grid grid-cols-4 gap-1">
          {([
            ['Top',    'marginTopMm'],
            ['Right',  'marginRightMm'],
            ['Bottom', 'marginBottomMm'],
            ['Left',   'marginLeftMm'],
          ] as const).map(([label, key]) => (
            <div key={key}>
              <p className="text-[9px] text-ink-muted">{label}</p>
              <input
                type="number"
                min={0}
                max={60}
                value={settings[key]}
                onChange={e => onChange({ ...settings, [key]: Math.max(0, Math.min(60, Number(e.target.value) || 0)) })}
                className="w-full bg-bg-elevated border border-border rounded px-1.5 py-1 text-ink text-center text-xs"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => onChange({ ...settings, headerHtml: settings.headerHtml ? '' : '<p>Header text</p>' })}
          className="bg-bg-elevated border border-border rounded px-2 py-1 text-ink font-bold hover:bg-bg"
        >
          {settings.headerHtml ? 'Remove header' : 'Add header'}
        </button>
        <button
          onClick={() => onChange({ ...settings, footerHtml: settings.footerHtml ? '' : '<p>Footer text</p>' })}
          className="bg-bg-elevated border border-border rounded px-2 py-1 text-ink font-bold hover:bg-bg"
        >
          {settings.footerHtml ? 'Remove footer' : 'Add footer'}
        </button>
        <button onClick={onClose} className="col-span-2 text-ink-muted hover:text-ink">Done</button>
      </div>
    </div>
  )
}
