'use client'
// Public route - no authentication required.
// Shared read-only review for hiring managers via share token.
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Image from 'next/image'

interface RubricDim {
  name: string
  score: number
  confidence: number
  evidence_quote: string
  evidence_timestamp_sec: number
}

interface ReviewData {
  label: string | null
  expires_at: string | null
  candidateName: string
  role: string
  company: string
  questions: string[]
  videoIds: string[]
  evaluation: { rubric: RubricDim[]; overall_summary: string | null } | null
  staffRating: number | null
  notes: Array<{ body: string; created_at: string }>
}

export default function ReviewPage() {
  const { token }             = useParams<{ token: string }>()
  const [data, setData]       = useState<ReviewData | null>(null)
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/review/${token}`)
      .then(r => r.json().then(d => ({ status: r.status, d })))
      .then(({ status, d }) => {
        if (status !== 200 || d.error) { setError(d.error ?? 'Unable to load this review.'); return }
        setData(d as ReviewData)
      })
      .catch(() => setError('Could not load this review.'))
      .finally(() => setLoading(false))
  }, [token])

  return (
    <div className="min-h-screen bg-bg">
      <header className="bg-bg-elevated border-b border-border px-6 py-4 flex items-center justify-between">
        <Image src="/logo-black.svg" alt="HQ.ai" width={1428} height={571} className="w-14 h-auto" />
        {data?.expires_at && !error && (
          <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-light text-mid border border-border">
            Expires {new Date(data.expires_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
        )}
      </header>

      {loading && (
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-8 h-8 border-2 border-border border-t-black rounded-full animate-spin" />
        </div>
      )}

      {!loading && error && (
        <div className="max-w-md mx-auto px-6 py-20 text-center">
          <h2 className="text-lg font-bold text-ink mb-2">This review link is no longer active.</h2>
          <p className="text-sm text-mid">Please contact the sender.</p>
        </div>
      )}

      {!loading && data && (
        <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
          <div className="mb-6">
            <p className="text-xs font-bold text-ink uppercase tracking-widest mb-2">Candidate review</p>
            <h1 className="font-serif text-3xl font-bold text-ink mb-1">{data.candidateName}</h1>
            <p className="text-sm text-mid">
              Applying for <strong className="text-ink">{data.role}</strong> at <strong className="text-ink">{data.company}</strong>
            </p>
          </div>

          <div className="bg-[#FFF8E1] border border-[#E6C94A] text-charcoal rounded-2xl px-4 py-3 text-xs mb-6">
            AI scores below are suggestions only. Always apply your own judgement. Scores ignore protected attributes and do not assess personality or emotion.
          </div>

          <div className="space-y-6">
            {data.questions.map((q, i) => (
              <div key={i} className="bg-bg-elevated rounded-2xl border border-border shadow-card overflow-hidden">
                <div className="px-5 py-4 border-b border-border">
                  <div className="flex items-start gap-3">
                    <span className="text-xs font-bold text-ink bg-light px-2 py-0.5 rounded-full flex-shrink-0">
                      Q{i + 1}
                    </span>
                    <p className="text-sm font-bold text-charcoal">{q}</p>
                  </div>
                </div>
                {data.videoIds[i] ? (
                  <div className="aspect-video bg-black">
                    <iframe
                      src={`https://iframe.videodelivery.net/${data.videoIds[i]}?primaryColor=000000`}
                      className="w-full h-full"
                      allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
                      allowFullScreen
                      title={`Response to question ${i + 1}`}
                    />
                  </div>
                ) : (
                  <div className="aspect-video bg-light flex items-center justify-center">
                    <p className="text-sm text-mid">No response recorded</p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {data.evaluation && (
            <section className="mt-8 bg-bg-elevated rounded-2xl border border-border shadow-card">
              <div className="px-5 py-4 border-b border-border">
                <p className="text-xs font-bold text-ink uppercase tracking-widest">AI assessment</p>
              </div>
              {data.evaluation.overall_summary && (
                <div className="px-5 py-4 border-b border-border">
                  <p className="text-sm text-charcoal">{data.evaluation.overall_summary}</p>
                </div>
              )}
              <div className="px-5 py-4 space-y-3">
                {data.evaluation.rubric.map((d, i) => (
                  <div key={i}>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-bold text-ink capitalize">{d.name.replace(/_/g, ' ')}</p>
                      <p className="text-xs font-bold text-ink">{d.score}/5</p>
                    </div>
                    <div className="w-full h-1.5 bg-light rounded-full overflow-hidden mt-1">
                      <div className="h-full bg-black" style={{ width: `${(d.score / 5) * 100}%` }} />
                    </div>
                    {d.evidence_quote && (
                      <p className="text-xs text-mid italic mt-1">"{d.evidence_quote}"</p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {data.staffRating !== null && (
            <section className="mt-6 bg-bg-elevated rounded-2xl border border-border shadow-card px-5 py-4 flex items-center gap-3">
              <p className="text-xs font-bold text-ink uppercase tracking-widest">Staff rating</p>
              <p className="text-sm font-bold text-warning">{data.staffRating}/5</p>
            </section>
          )}

          {data.notes.length > 0 && (
            <section className="mt-6 bg-bg-elevated rounded-2xl border border-border shadow-card">
              <div className="px-5 py-4 border-b border-border">
                <p className="text-xs font-bold text-ink uppercase tracking-widest">Team notes</p>
              </div>
              <div className="divide-y divide-border">
                {data.notes.map((n, i) => (
                  <div key={i} className="px-5 py-3">
                    <p className="text-sm text-charcoal whitespace-pre-wrap">{n.body}</p>
                    <p className="text-[11px] text-mid mt-1">
                      {new Date(n.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          <footer className="mt-10 pt-6 border-t border-border text-center">
            <p className="text-sm text-mid">
              Prepared by <strong className="text-ink">Humanistiqs</strong> - humanistiqs.com.au
            </p>
            <p className="text-[11px] text-muted mt-1">
              This review is confidential and intended only for the named recipient.
            </p>
          </footer>
        </main>
      )}
    </div>
  )
}
