'use client'
import { useEffect, useState } from 'react'
import { VideoPlayer } from './VideoPlayer'
import { buildAnonMap } from '@/lib/recruit-anon'

interface CompareCandidate {
  id: string
  session_id: string
  candidate_name: string
  candidate_email: string
  submitted_at: string
  status: string
  staff_rating: number | null
  stage: string
  notes: string | null
  video_ids: string[]
  role_title: string
  company: string
  questions: string[]
  evaluation: {
    rubric: Array<{
      name: string
      score: number
      confidence: number
      evidence_quote: string
      evidence_timestamp_sec: number
    }>
    overall_summary: string | null
  } | null
  transcript_summary: string | null
}

interface Props {
  ids: string[]
  anonymise: boolean
  onClose: () => void
}

const STAGE_LABEL: Record<string, string> = {
  new: 'New', in_review: 'In review', shortlisted: 'Shortlisted', rejected: 'Rejected',
}

export function CompareView({ ids, anonymise, onClose }: Props) {
  const [candidates, setCandidates] = useState<CompareCandidate[]>([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState('')

  useEffect(() => {
    let cancelled = false
    fetch(`/api/prescreen/compare?ids=${encodeURIComponent(ids.join(','))}`)
      .then(r => r.json())
      .then(d => {
        if (cancelled) return
        if (d.error) { setError(d.error); return }
        setCandidates(d.candidates ?? [])
      })
      .catch(() => { if (!cancelled) setError('Could not load compare data.') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [ids])

  useEffect(() => {
    function onEsc(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onEsc)
    return () => window.removeEventListener('keydown', onEsc)
  }, [onClose])

  const maxQuestions = candidates.reduce((n, c) => Math.max(n, c.questions.length, c.video_ids.length), 0)
  const dimensionNames: string[] = (() => {
    const seen = new Set<string>()
    const names: string[] = []
    for (const c of candidates) {
      for (const d of c.evaluation?.rubric ?? []) {
        if (!seen.has(d.name)) { seen.add(d.name); names.push(d.name) }
      }
    }
    return names
  })()

  const anonMap = buildAnonMap(candidates.map(c => ({ id: c.id, created_at: c.submitted_at })))

  function displayName(c: CompareCandidate) {
    if (!anonymise) return c.candidate_name
    return anonMap[c.id] ?? 'Candidate'
  }

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col print:static print:bg-white">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .compare-grid { break-inside: avoid; }
          body { background: white !important; }
          .compare-col { break-inside: avoid; }
          .compare-col:nth-child(2n+1) { page-break-after: always; }
        }
      `}</style>

      <header className="flex items-center justify-between border-b border-border px-6 py-4 flex-shrink-0 no-print">
        <div>
          <p className="text-xs font-bold text-black uppercase tracking-widest">Compare candidates</p>
          <p className="text-xs text-mid mt-0.5">
            {candidates.length} side-by-side - {anonymise ? 'Anonymised' : 'Named'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="text-xs font-bold px-4 py-2 rounded-full border border-border text-black bg-white hover:bg-bg"
          >Print / Export PDF</button>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-mid hover:text-black text-xl leading-none px-2"
          >&times;</button>
        </div>
      </header>

      <div className="flex-1 overflow-auto px-6 py-6">
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-border border-t-black rounded-full animate-spin" />
          </div>
        )}
        {!loading && error && (
          <div className="text-sm text-danger">{error}</div>
        )}
        {!loading && !error && candidates.length > 0 && (
          <table className="compare-grid w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="sticky left-0 bg-white text-left text-xs font-bold text-mid uppercase tracking-widest px-3 py-2 border-b border-border align-top w-48">
                  &nbsp;
                </th>
                {candidates.map(c => (
                  <th key={c.id} className="compare-col text-left px-3 py-2 border-b border-border align-top min-w-[260px]">
                    <p className="font-serif text-lg font-bold text-black">{displayName(c)}</p>
                    <p className="text-xs text-mid">{c.role_title} - {c.company}</p>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <th className="sticky left-0 bg-white text-left text-xs font-bold text-mid uppercase tracking-widest px-3 py-2 align-top">Candidate</th>
                {candidates.map(c => (
                  <td key={c.id} className="px-3 py-2 align-top">
                    <p className="text-sm text-charcoal">{anonymise ? '-' : c.candidate_email}</p>
                    <p className="text-xs text-mid">Submitted {new Date(c.submitted_at).toLocaleDateString('en-AU')}</p>
                  </td>
                ))}
              </tr>

              {Array.from({ length: maxQuestions }).map((_, qi) => (
                <tr key={`q-${qi}`}>
                  <th className="sticky left-0 bg-white text-left text-xs font-bold text-mid uppercase tracking-widest px-3 py-3 align-top">Video Q{qi + 1}</th>
                  {candidates.map(c => {
                    const uid = c.video_ids[qi]
                    const q = c.questions[qi]
                    return (
                      <td key={c.id} className="px-3 py-3 align-top">
                        {q && <p className="text-[11px] text-mid mb-1 italic">"{q}"</p>}
                        {uid ? (
                          <details>
                            <summary className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full bg-black text-white cursor-pointer">
                              Play
                            </summary>
                            <div className="mt-2">
                              <VideoPlayer cloudflareUid={uid} title={`${displayName(c)} Q${qi + 1}`} />
                            </div>
                          </details>
                        ) : (
                          <p className="text-xs text-mid">No video</p>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}

              <tr>
                <th className="sticky left-0 bg-white text-left text-xs font-bold text-mid uppercase tracking-widest px-3 py-3 align-top">AI overall</th>
                {candidates.map(c => (
                  <td key={c.id} className="px-3 py-3 align-top text-xs text-charcoal">
                    {c.evaluation?.overall_summary ?? <span className="text-mid">--</span>}
                  </td>
                ))}
              </tr>

              {dimensionNames.map(dim => (
                <tr key={`dim-${dim}`}>
                  <th className="sticky left-0 bg-white text-left text-xs font-bold text-mid uppercase tracking-widest px-3 py-3 align-top capitalize">
                    {dim.replace(/_/g, ' ')}
                  </th>
                  {candidates.map(c => {
                    const d = c.evaluation?.rubric.find(x => x.name === dim)
                    return (
                      <td key={c.id} className="px-3 py-3 align-top">
                        {d ? (
                          <div>
                            <div className="flex items-center gap-2">
                              <div className="text-xs font-bold text-black flex-shrink-0">{d.score}/5</div>
                              <div className="flex-1 h-1.5 bg-light rounded-full overflow-hidden">
                                <div className="h-full bg-black" style={{ width: `${(d.score / 5) * 100}%` }} />
                              </div>
                            </div>
                            {d.evidence_quote && (
                              <p className="text-[11px] text-mid italic mt-1 line-clamp-1" title={d.evidence_quote}>
                                "{d.evidence_quote}"
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-mid">--</span>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}

              <tr>
                <th className="sticky left-0 bg-white text-left text-xs font-bold text-mid uppercase tracking-widest px-3 py-3 align-top">Staff rating</th>
                {candidates.map(c => (
                  <td key={c.id} className="px-3 py-3 align-top text-sm text-charcoal">
                    {c.staff_rating !== null ? `${c.staff_rating}/5` : <span className="text-mid">--</span>}
                  </td>
                ))}
              </tr>

              <tr>
                <th className="sticky left-0 bg-white text-left text-xs font-bold text-mid uppercase tracking-widest px-3 py-3 align-top">Stage</th>
                {candidates.map(c => (
                  <td key={c.id} className="px-3 py-3 align-top text-xs text-charcoal">
                    {STAGE_LABEL[c.stage] ?? c.stage}
                  </td>
                ))}
              </tr>

              <tr>
                <th className="sticky left-0 bg-white text-left text-xs font-bold text-mid uppercase tracking-widest px-3 py-3 align-top">Notes</th>
                {candidates.map(c => (
                  <td key={c.id} className="px-3 py-3 align-top text-xs text-charcoal whitespace-pre-wrap">
                    {c.notes ?? <span className="text-mid">--</span>}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
