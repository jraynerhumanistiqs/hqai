'use client'

// AI Administrator client - template gallery + dynamic form + live preview.
//
// Drives the new B4 generate route. On generate, the response carries
// the full StructuredDocument plus the persisted document id, which
// the preview pane renders inline via /doc/[id] and the download
// buttons point at /api/administrator/documents/[id]/render?format=...
//
// Deliberately minimal compared with the eventual "Gamma-style"
// editor - the brief calls for template gallery + form + live preview
// + multi-format export as the first surface; richer block-level
// editing lands as a follow-up.

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import type { TemplateFormField } from '@/lib/template-ip'
import { Button } from '@/components/ui/button'

interface TemplateLite {
  id: string
  title: string
  category: string
  description: string
  formFields: TemplateFormField[]
}

interface Props {
  templates: TemplateLite[]
  categories: string[]
  initialTemplateId: string | null
}

export default function AdministratorClient({ templates, categories, initialTemplateId }: Props) {
  const [activeId, setActiveId] = useState<string | null>(initialTemplateId)
  const [filter, setFilter] = useState<string>('All')
  const [search, setSearch] = useState('')
  const [inputs, setInputs] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [previewId, setPreviewId] = useState<string | null>(null)
  const [previewHtml, setPreviewHtml] = useState<string>('')
  const [previewTitle, setPreviewTitle] = useState<string>('')
  const [downloading, setDownloading] = useState(false)
  const editableRef = useRef<HTMLDivElement | null>(null)

  const active = useMemo(() => templates.find(t => t.id === activeId) ?? null, [templates, activeId])
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return templates.filter(t => {
      const inCat = filter === 'All' || t.category === filter
      const inText = !q || t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q)
      return inCat && inText
    })
  }, [templates, filter, search])

  function setActiveTemplate(id: string) {
    setActiveId(id)
    setInputs({})
    setPreviewId(null)
    setPreviewHtml('')
    setPreviewTitle('')
    setError(null)
  }

  // Strip <html>/<head>/<style>/etc from the rendered HTML so we can
  // mount just the document body inside the editable pane. We keep
  // <main class="doc-page"> as the wrapper.
  function extractDocBody(html: string): string {
    const main = html.match(/<main[^>]*class="doc-page"[^>]*>([\s\S]*?)<\/main>/i)
    if (main && main[1]) return main[1]
    // Fallback: strip <head> and the outer html tags so the body content survives.
    const body = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
    return body?.[1] ?? html
  }

  async function loadPreview(id: string) {
    try {
      const res = await fetch(`/api/administrator/documents/${id}/render?format=html`, { cache: 'no-store' })
      if (!res.ok) throw new Error(`Preview HTTP ${res.status}`)
      const full = await res.text()
      setPreviewHtml(extractDocBody(full))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load preview')
    }
  }

  useEffect(() => {
    if (previewId) void loadPreview(previewId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewId])

  async function downloadPdf() {
    if (!previewId || !editableRef.current) return
    setDownloading(true)
    setError(null)
    try {
      const html = editableRef.current.innerHTML
      const res = await fetch(`/api/administrator/documents/${previewId}/render-html`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html, title: previewTitle || active?.title || 'document' }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({} as { detail?: string }))
        throw new Error(data?.detail || `HTTP ${res.status}`)
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${(previewTitle || active?.title || 'document').replace(/[^a-zA-Z0-9 ]/g, '').replace(/\s+/g, '_')}.pdf`
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

  async function generate() {
    if (!active) return
    setBusy(true)
    setError(null)
    setPreviewId(null)
    try {
      const res = await fetch('/api/administrator/documents/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template_id: active.id,
          inputs,
          intent: 'administrator-template-fill',
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data?.error || data?.detail || `HTTP ${res.status}`)
      }
      setPreviewId(data.id)
      setPreviewTitle(data?.document?.title ?? active.title)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed')
    } finally {
      setBusy(false)
    }
  }

  // Category pills - two rows of four (8 buttons total: All + 7
  // template categories). Each pill is uppercase and given enough
  // padding for the longest label ('Termination & Separation') to fit
  // on one line at the default font size.
  const categoryButtons = ['All', ...categories]
  const filterRow = (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      {categoryButtons.map(c => (
        <button
          key={c}
          onClick={() => setFilter(c)}
          className={`text-xs font-bold uppercase tracking-wider rounded-full px-3 py-2 transition-colors text-center
            ${filter === c ? 'bg-accent text-ink-on-accent' : 'bg-bg-soft text-ink hover:bg-bg-elevated border border-border'}`}
        >
          {c}
        </button>
      ))}
    </div>
  )

  return (
    <div className="h-full overflow-y-auto bg-bg">
      <div className="max-w-6xl mx-auto px-4 sm:px-8 py-8">
        <p className="text-xs font-bold uppercase tracking-wider text-ink-muted mb-2">
          HQ People - AI Administrator
        </p>
        <h1 className="font-sans text-h1 font-bold text-ink mb-2 tracking-tight">
          Every HR document you need, in under 3 minutes.
        </h1>
        <p className="text-body text-ink-soft mb-3 max-w-2xl">
          Pick a template, fill the form, generate. Edit the draft inline
          and download a final PDF when you&apos;re happy.
        </p>
        <p className="text-small text-ink-soft mb-6">
          Have an existing CV or contract?{' '}
          <Link href="/dashboard/people/administrator/ingest" className="text-accent underline-offset-4 hover:underline font-bold">
            Drop it in and I&apos;ll handle it
          </Link>{' '}
          - CV Formatter rewrites it to the Humanistiqs format, or run a contract review.
        </p>

        {!active && (
          <>
            {/* Category buttons - row 1, spread evenly above search. */}
            <div className="mb-3">{filterRow}</div>
            {/* Search - row 2, full width under the categories. */}
            <div className="mb-6">
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search templates"
                aria-label="Search templates"
                className="w-full bg-bg-elevated border border-border rounded-full px-4 py-2.5 text-small text-ink placeholder-ink-muted focus:outline-none focus:border-ink"
              />
            </div>
            {/* Cards - uniform height, clearer hierarchy. */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filtered.map(t => (
                <button
                  key={t.id}
                  onClick={() => setActiveTemplate(t.id)}
                  className="group text-left bg-bg-elevated border border-border rounded-2xl p-4 hover:border-ink hover:shadow-card transition-all h-full flex flex-col"
                >
                  <p className="text-[10px] font-bold uppercase tracking-wider text-ink-muted mb-2">{t.category}</p>
                  <p className="text-small font-bold text-ink mb-1.5 leading-snug">{t.title}</p>
                  <p className="text-xs text-ink-soft line-clamp-2 flex-1">{t.description}</p>
                  <p className="text-[11px] font-bold text-accent mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    Open template -&gt;
                  </p>
                </button>
              ))}
              {filtered.length === 0 && (
                <p className="text-sm text-ink-muted col-span-full">No templates match.</p>
              )}
            </div>

            {/* Guidance card - mirrors the "How the CV Scoring Agent
                works" pattern used on the CV Scoring page so the two
                product surfaces feel consistent. Two columns: what
                the engine does + what to do as the operator. */}
            <section className="bg-bg-elevated shadow-card rounded-3xl p-6 sm:p-8 mt-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent" aria-hidden />
                <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">How the AI Administrator works</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
                <div>
                  <p className="text-sm font-bold text-ink mb-2">What the engine does</p>
                  <ul className="space-y-2 text-xs text-ink-soft leading-relaxed list-disc pl-4">
                    <li>Maps the template you choose to a Fair Work + NES grounded prompt and runs it through Claude with the structured document tool.</li>
                    <li>Returns one block tree (headings, paragraphs, lists, tables, signatures, citations) that renders identically to DOCX, PDF, PPTX and the shareable web link.</li>
                    <li>Cites every legal claim back to the Act, the relevant Modern Award or NES section so you can spot-check the source.</li>
                    <li>Drops your uploaded business logo into the footer of every export automatically.</li>
                  </ul>
                </div>
                <div>
                  <p className="text-sm font-bold text-ink mb-2">What to do from here</p>
                  <ol className="space-y-2 text-xs text-ink-soft leading-relaxed list-decimal pl-4">
                    <li><strong className="text-ink">Pick a template</strong> from the gallery above. Search and filters narrow the 33-doc library quickly.</li>
                    <li><strong className="text-ink">Fill the form on the right.</strong> Anything unusual goes in the notes field; the model will fold it into the body.</li>
                    <li><strong className="text-ink">Generate</strong> and inspect the live preview that appears next to the form. Read the footnoted citations - they tell you which clauses the document leaned on.</li>
                    <li><strong className="text-ink">Edit inline.</strong> The preview is a live editor - click any sentence to refine the wording before you export.</li>
                    <li><strong className="text-ink">Download PDF.</strong> Your edits and the uploaded logo flow straight into the export. Each generate costs 1 credit (2 for complex contracts).</li>
                  </ol>
                </div>
              </div>

              <p className="text-[11px] text-ink-muted italic mt-5 leading-relaxed border-t border-border pt-4">
                HQ.ai does not give legal advice. Every generated document is reviewable, editable, and your signature is what makes it real.
              </p>
            </section>
          </>
        )}

        {active && (
          // Tips on the LEFT, actions on the RIGHT - the CV Scoring
          // Agent pattern the founder called out. Tips don't change
          // mid-flow so the user can keep them visible while they
          // fill the form.
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-6">

            {/* LEFT - tips + how this template will be drafted */}
            <aside className="space-y-4">
              <section className="bg-bg-elevated border border-border rounded-2xl p-5">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">{active.category}</p>
                  <button
                    onClick={() => setActiveTemplate('')}
                    className="text-xs font-bold text-ink-soft hover:text-ink"
                  >
                    Back to gallery
                  </button>
                </div>
                <h2 className="text-h3 font-bold text-ink mb-2">{active.title}</h2>
                <p className="text-xs text-ink-soft">{active.description}</p>
              </section>

              <section className="bg-bg-elevated shadow-card rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent" aria-hidden />
                  <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">How this draft is built</p>
                </div>
                <ul className="space-y-2 text-xs text-ink-soft leading-relaxed list-disc pl-4">
                  <li>The form on the right collects the minimum fields the document needs. Anything you leave blank, the model will phrase generically.</li>
                  <li>Use the <strong className="text-ink">notes</strong> field for clauses unique to this hire or situation. The model folds them in verbatim.</li>
                  <li>Australian English + plain hyphens are forced. Em-dashes will not appear in the output.</li>
                  <li>The draft cites every legal claim back to the Fair Work Act, NES or the relevant Modern Award. The citations panel at the end of the document lists them.</li>
                  <li>Your uploaded business logo is fitted into the footer of every export automatically. You do not need to upload it again.</li>
                </ul>
              </section>

              <section className="bg-bg-soft rounded-2xl p-5">
                <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mb-3">What to check before you send</p>
                <ol className="space-y-2 text-xs text-ink-soft leading-relaxed list-decimal pl-4">
                  <li>Skim the citations panel - does each section have a citation that makes sense?</li>
                  <li>Compare the remuneration figures and dates against your offer/role record. The model uses what you typed; it does not double-check.</li>
                  <li>Verify the candidate name + role title spelling.</li>
                  <li>Edit any wording directly in the preview, then click Download PDF.</li>
                </ol>
                <p className="text-[11px] text-ink-muted italic mt-3 leading-relaxed">
                  HQ.ai does not give legal advice. Treat each draft as a strong starting point; your signature is what makes it real.
                </p>
              </section>
            </aside>

            {/* RIGHT - actions: form on top, live preview below */}
            <div className="space-y-4">
              <section className="bg-bg-elevated border border-border rounded-2xl p-5">
                <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mb-3">Inputs</p>
                <form
                  onSubmit={e => { e.preventDefault(); void generate() }}
                  className="space-y-3"
                >
                  {active.formFields.map(f => (
                    <FormField
                      key={f.key}
                      field={f}
                      value={inputs[f.key] ?? ''}
                      onChange={v => setInputs(prev => ({ ...prev, [f.key]: v }))}
                    />
                  ))}
                  {error && (
                    <p className="text-xs text-danger" role="alert">{error}</p>
                  )}
                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    disabled={busy}
                    className="w-full"
                  >
                    {busy ? 'Generating...' : 'Generate document'}
                  </Button>
                </form>
              </section>

              <section className="bg-bg-elevated border border-border rounded-2xl p-3 min-h-[480px] flex flex-col">
                <div className="flex items-center justify-between px-3 py-2 border-b border-border">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">Live editor</p>
                    {previewId && (
                      <p className="text-[10px] text-ink-muted mt-0.5">Click anywhere in the document to edit. Your edits are included in the PDF.</p>
                    )}
                  </div>
                  {previewId && (
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      onClick={downloadPdf}
                      disabled={downloading || !previewHtml}
                    >
                      {downloading ? 'Preparing PDF...' : 'Download PDF'}
                    </Button>
                  )}
                </div>
                {previewId ? (
                  previewHtml ? (
                    <div
                      ref={editableRef}
                      contentEditable
                      suppressContentEditableWarning
                      role="textbox"
                      aria-label="Document body - editable"
                      spellCheck
                      className="flex-1 mt-2 bg-white rounded-md p-6 sm:p-8 overflow-y-auto scrollbar-thin text-ink focus:outline-none focus:ring-1 focus:ring-accent"
                      style={{ minHeight: '460px', maxHeight: '70vh' }}
                      dangerouslySetInnerHTML={{ __html: previewHtml }}
                    />
                  ) : (
                    <div className="flex-1 flex items-center justify-center text-xs text-ink-muted">Loading preview...</div>
                  )
                ) : (
                  <div className="flex-1 flex items-center justify-center text-xs text-ink-muted">
                    {busy ? 'Generating...' : 'Fill the form and click Generate to see the document here.'}
                  </div>
                )}
              </section>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function FormField({
  field,
  value,
  onChange,
}: {
  field: TemplateFormField
  value: string
  onChange: (v: string) => void
}) {
  const id = `f-${field.key}`
  const cls = 'w-full bg-bg border border-border rounded-md px-3 py-2 text-small text-ink placeholder-ink-muted focus:outline-none focus:border-ink'
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-bold text-ink-soft mb-1.5">
        {field.label}{field.required ? ' *' : ''}
      </label>
      {field.type === 'textarea' ? (
        <textarea
          id={id}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={field.placeholder}
          required={field.required}
          rows={4}
          className={cls}
        />
      ) : field.type === 'select' ? (
        <select
          id={id}
          value={value}
          onChange={e => onChange(e.target.value)}
          required={field.required}
          className={cls + ' appearance-none'}
        >
          <option value="">Select...</option>
          {(field.options ?? []).map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input
          id={id}
          type={field.type === 'date' ? 'date' : field.type === 'number' ? 'number' : 'text'}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={field.placeholder}
          required={field.required}
          className={cls}
        />
      )}
    </div>
  )
}
