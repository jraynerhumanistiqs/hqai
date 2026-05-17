'use client'

// CV Formatter / Contract ingest UI. Drop-zone style; lets the user
// pick a PDF / DOCX / TXT, then POSTs it to /api/administrator/ingest
// with kind=cv_formatter or kind=contract.
//
// - CV Formatter restructures a candidate CV into the Humanistiqs
//   house format (metadata table -> Summary -> Quals -> Skills ->
//   Experience). The endpoint persists a document row and returns its
//   id; the user can download the reformatted .docx directly from
//   this page.
// - Contract review keeps its existing severity-tagged findings.

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

type IngestKind = 'cv_formatter' | 'contract'

interface CvPayload {
  full_name?: string
  candidate_email?: string
  candidate_phone?: string
  candidate_suburb?: string
  work_rights?: string
  role_title?: string
  notice_period?: string
  availability?: string
  professional_summary?: string
  qualifications?: Array<{ qualification?: string; institution?: string; year?: string }>
  memberships?: string[]
  certificates?: string[]
  systems?: string[]
  skills?: string[]
  experience?: Array<{
    role?: string
    employer?: string
    start_date?: string
    end_date?: string
    location?: string
    description?: string
    bullets?: string[]
  }>
}

interface ContractFinding {
  severity: 'info' | 'caution' | 'risk'
  topic: string
  detail: string
  citation?: string
}

interface ContractPayload {
  summary?: string
  role?: string
  employer?: string
  employment_type?: string
  award_inferred?: string
  findings?: ContractFinding[]
}

interface IngestResult {
  kind: IngestKind
  payload: CvPayload | ContractPayload
  id?: string
  document_id?: string | null
}

