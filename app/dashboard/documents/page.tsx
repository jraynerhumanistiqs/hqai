'use client'

// My Documents - rebuilt to match the All Templates page layout.
// Collapsible category list, each row shows the document, and the
// recruiter can re-download or open the inline editor (powered by
// the same TipTap editor the AI Administrator uses) to refine the
// wording before exporting a fresh PDF.

import { useEffect, useMemo, useRef, useState } from 'react'
import DocEditor, { type DocEditorHandle } from '@/components/administrator/DocEditor'

interface Doc {
  id: string
  title: string
  type: string
  content: string
  created_at: string
  status: string
}

// type slug -> recruiter-facing category. Anything not matched lands in
// "Other". CV-formatted documents (cv_formatter ingest output) go under
// "Candidate Resumes" per the founder's terminology change.
function categoryOf(type: string): string {
  const t = (type ?? '').toLowerCase()
  if (t === 'cv' || t === 'cv_formatter' || t === 'cv-formatter' || t.startsWith('candidate-cv')) {
    return 'Candidate Resumes'
  }
  if (t.includes('contract') || t.includes('employment'))                            return 'Contracts'
  if (t.includes('letter-of-offer') || t.includes('offer'))                          return 'Offers'
  if (t.includes('termination') || t.includes('warning') || t.includes('improvement')) return 'Performance & Exits'
  if (t.includes('flex') || t.includes('confirmation') || t.includes('variation'))   return 'Employment Letters'
  if (t.includes('job-advertisement') || t.includes('reference') || t.includes('campaign')) return 'Recruitment'
  if (t.includes('cv-score') || t.includes('candidate-summary') || t.includes('shortlist')) return 'CV Scoring Agent reports'
  if (t.includes('medical') || t.includes('suitable'))                               return 'Workers Comp / WHS'
  return 'Other'
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

// Premium-minimal status pill - per founder feedback the dot indicators
// flip back to coloured pills but tuned to the kit:
//   Final/done   -> ink/5  text-ink  border-border
//   Sent/active  -> accent-soft text-accent border-accent/30
//   Draft/pending -> bg-soft text-ink-muted border-border
function StatusPill({ status }: { status: string }) {
  const s = (status ?? 'draft').toLowerCase()
  let cls = 'bg-bg-soft text-ink-muted border-border'
  let label = 'Draft'
  if (s === 'final' || s === 'completed' || s === 'done') {
    cls = 'bg-ink/5 text-ink border-border'
    label = 'Final'
  } else if (s === 'sent' || s === 'shared' || s === 'delivered' || s === 'active') {
    cls = 'bg-accent-soft text-accent border-accent/30'
    label = 'Sent'
  }
  return (
    <span className={`inline-flex items-center text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${cls}`}>
      {label}
    </span>
  )
}

export default function DocumentsPage() {
  const [docs, setDocs] = useState<Doc[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [openCategory, setOpenCategory] = useState<string | null>(null)
  const [editing, setEditing] = useState<Doc | null>(null)
  const [downloading, setDownloading] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/documents')
      .then(r => r.json())
      .then(data => { setDocs(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const categories = useMemo(() => {
    const q = search.trim().toLowerCase()
    const filtered = docs.filter(d => !q || d.title.toLowerCase().includes(q) || (d.type ?? '').toLowerCase().includes(q))
    const map = new Map<string, Doc[]>()
    for (const d of filtered) {
      const c = categoryOf(d.type)
      if (!map.has(c)) map.set(c, [])
      map.get(c)!.push(d)
    }
    // Stable category ordering with Candidate Resumes near the top.
    const order = ['Candidate Resumes', 'Offers', 'Contracts', 'Employment Letters', 'Performance & Exits', 'Recruitment', 'CV Scoring Agent reports', 'Workers Comp / WHS', 'Other']
    return order
      .filter(name => map.has(name))
      .map(name => ({ title: name, docs: map.get(name)!.sort((a, b) => b.created_at.localeCompare(a.created_at)) }))
  }, [docs, search])

  // Default-open the first category once the list lands.
  useEffect(() => {
    if (openCategory === null && categories.length > 0) setOpenCategory(categories[0].title)
  }, [categories, openCategory])

  const total = docs.length

  async function downloadDocx(doc: Doc) {
    setDownloading(doc.id)
    try {
      const a = document.createElement('a')
      a.href = `/api/documents/download?id=${doc.id}`
      a.download = `${doc.title.replace(/[^a-z0-9]/gi, '_')}.docx`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    } finally {
      // Brief flash so the user sees feedback even on fast downloads.
      setTimeout(() => setDownloading(null), 600)
    }
  }

  return (
    <div className="h-full overflow-y-auto scrollbar-thin bg-bg">
      <div className="max-w-3xl mx-auto px-4 sm:px-8 py-6 sm:py-8">
        {/* Fix #4 (M1): scale down to match TemplatesList heading treatment */}
        <h1 className="font-display text-3xl sm:text-[44px] tracking-tight text-ink leading-[1.05] mb-1">My Documents</h1>
        <p className="text-xs sm:text-sm text-ink-soft mb-4 sm:mb-6">
          {loading
            ? 'Loading your documents...'
            : `${total} document${total === 1 ? '' : 's'} generated across the AI Administrator, CV Scoring Agent and chat.`}
        </p>

        {/* Fix #8 (M11): sticky search bar with standard bordered input */}
        <div className="sticky top-0 z-10 bg-bg pb-3 mb-1">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search documents"
            className="w-full bg-bg border border-border rounded-full px-4 py-2.5 text-sm text-ink placeholder-ink-muted focus:border-ink focus:outline-none transition-colors"
          />
        </div>

        {!loading && total === 0 && (
          <div className="bg-bg-elevated border border-border rounded-3xl px-6 py-10 text-center">
            <p className="text-sm text-ink-soft">
              No documents yet. Generate one from the AI Administrator, or score a CV in the CV Scoring Agent and download the formatted version.
            </p>
          </div>
        )}

        <div className="space-y-3">
          {categories.map(cat => (
            <div key={cat.title} className="bg-bg-elevated border border-border rounded-3xl overflow-hidden">
              {/* Fix #3 (H10 a11y): aria-expanded + aria-controls + focus ring */}
              <button
                id={`doc-cat-btn-${cat.title.replace(/\s+/g, '-')}`}
                aria-expanded={openCategory === cat.title}
                aria-controls={`doc-cat-panel-${cat.title.replace(/\s+/g, '-')}`}
                onClick={() => setOpenCategory(prev => prev === cat.title ? null : cat.title)}
                className="w-full flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 hover:bg-bg-soft transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
              >
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  <h2 className="font-display text-base sm:text-lg tracking-tight text-ink truncate">{cat.title}</h2>
                  <span className="text-xs text-ink-muted bg-bg-soft px-2 py-0.5 rounded-full flex-shrink-0 border border-border">{cat.docs.length}</span>
                </div>
                {/* Fix #5 (M2): text-gray-500 -> text-ink-muted */}
                <svg className={`w-4 h-4 text-ink-muted transition-transform ${openCategory === cat.title ? 'rotate-180' : ''}`}
                  viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd"/>
                </svg>
              </button>

              {openCategory === cat.title && (
                <div
                  id={`doc-cat-panel-${cat.title.replace(/\s+/g, '-')}`}
                  role="region"
                  aria-labelledby={`doc-cat-btn-${cat.title.replace(/\s+/g, '-')}`}
                  className="border-t border-border"
                >
                  {cat.docs.map((doc, idx) => (
                    <div key={doc.id} className={`px-4 sm:px-6 py-3 sm:py-4 hover:bg-bg-soft transition-colors ${idx > 0 ? 'border-t border-border' : ''}`}>
                      <div className="flex items-start gap-3 sm:gap-4">
                        <div className="w-8 h-8 bg-bg-soft rounded-lg items-center justify-center flex-shrink-0 mt-0.5 hidden sm:flex border border-border">
                          <svg className="w-4 h-4 text-ink" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd"/>
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-semibold text-ink truncate">{doc.title}</p>
                            <StatusPill status={doc.status} />
                          </div>
                          <p className="text-[11px] sm:text-xs text-ink-muted mt-0.5 leading-relaxed">
                            {(doc.type ?? '').replace(/[-_]/g, ' ') || 'document'} - {formatDate(doc.created_at)}
                          </p>
                        </div>
                        {/* Fix #2 (H3 touch): min-h-touch on Edit + Download DOCX buttons */}
                        {/* Fix #8 (M11): hover:opacity-90 on Edit so it has perceptible hover */}
                        {/* Fix #10 (L7): "Download DOCX" label */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            onClick={() => setEditing(doc)}
                            className="bg-ink hover:opacity-90 text-bg-elevated text-[11px] sm:text-xs font-semibold px-2.5 sm:px-3 py-1.5 sm:py-2 min-h-touch rounded-full transition-opacity"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => downloadDocx(doc)}
                            disabled={downloading === doc.id}
                            className="bg-bg-elevated hover:bg-bg-soft text-ink-soft hover:text-ink text-[11px] sm:text-xs font-semibold px-2.5 sm:px-3 py-1.5 sm:py-2 min-h-touch rounded-full border border-border transition-colors disabled:opacity-50"
                          >
                            {downloading === doc.id ? 'Preparing...' : 'Download DOCX'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {editing && <EditDocumentModal doc={editing} onClose={() => setEditing(null)} />}
    </div>
  )
}

// -- Editor modal ---------------------------------------------------
function EditDocumentModal({ doc, onClose }: { doc: Doc; onClose: () => void }) {
  const editorRef = useRef<DocEditorHandle | null>(null)
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Convert the stored plain-text content into the editor's HTML
  // surface. Documents authored via the Administrator's structured
  // pipeline can also be re-fetched as HTML, but the documents table's
  // `content` column is the lowest-common-denominator plain text - so
  // we ship it through with paragraph splits and let the recruiter
  // edit from there. Future enhancement: pull structured_payload when
  // present.
  const initialHtml = useMemo(() => {
    const safe = (doc.content ?? '').trim()
    if (!safe) return `<h1>${escapeHtml(doc.title)}</h1><p></p>`
    const paragraphs = safe
      .split(/\n\s*\n/)
      .map(p => `<p>${escapeHtml(p).replace(/\n/g, '<br/>')}</p>`)
      .join('')
    return `<h1>${escapeHtml(doc.title)}</h1>${paragraphs}`
  }, [doc])

  async function downloadPdf() {
    if (!editorRef.current) return
    setDownloading(true)
    setError(null)
    try {
      const html = editorRef.current.getHTML()
      const settings = editorRef.current.getPageSettings()
      const res = await fetch(`/api/administrator/documents/${doc.id}/render-html`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html, title: doc.title, settings }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({} as { detail?: string }))
        throw new Error(data?.detail || `HTTP ${res.status}`)
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${doc.title.replace(/[^a-z0-9]/gi, '_')}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(url), 30000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'PDF download failed')
    } finally {
      setDownloading(false)
    }
  }

  // Fix #6 (L5): scrim bg-ink/40 -> bg-ink/60
  // Fix #3 (H10 a11y): aria-label on dialog -> aria-labelledby pointing to title <p>
  return (
    <div
      className="fixed inset-0 z-50 bg-ink/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-doc-modal-title"
      onClick={onClose}
    >
      {/* Grid layout (auto/1fr) over fixed 92vh height. The 1fr row
          gives DocEditor a fully-resolved containing block so the
          inner overflow-y-auto pane can actually scroll - the previous
          flex/max-h chain failed to clamp on tall content. */}
      {/* Fix #5 (M2): bg-white -> bg-bg-elevated */}
      <div
        className="bg-bg-elevated rounded-2xl shadow-modal w-full max-w-[920px] h-[92vh] grid"
        style={{ gridTemplateRows: 'auto 1fr' }}
        onClick={e => e.stopPropagation()}
      >
        <div>
          <div className="flex items-center justify-between px-5 py-3 border-b border-border">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted">Editing</p>
              {/* Fix #3 (H10 a11y): id on title so aria-labelledby works */}
              <p id="edit-doc-modal-title" className="text-sm font-bold text-charcoal truncate max-w-[400px]">{doc.title}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={downloadPdf}
                disabled={downloading}
                className="bg-accent hover:bg-accent-hover text-ink-on-accent text-xs font-bold rounded-full px-4 py-2 transition-colors disabled:opacity-60"
              >
                {downloading ? 'Preparing PDF...' : 'Download PDF'}
              </button>
              {/* Fix #2 (H3 touch): close button -> w-9 h-9 min-h-touch min-w-touch rounded-full */}
              <button
                type="button"
                onClick={onClose}
                aria-label="Close editor"
                className="w-9 h-9 min-h-touch min-w-touch rounded-full hover:bg-bg-soft flex items-center justify-center text-mid hover:text-charcoal text-lg font-bold transition-colors"
              >
                &times;
              </button>
            </div>
          </div>
          {error && (
            <p className="text-xs text-danger px-5 py-2 border-b border-border" role="alert">{error}</p>
          )}
        </div>
        <div className="min-h-0 overflow-hidden">
          <DocEditor ref={editorRef} initialHtml={initialHtml} />
        </div>
      </div>
    </div>
  )
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
