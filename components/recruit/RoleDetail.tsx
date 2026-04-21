'use client'
import { useState } from 'react'
import type { PrescreenSession, CandidateResponse } from '@/lib/recruit-types'

interface Props {
  session: PrescreenSession
  responses: CandidateResponse[]
  loadingResponses: boolean
  initialCandidateUrl: string
  onPatchResponse: (id: string, patch: Partial<CandidateResponse>) => Promise<void>
  onShareResponse: (id: string) => Promise<string>
}

type Filter = 'all' | 'new' | 'reviewed' | 'shared'

const STATUS_PILL: Record<string, string> = {
  new:      'bg-blue-50 text-blue-600 border-blue-200',
  reviewed: 'bg-green-50 text-green-600 border-green-200',
  shared:   'bg-purple-50 text-purple-600 border-purple-200',
}

function initials(name: string) {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
}

export function RoleDetail({ session, responses, loadingResponses, initialCandidateUrl, onPatchResponse, onShareResponse }: Props) {
  const [copied, setCopied]         = useState(false)
  const [filter, setFilter]         = useState<Filter>('all')
  const [expanded, setExpanded]     = useState<string | null>(null)
  const [shareUrls, setShareUrls]   = useState<Record<string, string>>({})
  const [copying, setCopying]       = useState<string | null>(null)
  const [questionsOpen, setQuestionsOpen] = useState(false)

  const candidateUrl = initialCandidateUrl ||
    `${typeof window !== 'undefined' ? window.location.origin : 'https://hqai.vercel.app'}/prescreen/${session.id}`

  async function copyLink() {
    await navigator.clipboard.writeText(candidateUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const filtered = filter === 'all' ? responses : responses.filter(r => r.status === filter)

  async function handleShare(id: string) {
    const url = await onShareResponse(id)
    setShareUrls(prev => ({ ...prev, [id]: url }))
  }

  async function copyShareUrl(id: string) {
    await navigator.clipboard.writeText(shareUrls[id])
    setCopying(id)
    setTimeout(() => setCopying(null), 2000)
  }

  const timeLimitLabel = session.time_limit_seconds < 60
    ? `${session.time_limit_seconds}s`
    : session.time_limit_seconds < 120
    ? '1 min'
    : `${session.time_limit_seconds / 60} min`

  return (
    <div className="h-full flex flex-col">
      {/* Role header */}
      <div className="border-b border-border bg-white px-6 py-5 flex-shrink-0">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="font-serif text-2xl font-bold text-black leading-tight">{session.role_title}</h2>
            <p className="text-sm text-mid mt-1">{session.company}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 mt-1">
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
              session.status === 'active'
                ? 'bg-green-50 text-green-600 border-green-200'
                : 'bg-light text-mid border-border'
            }`}>
              {session.status}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4 mt-3 text-xs text-mid">
          <span>{session.questions.length} questions</span>
          <span>·</span>
          <span>{timeLimitLabel} per answer</span>
          <span>·</span>
          <span>{responses.length} {responses.length === 1 ? 'candidate' : 'candidates'}</span>
          <span>·</span>
          <span>Created {new Date(session.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
        </div>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto bg-bg">
        <div className="max-w-3xl mx-auto px-6 py-6 space-y-5">

          {/* Candidate invite link */}
          <div className="bg-white rounded-xl border border-border shadow-card p-5">
            <p className="text-xs font-bold text-black uppercase tracking-widest mb-3">Candidate Invite Link</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs text-mid bg-bg border border-border rounded-lg px-3 py-2 truncate font-mono">
                {candidateUrl}
              </code>
              <button
                onClick={copyLink}
                className={`text-sm font-bold px-4 py-2 rounded-lg transition-colors flex-shrink-0 ${
                  copied
                    ? 'bg-success/10 text-success border border-success/20'
                    : 'bg-accent hover:bg-accent2 text-white'
                }`}
              >
                {copied ? '✓ Copied' : 'Copy Link'}
              </button>
            </div>
            <p className="text-xs text-mid mt-2">
              Share this link with candidates. They record video responses directly in their browser — no app needed.
            </p>
          </div>

          {/* Questions accordion */}
          <div className="bg-white rounded-xl border border-border shadow-card overflow-hidden">
            <button
              className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-bg/50 transition-colors"
              onClick={() => setQuestionsOpen(!questionsOpen)}
            >
              <p className="text-xs font-bold text-black uppercase tracking-widest">
                Pre-Screen Questions
                <span className="ml-2 text-mid normal-case font-normal">{session.questions.length}</span>
              </p>
              <svg
                className={`w-4 h-4 text-mid transition-transform ${questionsOpen ? 'rotate-180' : ''}`}
                viewBox="0 0 20 20" fill="currentColor"
              >
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd"/>
              </svg>
            </button>
            {questionsOpen && (
              <div className="border-t border-border divide-y divide-border">
                {session.questions.map((q, i) => (
                  <div key={i} className="flex items-start gap-3 px-5 py-3">
                    <span className="text-xs font-bold text-accent mt-0.5 w-6 flex-shrink-0">Q{i + 1}</span>
                    <p className="text-sm text-black">{q}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Candidate responses */}
          <div className="bg-white rounded-xl border border-border shadow-card overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <p className="text-xs font-bold text-black uppercase tracking-widest">
                Candidates
                {responses.length > 0 && (
                  <span className="ml-2 text-mid normal-case font-normal">{responses.length}</span>
                )}
              </p>
              {responses.length > 0 && (
                <div className="flex items-center gap-1">
                  {(['all', 'new', 'reviewed', 'shared'] as Filter[]).map(f => (
                    <button
                      key={f}
                      onClick={() => setFilter(f)}
                      className={`text-xs px-2.5 py-1 rounded-lg font-bold capitalize transition-colors ${
                        filter === f
                          ? 'bg-accent text-white'
                          : 'text-mid hover:text-black'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {loadingResponses && (
              <div className="flex items-center justify-center py-12">
                <div className="w-5 h-5 border-2 border-border border-t-accent rounded-full animate-spin" />
              </div>
            )}

            {!loadingResponses && filtered.length === 0 && (
              <div className="py-12 text-center px-6">
                <div className="w-10 h-10 bg-accent3 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                  </svg>
                </div>
                <p className="text-sm text-mid mb-1">
                  {filter === 'all' ? 'No candidates yet' : `No ${filter} candidates`}
                </p>
                {filter === 'all' && (
                  <p className="text-xs text-mid/70">
                    Share the invite link above to start receiving video responses
                  </p>
                )}
              </div>
            )}

            {!loadingResponses && filtered.length > 0 && (
              <div className="divide-y divide-border">
                {filtered.map(r => (
                  <div key={r.id}>
                    {/* Candidate row */}
                    <button
                      className="w-full flex items-center gap-3 px-5 py-4 hover:bg-bg/50 transition-colors text-left"
                      onClick={() => setExpanded(expanded === r.id ? null : r.id)}
                    >
                      <div className="w-8 h-8 rounded-full bg-accent3 flex items-center justify-center text-xs font-bold text-accent2 flex-shrink-0">
                        {initials(r.candidate_name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-black truncate">{r.candidate_name}</p>
                        <p className="text-xs text-mid truncate">
                          {r.candidate_email} · {new Date(r.submitted_at).toLocaleDateString('en-AU')}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {r.rating !== null && (
                          <span className="text-xs font-bold text-warning">{r.rating}/5 ★</span>
                        )}
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full border capitalize ${STATUS_PILL[r.status] ?? ''}`}>
                          {r.status}
                        </span>
                        <svg
                          className={`w-4 h-4 text-mid transition-transform ${expanded === r.id ? 'rotate-180' : ''}`}
                          viewBox="0 0 20 20" fill="currentColor"
                        >
                          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd"/>
                        </svg>
                      </div>
                    </button>

                    {/* Expanded candidate detail */}
                    {expanded === r.id && (
                      <div className="border-t border-border bg-bg px-5 py-5 space-y-5">
                        {/* Video grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {session.questions.map((q, i) => (
                            <div key={i} className="bg-white rounded-xl border border-border overflow-hidden shadow-card">
                              <div className="px-3 py-2 border-b border-border">
                                <p className="text-xs text-mid font-bold truncate">
                                  <span className="text-accent mr-1.5">Q{i + 1}</span>
                                  {q}
                                </p>
                              </div>
                              {r.video_ids[i] ? (
                                <div className="aspect-video bg-black">
                                  <iframe
                                    src={`https://iframe.cloudflarestream.com/${r.video_ids[i]}`}
                                    className="w-full h-full"
                                    allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
                                    allowFullScreen
                                    title={`${r.candidate_name} Q${i + 1}`}
                                  />
                                </div>
                              ) : (
                                <div className="aspect-video bg-light flex items-center justify-center">
                                  <p className="text-xs text-mid">No response recorded</p>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>

                        {/* Rating */}
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-bold text-black">Rate candidate:</span>
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map(n => (
                              <button
                                key={n}
                                onClick={() => onPatchResponse(r.id, { rating: n, status: 'reviewed' })}
                                className={`text-xl transition-colors ${(r.rating ?? 0) >= n ? 'text-warning' : 'text-light hover:text-warning/60'}`}
                              >
                                ★
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => handleShare(r.id)}
                            className="bg-accent hover:bg-accent2 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors"
                          >
                            Share with Client
                          </button>
                          <button
                            onClick={() => onPatchResponse(r.id, { status: 'reviewed' })}
                            className="bg-white hover:bg-bg text-black text-xs font-bold px-4 py-2 rounded-lg border border-border transition-colors"
                          >
                            Mark Reviewed
                          </button>
                        </div>

                        {/* Share URL */}
                        {shareUrls[r.id] && (
                          <div className="flex items-center gap-2 bg-white border border-border rounded-lg px-3 py-2">
                            <span className="text-xs text-mid flex-shrink-0 font-bold">Client link:</span>
                            <code className="flex-1 text-xs text-accent2 truncate font-mono">{shareUrls[r.id]}</code>
                            <button
                              onClick={() => copyShareUrl(r.id)}
                              className="text-xs text-mid hover:text-black font-bold flex-shrink-0 transition-colors"
                            >
                              {copying === r.id ? '✓ Copied' : 'Copy'}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
