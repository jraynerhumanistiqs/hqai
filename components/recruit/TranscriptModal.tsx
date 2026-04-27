'use client'
import { useEffect, useState } from 'react'
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx'

interface Props {
  open: boolean
  onClose: () => void
  title: string                  // e.g. "Full transcript" or "Question 2"
  candidateName: string
  roleTitle?: string
  text: string                   // transcript body
}

export function TranscriptModal({ open, onClose, title, candidateName, roleTitle, text }: Props) {
  const [downloading, setDownloading] = useState(false)

  // Lock scroll + ESC-to-close while modal is open.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  if (!open) return null

  async function downloadDocx() {
    setDownloading(true)
    try {
      // Build a properly-formatted Word doc with branded headings.
      const headerChildren: Paragraph[] = [
        new Paragraph({
          alignment: AlignmentType.LEFT,
          children: [new TextRun({ text: 'HQ Recruit', bold: true, size: 18, color: '4B4B4B' })],
        }),
        new Paragraph({
          alignment: AlignmentType.LEFT,
          children: [new TextRun({ text: title, bold: true, size: 36, color: '000000' })],
          heading: HeadingLevel.HEADING_1,
          spacing: { after: 80 },
        }),
        new Paragraph({
          alignment: AlignmentType.LEFT,
          children: [new TextRun({ text: candidateName, bold: true, size: 24, color: '1F1F1F' })],
        }),
      ]
      if (roleTitle) {
        headerChildren.push(new Paragraph({
          alignment: AlignmentType.LEFT,
          children: [new TextRun({ text: roleTitle, italics: true, size: 22, color: '4B4B4B' })],
          spacing: { after: 240 },
        }))
      } else {
        headerChildren.push(new Paragraph({ children: [new TextRun({ text: '' })], spacing: { after: 240 } }))
      }

      // Convert transcript body to paragraphs, treating "Question N:" as
      // section headings so the doc looks structured.
      const bodyParas: Paragraph[] = []
      const lines = text.split(/\r?\n/)
      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed) {
          bodyParas.push(new Paragraph({ children: [new TextRun({ text: '' })] }))
          continue
        }
        if (/^Question \d+:/i.test(trimmed)) {
          bodyParas.push(new Paragraph({
            children: [new TextRun({ text: trimmed, bold: true, size: 26, color: '000000' })],
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 240, after: 120 },
          }))
        } else {
          bodyParas.push(new Paragraph({
            children: [new TextRun({ text: trimmed, size: 22, color: '1F1F1F' })],
            spacing: { after: 100 },
          }))
        }
      }

      const doc = new Document({
        creator: 'HQ Recruit',
        title: `${title} — ${candidateName}`,
        styles: {
          default: {
            document: { run: { font: 'Calibri' } },
          },
        },
        sections: [{ children: [...headerChildren, ...bodyParas] }],
      })

      const blob = await Packer.toBlob(doc)
      const safeName = candidateName.replace(/[^a-z0-9]+/gi, '_').toLowerCase()
      const safeTitle = title.replace(/[^a-z0-9]+/gi, '_').toLowerCase()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${safeName}-${safeTitle}.docx`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('[TranscriptModal] docx error:', err)
      alert('Could not generate Word file. Please try again.')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-white rounded-2xl shadow-card w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-border">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold text-muted uppercase tracking-wider mb-1">HQ Recruit</p>
              <h2 className="font-display text-xl font-bold text-charcoal uppercase tracking-wider truncate">{title}</h2>
              <p className="text-sm text-mid mt-0.5 truncate">
                {candidateName}
                {roleTitle && <span className="text-muted"> &middot; {roleTitle}</span>}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-muted hover:text-charcoal transition-colors flex-shrink-0 -mr-1"
              aria-label="Close"
            >
              <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Body — scrollable transcript text with question headings styled */}
        <div className="flex-1 overflow-y-auto scrollbar-thin px-6 py-5">
          <div className="space-y-3">
            {text.split(/\n\n+/).map((para, i) => {
              const trimmed = para.trim()
              if (!trimmed) return null
              if (/^Question \d+:/i.test(trimmed)) {
                const lines = trimmed.split(/\r?\n/)
                const heading = lines[0]
                const rest = lines.slice(1).join('\n').trim()
                return (
                  <div key={i}>
                    <h3 className="font-display text-sm font-bold text-charcoal uppercase tracking-wider mb-1.5">{heading}</h3>
                    {rest && <p className="text-sm text-charcoal leading-relaxed whitespace-pre-wrap">{rest}</p>}
                  </div>
                )
              }
              return <p key={i} className="text-sm text-charcoal leading-relaxed whitespace-pre-wrap">{trimmed}</p>
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-bg flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="text-xs font-bold text-mid hover:text-charcoal transition-colors px-4 py-2 rounded-full"
          >
            Close
          </button>
          <button
            onClick={downloadDocx}
            disabled={downloading}
            className="text-xs font-bold px-4 py-2 rounded-full bg-black text-white hover:bg-charcoal transition-colors disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center gap-2"
          >
            {downloading ? (
              <>
                <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Generating…
              </>
            ) : (
              'Download as Word'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
