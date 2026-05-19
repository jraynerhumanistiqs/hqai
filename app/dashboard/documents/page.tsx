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
    <div className="h-full overflow-y-auto scrollbar-thin bg-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-8 py-6 sm:py-8">
        <h1 className="font-display text-2xl sm:text-h1 font-bold text-charcoal uppercase tracking-wide mb-1">My Documents</h1>
        <p className="text-xs sm:text-sm text-mid mb-4 sm:mb-6">
          {loading
            ? 'Loading your documents…'
            : `${total} document${total === 1 ? '' : 's'} generated across the AI Administrator, CV Scoring Agent and chat.`}
        </p>

        <div className="mb-4 sm:mb-6">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search documents"
            className="w-full px-4 py-2.5 bg-white border border-border rounded-full text-sm text-charcoal placeholder-muted outline-none focus:border-charcoal transition-colors"
          />
        </div>

        {!loading && total === 0 && (
          <div className="bg-white shadow-card rounded-2xl px-6 py-10 text-center">
            <p className="text-sm text-mid">
              No documents yet. Generate one from the AI Administrator, or score a CV in the CV Scoring Agent and download the formatted version.
            </p>
          </div>
        )}

        <div className="space-y-3">
          {categories.map(cat => (
            <div key={cat.title} className="bg-white shadow-card rounded-2xl overflow-hidden">
              <button
                onClick={() => setOpenCategory(prev => prev === cat.title ? null : cat.title)}
                className="w-full flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 hover:bg-light transition-colors"
              >
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  <h2 className="font-display text-base sm:text-lg font-bold text-charcoal uppercase tracking-wider truncate">{cat.title}</h2>
                  <span className="text-xs text-muted bg-light px-2 py-0.5 rounded-full flex-shrink-0">{cat.docs.length}</span>
                </div>
                <svg className={`w-4 h-4 text-gray-500 transition-transform ${openCategory === cat.title ? 'rotate-180' : ''}`}
                  viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd"/>
                </svg>
              </button>

              {openCategory === cat.title && (
                <div className="border-t border-border">
                  {cat.docs.map((doc, idx) => (
                    <div key={doc.id} className={`px-4 sm:px-6 py-3 sm:py-4 hover:bg-light transition-colors ${idx > 0 ? 'border-t border-border' : ''}`}>
                      <div className="flex items-start gap-3 sm:gap-4">
                        <div className="w-8 h-8 bg-ink/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 hidden sm:flex">
                          <svg className="w-4 h-4 text-ink" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd"/>
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-charcoal truncate">{doc.title}</p>
                          <p className="text-[11px] sm:text-xs text-muted mt-0.5 leading-relaxed">
                            {(doc.type ?? '').replace(/[-_]/g, ' ') || 'document'} - {formatDate(doc.created_at)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            onClick={() => setEditing(doc)}
                            className="bg-accent hover:bg-accent-hover text-ink-on-accent text-[11px] sm:text-xs font-bold px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-full transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => downloadDocx(doc)}
                            disabled={downloading === doc.id}
                            className="bg-white hover:bg-light text-mid hover:text-charcoal text-[11px] sm:text-xs font-bold px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-full border border-border transition-colors disabled:opacity-50"
                          >
                            {downloading === doc.id ? 'Preparing…' : 'Download'}
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

// ── Editor modal ───────────────────────────────────────────────────
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

  return (
    <div
      className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Edit document"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-modal w-full max-w-[920px] max-h-[92vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted">Editing</p>
            <p className="text-sm font-bold text-charcoal truncate max-w-[400px]">{doc.title}</p>
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
            <button
              type="button"
              onClick={onClose}
              aria-label="Close editor"
              className="text-mid hover:text-charcoal text-lg font-bold px-2"
            >
              ×
            </button>
          </div>
        </div>
        {error && (
          <p className="text-xs text-danger px-5 py-2 border-b border-border" role="alert">{error}</p>
        )}
        <div className="flex-1 min-h-0 overflow-hidden">
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
