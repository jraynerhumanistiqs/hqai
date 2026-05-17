'use client'
// Public route - no authentication required.
// Candidates record video answers to pre-screen questions in their browser.
import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import type { PrescreenSession } from '@/lib/recruit-types'
import { CandidateGate }   from '@/components/prescreen/CandidateGate'
import { RecordingFlow }   from '@/components/prescreen/RecordingFlow'
import { ThankYouScreen }  from '@/components/prescreen/ThankYouScreen'

type Stage = 'loading' | 'error' | 'gate' | 'recording' | 'done'

export default function PrescreenPage() {
  const { id } = useParams<{ id: string }>()
  // Per-row invite links include ?response=<placeholder_id> so on submit
  // we can update the existing placeholder row (set by the CV-import
  // batch-handoff) instead of inserting a duplicate.
  const searchParams = useSearchParams()
  const responseId = searchParams?.get('response') ?? null
  const [stage, setStage]     = useState<Stage>('loading')
  const [session, setSession] = useState<PrescreenSession | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [candidateMeta, setCandidateMeta] = useState<{
    name: string; email: string; consent: boolean;
    consent_text?: string; consent_version?: string;
  } | null>(null)

  useEffect(() => {
    fetch(`/api/prescreen/sessions/${id}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setErrorMsg(d.error); setStage('error'); return }
        setSession(d.session)
        setStage('gate')
      })
      .catch(() => { setErrorMsg('Could not load this pre-screen.'); setStage('error') })
  }, [id])

  async function handleGateSubmit(name: string, email: string, consent: boolean, meta?: { text: string; version: string }) {
    setCandidateMeta({ name, email, consent, consent_text: meta?.text, consent_version: meta?.version })
    setStage('recording')
  }

  async function handleRecordingComplete(videoIds: string[], extras?: { visual_diagnostics?: unknown }) {
    if (!session || !candidateMeta) return
    try {
      const res = await fetch(`/api/prescreen/sessions/${session.id}/responses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidate_name: candidateMeta.name,
          candidate_email: candidateMeta.email,
          consent: candidateMeta.consent,
          consent_text: candidateMeta.consent_text,
          consent_version: candidateMeta.consent_version,
          consent_at: new Date().toISOString(),
          video_ids: videoIds,
          // Reviewer-only visual diagnostics. NEVER read by the AI
          // scoring pipeline - see docs/AIA-visual-telemetry.md.
          visual_diagnostics: extras?.visual_diagnostics ?? null,
          // Pass the placeholder row id (when present) so the API
          // updates the existing row instead of inserting a duplicate.
          response_id: responseId,
        }),
      })
      if (!res.ok) {
        const body = await res.text().catch(() => '')
        console.error('[responses POST] failed', res.status, body)
        setErrorMsg(`Your video was uploaded but the submission could not be recorded (HTTP ${res.status}). Please contact ${session.company || 'the hiring team'} and show them this code: SUBMIT_${res.status}.`)
        setStage('error')
        return
      }
      setStage('done')
    } catch (err: any) {
      console.error('[responses POST] network error', err)
      setErrorMsg('We could not send your submission. Please check your connection and try again.')
      setStage('error')
    }
  }

  return (
    <div className="min-h-screen bg-bg-elevated">
      {/* Nav */}
      <nav className="border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <Image src="/logo-black.svg" alt="HQ.ai" width={1760} height={570} className="w-[45px] h-auto" />
        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Video Pre-Screen</span>
      </nav>

      <div className="py-8">
        {stage === 'loading' && (
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="w-8 h-8 border-2 border-gray-200 border-t-black rounded-full animate-spin" />
          </div>
        )}

        {stage === 'error' && (
          <div className="max-w-md mx-auto px-6 py-20 text-center">
            <p className="text-gray-500 mb-2">{errorMsg}</p>
            <p className="text-sm text-gray-400">Please contact the team if you believe this is a mistake.</p>
          </div>
        )}

        {stage === 'gate' && session && (
          <CandidateGate
            roleTitle={session.role_title}
            company={session.company}
            timeLimitSeconds={session.time_limit_seconds}
            questionCount={session.questions.length}
            onSubmit={handleGateSubmit}
          />
        )}

        {stage === 'recording' && session && (
          <RecordingFlow
            questions={session.questions}
            timeLimitSeconds={session.time_limit_seconds}
            onComplete={handleRecordingComplete}
          />
        )}

        {stage === 'done' && <ThankYouScreen />}
      </div>
    </div>
  )
}