export default function IngestClient() {
  const [kind, setKind] = useState<IngestKind>('cv_formatter')
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<IngestResult | null>(null)
  const [dragOver, setDragOver] = useState(false)

  function pickFile(f: File | null) {
    if (!f) { setFile(null); return }
    if (f.size > 10 * 1024 * 1024) {
      setError('File exceeds 10 MB. Try a tighter export or paste the text manually.')
      return
    }
    setError(null)
    setFile(f)
  }

  async function submit() {
    if (!file) return
    setBusy(true)
    setError(null)
    setResult(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('kind', kind)
      const res = await fetch('/api/administrator/ingest', { method: 'POST', body: fd })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || data?.detail || `HTTP ${res.status}`)
      setResult({ kind: data.kind, payload: data.payload, id: data.id, document_id: data.document_id })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ingest failed')
    }
    setBusy(false)
  }

  const kindLabel: Record<IngestKind, string> = {
    cv_formatter: 'CV Formatter',
    contract:     'Contract review',
  }

  return (
    <div className="h-full overflow-y-auto bg-bg">
      <div className="max-w-6xl mx-auto px-4 sm:px-8 py-8">
        <p className="text-xs font-bold uppercase tracking-wider text-ink-muted mb-2">
          HQ People - AI Administrator - Ingest IP
        </p>
        <h1 className="font-sans text-h1 font-bold text-ink mb-2 tracking-tight">
          Drop a CV or a contract. I&apos;ll handle it.
        </h1>
        <p className="text-body text-ink-soft mb-6 max-w-2xl">
          Upload a PDF, Word doc, or plain text file (up to 10 MB).
          CV Formatter restructures the candidate&apos;s document into
          the Humanistiqs house format without changing a single word.
          Contract review returns a Fair Work + NES check with
          severity-tagged findings.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-6">

          {/* LEFT - guidance */}
          <aside className="space-y-4">
            <section className="bg-bg-elevated border border-border rounded-2xl p-5">
              <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mb-3">When to use which</p>
              <ul className="space-y-3 text-xs text-ink-soft leading-relaxed">
                <li>
                  <p className="font-bold text-ink mb-0.5">CV Formatter</p>
                  Used by HQ Advisors or Hiring Managers to ensure every
                  candidate CV reads consistently. The candidate&apos;s
                  wording is preserved verbatim - only the section
                  ordering and labels change to match the Humanistiqs
                  template. The reformatted Word doc downloads in one
                  click.
                </li>
                <li>
                  <p className="font-bold text-ink mb-0.5">Contract review</p>
                  Reviews an Australian employment contract against the
                  Fair Work Act 2009, the National Employment Standards,
                  and the inferred Modern Award. Returns findings tagged
                  info / caution / risk with the relevant statutory
                  citation.
                </li>
              </ul>
            </section>

            <section className="bg-bg-soft rounded-2xl p-5">
              <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mb-3">What I do not do</p>
              <ul className="space-y-2 text-xs text-ink-soft leading-relaxed list-disc pl-4">
                <li>No editorialising. The CV Formatter preserves the candidate&apos;s words verbatim.</li>
                <li>No legal advice. Contract findings are starting points, not final calls.</li>
                <li>No automated decision. You always decide what to do with the output.</li>
                <li>The original file is not stored; the extracted text + structured payload are kept so you can re-render the formatted .docx later.</li>
              </ul>
            </section>
          </aside>

          {/* RIGHT - drop-zone + result */}
          <div className="space-y-4">
            <section className="bg-bg-elevated border border-border rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <button
                  onClick={() => setKind('cv_formatter')}
                  className={`text-xs font-bold uppercase tracking-wider rounded-full px-3 py-1.5 transition-colors ${kind === 'cv_formatter' ? 'bg-accent text-ink-on-accent' : 'bg-bg-soft text-ink hover:bg-bg-elevated'}`}
                >
                  CV Formatter
                </button>
                <button
                  onClick={() => setKind('contract')}
                  className={`text-xs font-bold uppercase tracking-wider rounded-full px-3 py-1.5 transition-colors ${kind === 'contract' ? 'bg-accent text-ink-on-accent' : 'bg-bg-soft text-ink hover:bg-bg-elevated'}`}
                >
                  Contract review
                </button>
              </div>

              <label
                htmlFor="ingest-file"
                onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => {
                  e.preventDefault(); setDragOver(false)
                  const f = e.dataTransfer.files?.[0] ?? null
                  pickFile(f)
                }}
                className={`block cursor-pointer rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors ${dragOver ? 'border-accent bg-accent-soft/40' : 'border-border bg-bg hover:border-ink'}`}
              >
                <input
                  id="ingest-file"
                  type="file"
                  accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                  onChange={e => pickFile(e.target.files?.[0] ?? null)}
                  className="sr-only"
                />
                <p className="text-small font-bold text-ink mb-1">
                  {file ? file.name : 'Drop a file here, or click to pick one'}
                </p>
                <p className="text-xs text-ink-muted">
                  PDF, DOCX or TXT up to 10 MB
                </p>
              </label>

              {error && <p className="mt-3 text-xs text-danger" role="alert">{error}</p>}

              <Button
                onClick={() => void submit()}
                variant="primary"
                size="md"
                disabled={!file || busy}
                className="mt-4 w-full"
              >
                {busy ? 'Reading...' : kind === 'cv_formatter' ? 'Reformat CV' : 'Review contract'}
              </Button>
            </section>

            {result && result.kind === 'cv_formatter' && (
              <CvResult payload={result.payload as CvPayload} documentId={result.document_id ?? null} />
            )}
            {result && result.kind === 'contract' && (
              <ContractResult payload={result.payload as ContractPayload} />
            )}
          </div>
        </div>

        <p className="mt-8 text-xs text-ink-muted">
          Need to generate a document from the extracted data?{' '}
          <Link href="/dashboard/people/administrator" className="text-accent underline-offset-4 hover:underline">
            Open the template gallery
          </Link>{' '}
          and paste what you need into the form.
        </p>
      </div>
    </div>
  )
}

