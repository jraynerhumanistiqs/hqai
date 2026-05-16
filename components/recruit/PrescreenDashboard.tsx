'use client'
import { useState, useEffect } from 'react'
import type { PrescreenSession, CandidateResponse } from '@/lib/recruit-types'
import { RoleSetupPanel }  from './RoleSetupPanel'
import { QuestionsPanel }  from './QuestionsPanel'
import { ResponsesPanel }  from './ResponsesPanel'
import { SessionSwitcher } from './SessionSwitcher'

export function PrescreenDashboard() {
  const [sessions, setSessions]         = useState<PrescreenSession[]>([])
  const [activeSession, setActiveSession] = useState<PrescreenSession | null>(null)
  const [questions, setQuestions]       = useState<string[]>([])
  const [candidateUrl, setCandidateUrl] = useState<string>('')
  const [responses, setResponses]       = useState<CandidateResponse[]>([])
  const [loadingResponses, setLoadingResponses] = useState(false)
  const [copied, setCopied]             = useState(false)

  // Load sessions on mount
  useEffect(() => {
    fetch('/api/prescreen/sessions')
      .then(r => r.json())
      .then(d => setSessions(d.sessions ?? []))
      .catch(console.error)
  }, [])

  // Load responses when active session changes
  useEffect(() => {
    if (!activeSession) return
    setLoadingResponses(true)
    fetch(`/api/prescreen/sessions/${activeSession.id}/responses`)
      .then(r => r.json())
      .then(d => setResponses(d.responses ?? []))
      .catch(console.error)
      .finally(() => setLoadingResponses(false))
  }, [activeSession])

  async function handleGenerateQuestions(roleTitle: string, description: string, count: number) {
    const res = await fetch('/api/prescreen/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        company: '', role_title: roleTitle,
        questions: Array(count).fill(''),
        time_limit_seconds: 90,
        ai_generate: true,
        role_description: description,
      }),
    })
    const data = await res.json()
    setQuestions(data.session?.questions ?? [])
  }

  async function handleCreateSession(payload: {
    company: string; role_title: string; questions: string[]; time_limit_seconds: number
  }) {
    const res = await fetch('/api/prescreen/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data = await res.json()
    setActiveSession(data.session)
    setCandidateUrl(data.candidateUrl)
    setSessions(prev => [data.session, ...prev])
    setResponses([])
  }

  async function handlePatchResponse(id: string, patch: Partial<CandidateResponse>) {
    await fetch(`/api/prescreen/responses/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    setResponses(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r))
  }

  async function handleShareResponse(id: string): Promise<string> {
    const res = await fetch(`/api/prescreen/responses/${id}/share-export`, { method: 'POST' })
    const data = await res.json()
    setResponses(prev => prev.map(r => r.id === id ? { ...r, status: 'shared' } : r))
    return data.shareUrl
  }

  async function handleExportResponse(id: string) {
    const res = await fetch(`/api/prescreen/responses/${id}/share-export`)
    const data = await res.json()
    data.videos?.forEach((v: { downloadUrl: string }) => window.open(v.downloadUrl, '_blank'))
  }

  async function copyLink() {
    await navigator.clipboard.writeText(candidateUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="h-full overflow-y-auto scrollbar-thin bg-surface-inverse">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-4">

        <div className="mb-2">
          <h1 className="font-display text-2xl font-bold text-white uppercase tracking-wide">Video Pre-Screen</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Generate AI questions, edit them, then send the link to candidates.
          </p>
        </div>

        {/* Session switcher */}
        {sessions.length > 0 && (
          <SessionSwitcher
            sessions={sessions}
            activeSession={activeSession}
            onSelect={s => { setActiveSession(s); setQuestions(s.questions); setCandidateUrl('') }}
          />
        )}

        {/* Role setup */}
        <RoleSetupPanel
          questions={questions}
          setQuestions={setQuestions}
          onGenerateQuestions={handleGenerateQuestions}
          onCreateSession={handleCreateSession}
        />

        {/* Questions editor */}
        <QuestionsPanel questions={questions} setQuestions={setQuestions} />

        {/* Candidate link */}
        {candidateUrl && (
          <div className="bg-[#111111] border border-[#222] rounded-2xl p-5">
            <p className="text-[10px] font-bold text-[#fd7325] uppercase tracking-widest mb-3">Candidate Link</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs text-gray-300 bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2 truncate">
                {candidateUrl}
              </code>
              <button
                onClick={copyLink}
                className="bg-[#fd7325] hover:bg-[#e5671f] text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors flex-shrink-0"
              >
                {copied ? '✓ Copied' : 'Copy'}
              </button>
            </div>
            <p className="text-[10px] text-gray-600 mt-2">
              Share this link with your candidate. They can record their video responses directly in their browser.
            </p>
          </div>
        )}

        {/* Responses */}
        {(activeSession || responses.length > 0) && (
          <ResponsesPanel
            responses={responses}
            questions={activeSession?.questions ?? questions}
            loading={loadingResponses}
            onPatch={handlePatchResponse}
            onShare={handleShareResponse}
            onExport={handleExportResponse}
          />
        )}
      </div>
    </div>
  )
}
