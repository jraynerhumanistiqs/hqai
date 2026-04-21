'use client'
import { useState } from 'react'
import type { CandidateResponse } from '@/lib/recruit-types'

interface Props {
  responses: CandidateResponse[]
  questions: string[]
  loading: boolean
  onPatch: (id: string, patch: Partial<CandidateResponse>) => Promise<void>
  onShare: (id: string) => Promise<string>
  onExport: (id: string) => Promise<void>
}

type Filter = 'all' | 'new' | 'reviewed' | 'shared'

const BADGE: Record<string, string> = {
  new:      'bg-blue-500/15 text-blue-400',
  reviewed: 'bg-green-500/15 text-green-400',
  shared:   'bg-purple-500/15 text-purple-400',
}

export function ResponsesPanel({ responses, questions, loading, onPatch, onShare, onExport }: Props) {
  const [filter, setFilter]     = useState<Filter>('all')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [shareUrls, setShareUrls] = useState<Record<string, string>>({})
  const [copying, setCopying]   = useState<string | null>(null)

  const filtered = filter === 'all' ? responses : responses.filter(r => r.status === filter)

  const initials = (name: string) =>
    name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()

  async function handleShare(id: string) {
    const url = await onShare(id)
    setShareUrls(prev => ({ ...prev, [id]: url }))
  }

  async function copyUrl(id: string) {
    await navigator.clipboard.writeText(shareUrls[id])
    setCopying(id)
    setTimeout(() => setCopying(null), 2000)
  }

  if (loading) return (
    <div className="bg-[#111111] border border-[#222] rounded-2xl p-8 text-center">
      <div className="w-6 h-6 border-2 border-[#333] border-t-[#fd7325] rounded-full animate-spin mx-auto mb-3" />
      <p className="text-sm text-gray-500">Loading responses…</p>
    </div>
  )

  return (
    <div className="bg-[#111111] border border-[#222] rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="text-[10px] font-bold text-[#fd7325] uppercase tracking-widest">
          Candidate Responses
          {responses.length > 0 && <span className="ml-2 text-gray-500 normal-case font-normal">{responses.length}</span>}
        </p>
        <div className="flex items-center gap-1">
          {(['all', 'new', 'reviewed', 'shared'] as Filter[]).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-[11px] px-2.5 py-1 rounded-lg font-bold capitalize transition-colors ${
                filter === f ? 'bg-[#fd7325] text-white' : 'text-gray-500 hover:text-white'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 && (
        <p className="text-sm text-gray-600 text-center py-8">
          {filter === 'all' ? 'No responses yet — share the candidate link to get started.' : `No ${filter} responses.`}
        </p>
      )}

      <div className="space-y-2">
        {filtered.map(r => (
          <div key={r.id} className="bg-[#0a0a0a] border border-[#222] rounded-xl overflow-hidden">
            {/* Header row */}
            <button
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#111] transition-colors text-left"
              onClick={() => setExpanded(expanded === r.id ? null : r.id)}
            >
              <div className="w-8 h-8 rounded-full bg-[#fd7325]/20 flex items-center justify-center text-xs font-bold text-[#fd7325] flex-shrink-0">
                {initials(r.candidate_name)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white truncate">{r.candidate_name}</p>
                <p className="text-xs text-gray-500 truncate">
                  {r.candidate_email} · {new Date(r.submitted_at).toLocaleDateString('en-AU')}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {r.rating && (
                  <span className="text-xs font-bold text-yellow-400">{r.rating}/5 ★</span>
                )}
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${BADGE[r.status] ?? ''}`}>
                  {r.status}
                </span>
                <svg
                  className={`w-4 h-4 text-gray-500 transition-transform ${expanded === r.id ? 'rotate-180' : ''}`}
                  viewBox="0 0 20 20" fill="currentColor"
                >
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd"/>
                </svg>
              </div>
            </button>

            {/* Expanded body */}
            {expanded === r.id && (
              <div className="border-t border-[#222] px-4 py-4 space-y-4">
                {/* Video grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {questions.map((q, i) => (
                    <div key={i} className="bg-[#111] rounded-xl overflow-hidden">
                      <p className="text-[10px] font-bold text-gray-500 uppercase px-3 py-2 truncate">
                        Q{i + 1} — {q}
                      </p>
                      {r.video_ids[i] ? (
                        <iframe
                          src={`https://iframe.cloudflarestream.com/${r.video_ids[i]}`}
                          className="w-full aspect-video"
                          allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
                          allowFullScreen
                          title={`${r.candidate_name} Q${i + 1}`}
                        />
                      ) : (
                        <div className="aspect-video bg-[#0a0a0a] flex items-center justify-center">
                          <p className="text-xs text-gray-600">No response</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Rating */}
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-400 font-bold">Rate candidate:</span>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map(n => (
                      <button
                        key={n}
                        onClick={() => onPatch(r.id, { rating: n, status: 'reviewed' })}
                        className={`text-xl transition-colors ${(r.rating ?? 0) >= n ? 'text-yellow-400' : 'text-gray-700 hover:text-yellow-300'}`}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => handleShare(r.id)}
                    className="bg-[#fd7325] hover:bg-[#e5671f] text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors"
                  >
                    Share with Client
                  </button>
                  <button
                    onClick={() => onExport(r.id)}
                    className="bg-[#1a1a1a] hover:bg-[#222] text-gray-300 text-xs font-bold px-4 py-2 rounded-lg border border-[#333] transition-colors"
                  >
                    ↓ Export Videos
                  </button>
                  <button
                    onClick={() => onPatch(r.id, { status: 'reviewed' })}
                    className="bg-[#1a1a1a] hover:bg-[#222] text-gray-300 text-xs font-bold px-4 py-2 rounded-lg border border-[#333] transition-colors"
                  >
                    Mark Reviewed
                  </button>
                </div>

                {/* Share URL */}
                {shareUrls[r.id] && (
                  <div className="flex items-center gap-2 bg-[#111] border border-[#222] rounded-lg px-3 py-2">
                    <span className="text-xs text-gray-500 flex-shrink-0">Client link:</span>
                    <code className="flex-1 text-xs text-[#fd7325] truncate">{shareUrls[r.id]}</code>
                    <button
                      onClick={() => copyUrl(r.id)}
                      className="text-xs text-gray-400 hover:text-white flex-shrink-0 transition-colors"
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
    </div>
  )
}
