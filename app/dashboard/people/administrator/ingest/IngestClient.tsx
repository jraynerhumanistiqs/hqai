'use client'

// Resume / Contract ingest UI. Drop-zone style; lets the user pick a
// PDF / DOCX / TXT, then POSTs it to /api/administrator/ingest with
// kind=resume|contract. The endpoint runs the file through pdf-parse
// or mammoth, calls Claude with a structured-output tool, and returns
// either a CandidateProfile or a ContractReview payload.

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

type IngestKind = 'resume' | 'contract'

interface ResumePayload {
  full_name?: string
  email?: string
  phone?: string
  location?: string
  summary?: string
  skills?: string[]
  experience?: Array<{
    role?: string
    company?: string
    start_date?: string
    end_date?: string
    description?: string
  }>
  education?: Array<{
    qualification?: string
    institution?: string
    year?: string
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

export default function IngestClient() {
  const [kind, setKind] = useState<IngestKind>('resume')
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ kind: IngestKind; payload: ResumePayload | ContractPayload; id?: string } | null>(null)
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
      setResult({ kind: data.kind, payload: data.payload, id: data.id })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ingest failed')
    }
    setBusy(false)
  }

  return (
    <div className="h-full overflow-y-auto bg-bg">
      <div className="max-w-6xl mx-auto px-4 sm:px-8 py-8">
        <p className="text-xs font-bold uppercase tracking-wider text-ink-muted mb-2">
          HQ People - AI Administrator - Ingest IP
        </p>
        <h1 className="font-sans text-h1 font-bold text-ink mb-2 tracking-tight">
          Drop a resume or a contract. I&apos;ll read it.
        </h1>
        <p className="text-body text-ink-soft mb-6 max-w-2xl">
          Upload a PDF, Word doc, or plain text file (up to 10 MB).
          Resumes return a structured candidate profile; contracts
          return a Fair Work + NES review with severity-tagged findings.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-6">

          {/* LEFT - guidance */}
          <aside className="space-y-4">
            <section className="bg-bg-elevated border border-border rounded-2xl p-5">
              <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mb-3">When to use which</p>
              <ul className="space-y-3 text-xs text-ink-soft leading-relaxed">
                <li>
                  <p className="font-bold text-ink mb-0.5">Resume</p>
                  Pulls a clean candidate profile: contact details, skills,
                  every role with dates and a one-line description, plus
                  qualifications. Use for fast-tracking a CV into the
                  Shortlist Agent later.
                </li>
                <li>
                  <p className="font-bold text-ink mb-0.5">Contract</p>
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
                <li>No legal advice. Contract findings are starting points, not final calls.</li>
                <li>No automated decision. You always decide what to do with the output.</li>
                <li>I keep the extracted text + structured payload so you can review it later. The original file is not stored.</li>
              </ul>
            </section>
          </aside>

          {/* RIGHT - drop-zone + result */}
          <div className="space-y-4">
            <section className="bg-bg-elevated border border-border rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <button
                  onClick={() => setKind('resume')}
                  className={`text-xs font-bold uppercase tracking-wider rounded-full px-3 py-1.5 transition-colors ${kind === 'resume' ? 'bg-accent text-ink-on-accent' : 'bg-bg-soft text-ink hover:bg-bg-elevated'}`}
                >
                  Resume
                </button>
                <button
                  onClick={() => setKind('contract')}
                  className={`text-xs font-bold uppercase tracking-wider rounded-full px-3 py-1.5 transition-colors ${kind === 'contract' ? 'bg-accent text-ink-on-accent' : 'bg-bg-soft text-ink hover:bg-bg-elevated'}`}
                >
                  Contract
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
                {busy ? 'Reading...' : `Ingest ${kind}`}
              </Button>
            </section>

            {result && result.kind === 'resume' && (
              <ResumeResult payload={result.payload as ResumePayload} />
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

function ResumeResult({ payload }: { payload: ResumePayload }) {
  return (
    <section className="bg-bg-elevated border border-border rounded-2xl p-5">
      <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mb-3">Candidate profile</p>
      <div className="space-y-3 text-small text-ink">
        <p className="text-h3 font-bold">{payload.full_name || 'Unnamed candidate'}</p>
        <div className="text-xs text-ink-soft space-y-0.5">
          {payload.email    && <p>{payload.email}</p>}
          {payload.phone    && <p>{payload.phone}</p>}
          {payload.location && <p>{payload.location}</p>}
        </div>
        {payload.summary && (
          <p className="text-xs text-ink-soft leading-relaxed border-t border-border pt-3">{payload.summary}</p>
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
                  <p className="font-bold text-ink">{e.role} <span className="text-ink-muted font-normal">{e.company ? `at ${e.company}` : ''}</span></p>
                  <p className="text-ink-muted">{[e.start_date, e.end_date].filter(Boolean).join(' - ')}</p>
                  {e.description && <p className="text-ink-soft mt-0.5">{e.description}</p>}
                </li>
              ))}
            </ul>
          </div>
        )}
        {payload.education && payload.education.length > 0 && (
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mb-2">Education</p>
            <ul className="space-y-1">
              {payload.education.map((e, i) => (
                <li key={i} className="text-xs text-ink-soft">
                  <span className="font-bold text-ink">{e.qualification}</span>{e.institution ? `, ${e.institution}` : ''}{e.year ? ` (${e.year})` : ''}
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