function CvResult({ payload, documentId }: { payload: CvPayload; documentId: string | null }) {
  return (
    <section className="bg-bg-elevated border border-border rounded-2xl p-5">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
        <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">Reformatted CV</p>
        {documentId && (
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={`/api/administrator/documents/${documentId}/render?format=docx`}
              className="bg-accent hover:bg-accent-hover text-ink-on-accent text-xs font-bold rounded-full px-4 py-2"
            >
              Download .docx
            </a>
            <a
              href={`/api/administrator/documents/${documentId}/render?format=pdf`}
              className="border border-border hover:bg-bg-soft text-ink text-xs font-bold rounded-full px-4 py-2"
            >
              PDF
            </a>
            <a
              href={`/doc/${documentId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-bold text-ink hover:text-accent underline-offset-4 hover:underline px-2 py-2"
            >
              Open preview
            </a>
          </div>
        )}
      </div>
      <div className="space-y-3 text-small text-ink">
        <p className="text-h3 font-bold">{payload.full_name || 'Unnamed candidate'}</p>
        <div className="text-xs text-ink-soft grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0.5">
          {payload.role_title       && <p><strong className="text-ink">Role:</strong> {payload.role_title}</p>}
          {payload.candidate_suburb && <p><strong className="text-ink">Suburb:</strong> {payload.candidate_suburb}</p>}
          {payload.work_rights      && <p><strong className="text-ink">Work rights:</strong> {payload.work_rights}</p>}
          {payload.notice_period    && <p><strong className="text-ink">Notice:</strong> {payload.notice_period}</p>}
          {payload.candidate_email  && <p>{payload.candidate_email}</p>}
          {payload.candidate_phone  && <p>{payload.candidate_phone}</p>}
        </div>
        {payload.professional_summary && (
          <p className="text-xs text-ink-soft leading-relaxed border-t border-border pt-3">{payload.professional_summary}</p>
        )}
        {payload.skills && payload.skills.length > 0 && (
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mb-2">Skills</p>
            <div className="flex flex-wrap gap-1.5">
              {payload.skills.map(s => (
                <span key={s} className="text-xs bg-bg-soft border border-border rounded-full px-2.5 py-1">{s}</span>
              ))}
            </div>
          </div>
        )}
        {payload.experience && payload.experience.length > 0 && (
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mb-2">Experience</p>
            <ul className="space-y-2">
              {payload.experience.map((e, i) => (
                <li key={i} className="text-xs">
                  <p className="font-bold text-ink">{e.role} <span className="text-ink-muted font-normal">{e.employer ? `at ${e.employer}` : ''}</span></p>
                  <p className="text-ink-muted">{[e.start_date, e.end_date].filter(Boolean).join(' - ')}</p>
                  {e.description && <p className="text-ink-soft mt-0.5">{e.description}</p>}
                  {e.bullets && e.bullets.length > 0 && (
                    <ul className="list-disc pl-4 text-ink-soft mt-1">
                      {e.bullets.map((b, j) => <li key={j}>{b}</li>)}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  )
}

function ContractResult({ payload }: { payload: ContractPayload }) {
  return (
    <section className="bg-bg-elevated border border-border rounded-2xl p-5">
      <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mb-3">Contract review</p>
      <div className="space-y-3 text-small text-ink">
        {payload.role && <p className="text-h3 font-bold">{payload.role}</p>}
        <div className="text-xs text-ink-soft space-y-0.5">
          {payload.employer        && <p><strong className="text-ink">Employer:</strong> {payload.employer}</p>}
          {payload.employment_type && <p><strong className="text-ink">Type:</strong> {payload.employment_type}</p>}
          {payload.award_inferred  && <p><strong className="text-ink">Award (inferred):</strong> {payload.award_inferred}</p>}
        </div>
        {payload.summary && (
          <p className="text-xs text-ink-soft leading-relaxed border-t border-border pt-3">{payload.summary}</p>
        )}
        {payload.findings && payload.findings.length > 0 && (
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mb-2">Findings</p>
            <ul className="space-y-2">
              {payload.findings.map((f, i) => (
                <li key={i} className={`rounded-lg px-3 py-2 text-xs border ${
                  f.severity === 'risk'    ? 'bg-danger/10 border-danger/30 text-danger'
                  : f.severity === 'caution' ? 'bg-warning/10 border-warning/30 text-warning'
                  : 'bg-info/10 border-info/30 text-info'
                }`}>
                  <p className="font-bold uppercase tracking-wider text-[10px] mb-0.5">{f.severity} - {f.topic}</p>
                  <p className="text-ink-soft">{f.detail}</p>
                  {f.citation && <p className="text-ink-muted mt-1">{f.citation}</p>}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  )
}
