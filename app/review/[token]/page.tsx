'use client'
// Public route — no authentication required.
// Shared with hiring managers to watch candidate video responses.
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Image from 'next/image'

interface ReviewData {
  candidateName: string
  role: string
  company: string
  questions: string[]
  videoIds: string[]
}

export default function ReviewPage() {
  const { token } = useParams<{ token: string }>()
  const [data, setData]       = useState<ReviewData | null>(null)
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/prescreen/review/${token}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); return }
        setData(d)
      })
      .catch(() => setError('Could not load this review.'))
      .finally(() => setLoading(false))
  }, [token])

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <Image src="/logo-black.svg" alt="HQ.ai" width={80} height={80} className="w-14 h-auto" />
      </header>

      {loading && (
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-8 h-8 border-2 border-gray-200 border-t-[#fd7325] rounded-full animate-spin" />
        </div>
      )}

      {!loading && error && (
        <div className="max-w-md mx-auto px-6 py-20 text-center">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-red-500" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
            </svg>
          </div>
          <h2 className="text-lg font-bold text-gray-800 mb-2">{error}</h2>
          <p className="text-sm text-gray-500">
            Please contact the Humanistiqs team if you believe this is a mistake.
          </p>
        </div>
      )}

      {!loading && data && (
        <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
          {/* Intro */}
          <div className="mb-8">
            <p className="text-xs font-bold text-[#fd7325] uppercase tracking-widest mb-2">
              Candidate Pre-Screen Review
            </p>
            <h1 className="text-3xl font-bold text-gray-900 mb-1">{data.candidateName}</h1>
            <p className="text-gray-500">
              Applying for <strong className="text-gray-700">{data.role}</strong> at <strong className="text-gray-700">{data.company}</strong>
            </p>
            <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
              The following videos are this candidate&rsquo;s pre-screen responses.
              This link was shared by the Humanistiqs team and is valid for 14 days.
            </div>
          </div>

          {/* Videos */}
          <div className="space-y-6">
            {data.questions.map((q, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                <div className="px-5 py-4 border-b border-gray-100">
                  <div className="flex items-start gap-3">
                    <span className="text-xs font-bold text-[#fd7325] bg-[#fd7325]/10 px-2 py-0.5 rounded-full flex-shrink-0">
                      Q{i + 1}
                    </span>
                    <p className="text-sm font-medium text-gray-800">{q}</p>
                  </div>
                </div>
                {data.videoIds[i] ? (
                  <div className="aspect-video bg-black">
                    <iframe
                      src={`https://iframe.cloudflarestream.com/${data.videoIds[i]}`}
                      className="w-full h-full"
                      allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
                      allowFullScreen
                      title={`Response to question ${i + 1}`}
                    />
                  </div>
                ) : (
                  <div className="aspect-video bg-gray-50 flex items-center justify-center">
                    <p className="text-sm text-gray-400">No response recorded</p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Footer */}
          <footer className="mt-10 pt-6 border-t border-gray-200 text-center">
            <p className="text-sm text-gray-500">
              Prepared by <strong>Humanistiqs</strong> · humanistiqs.com.au
            </p>
            <p className="text-xs text-gray-400 mt-1">
              This review is confidential and intended only for the named recipient.
            </p>
          </footer>
        </main>
      )}
    </div>
  )
}
