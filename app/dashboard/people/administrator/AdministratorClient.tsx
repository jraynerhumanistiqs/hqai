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

import { useMemo, useState } from 'react'
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
    setError(null)
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed')
    } finally {
      setBusy(false)
    }
  }

  const filterRow = (
    <div className="flex flex-wrap gap-2">
      {['All', ...categories].map(c => (
        <button
          key={c}
          onClick={() => setFilter(c)}
          className={`text-xs font-bold uppercase tracking-wider rounded-full px-3 py-1.5 transition-colors
            ${filter === c ? 'bg-accent text-ink-on-accent' : 'bg-bg-soft text-ink hover:bg-bg-elevated'}`}
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
          Every HR document, cited to Fair Work, in under 3 minutes.
        </h1>
        <p className="text-body text-ink-soft mb-6 max-w-2xl">
          Pick a template, fill the form, generate. Download as DOCX, PDF
          or PPTX, or send a shareable web link. Each document grounds
          its claims in the relevant Fair Work clauses and lists them as
          footnote citations.
        </p>

        {!active && (
          <>
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search templates"
                aria-label="Search templates"
                className="bg-bg-elevated border border-border rounded-full px-4 py-2 text-small text-ink placeholder-ink-muted focus:outline-none focus:border-ink w-full sm:max-w-sm"
              />
              {filterRow}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map(t => (
                <button
                  key={t.id}
                  onClick={() => setActiveTemplate(t.id)}
                  className="text-left bg-bg-elevated border border-border rounded-2xl p-5 hover:border-ink transition-colors"
                >
                  <p className="text-[10px] font-bold uppercase tracking-wider text-ink-muted mb-1">{t.category}</p>
                  <p className="text-small font-bold text-ink mb-1.5">{t.title}</p>
                  <p className="text-xs text-ink-soft line-clamp-3">{t.description}</p>
                </button>
              ))}
              {filtered.length === 0 && (
                <p className="text-sm text-ink-muted col-span-full">No templates match.</p>
              )}
            </div>
          </>
        )}

        {active && (
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-6">
            <section className="bg-bg-elevated border border-border rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">{active.category}</p>
                  <h2 className="text-h3 font-bold text-ink">{active.title}</h2>
                </div>
                <button
                  onClick={() => setActiveTemplate('')}
                  className="text-xs font-bold text-ink-soft hover:text-ink"
                >
                  Back to gallery
                </button>
              </div>
              <p className="text-xs text-ink-soft mb-4">{active.description}</p>

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
                <p className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">Live preview</p>
                {previewId && (
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/doc/${previewId}`}
                      target="_blank"
                      className="text-xs font-bold text-ink hover:text-accent"
                    >
                      Open shareable link
                    </Link>
                    <span aria-hidden className="text-ink-muted">·</span>
                    <a
                      href={`/api/administrator/documents/${previewId}/render?format=pdf`}
                      className="text-xs font-bold text-ink hover:text-accent"
                    >
                      PDF
                    </a>
                    <a
                      href={`/api/administrator/documents/${previewId}/render?format=docx`}
                      className="text-xs font-bold text-ink hover:text-accent"
                    >
                      DOCX
                    </a>
                    <a
                      href={`/api/administrator/documents/${previewId}/render?format=pptx`}
                      className="text-xs font-bold text-ink hover:text-accent"
                    >
                      PPTX
                    </a>
                  </div>
                )}
              </div>
              {previewId ? (
                <iframe
                  title="Document preview"
                  src={`/api/administrator/documents/${previewId}/render?format=html`}
                  className="flex-1 bg-bg-elevated rounded-md mt-2"
                  style={{ border: 0, minHeight: '460px' }}
                />
              ) : (
                <div className="flex-1 flex items-center justify-center text-xs text-ink-muted">
                  {busy ? 'Generating...' : 'Fill the form and click Generate to see the document here.'}
                </div>
              )}
            </section>
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
