'use client'
import { useState } from 'react'
import type { PrescreenSession } from '@/lib/recruit-types'

interface Props {
  onClose: () => void
  onCreated: (session: PrescreenSession, candidateUrl: string) => void
}

type Step = 'setup' | 'questions'

const inputCls = 'w-full border border-border rounded-lg px-3 py-2 text-sm text-black placeholder-mid/60 focus:outline-none focus:border-accent/60 bg-white transition-colors'
const selectCls = `${inputCls} cursor-pointer`

export function CreateRoleModal({ onClose, onCreated }: Props) {
  const [step, setStep]               = useState<Step>('setup')
  const [company, setCompany]         = useState('')
  const [roleTitle, setRoleTitle]     = useState('')
  const [description, setDescription] = useState('')
  const [timeLimit, setTimeLimit]     = useState(90)
  const [qCount, setQCount]           = useState(4)
  const [questions, setQuestions]     = useState<string[]>([])
  const [generating, setGenerating]   = useState(false)
  const [creating, setCreating]       = useState(false)
  const [error, setError]             = useState('')

  async function handleGenerate() {
    if (!roleTitle.trim()) { setError('Please enter a role title first.'); return }
    setError('')
    setGenerating(true)
    try {
      const res = await fetch('/api/prescreen/questions/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role_title: roleTitle.trim(), description: description.trim(), count: qCount }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setQuestions(data.questions ?? [])
      setStep('questions')
    } catch {
      setError('Question generation failed. Please try again.')
    } finally {
      setGenerating(false)
    }
  }

  function addManualQuestion() {
    setQuestions(prev => [...prev, ''])
    setStep('questions')
  }

  async function handleCreate() {
    const filled = questions.filter(q => q.trim())
    if (!company.trim() || !roleTitle.trim()) { setError('Please enter company and role title.'); return }
    if (!filled.length) { setError('Please add at least one question.'); return }
    setError('')
    setCreating(true)
    try {
      const res = await fetch('/api/prescreen/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company: company.trim(),
          role_title: roleTitle.trim(),
          questions: filled,
          time_limit_seconds: timeLimit,
        }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      onCreated(data.session, data.candidateUrl)
    } catch {
      setError('Failed to create role. Please try again.')
    } finally {
      setCreating(false)
    }
  }

  function updateQ(i: number, val: string) {
    setQuestions(prev => { const next = [...prev]; next[i] = val; return next })
  }

  function removeQ(i: number) {
    setQuestions(prev => prev.filter((_, idx) => idx !== i))
  }

  return (
    <div
      className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-modal w-full max-w-lg overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="font-serif text-lg font-bold text-black">
              {step === 'setup' ? 'New Recruitment Role' : 'Review Questions'}
            </h2>
            <p className="text-xs text-mid mt-0.5">
              {step === 'setup'
                ? 'Configure the role, then generate AI questions or add your own'
                : 'Edit or remove questions before creating the role'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-bg transition-colors text-mid hover:text-black"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/>
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 max-h-[65vh] overflow-y-auto">
          {step === 'setup' ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-black mb-1.5">Company</label>
                  <input
                    className={inputCls}
                    value={company}
                    onChange={e => setCompany(e.target.value)}
                    placeholder="e.g. Acme Corp"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-black mb-1.5">Role Title</label>
                  <input
                    className={inputCls}
                    value={roleTitle}
                    onChange={e => setRoleTitle(e.target.value)}
                    placeholder="e.g. Senior Accountant"
                    onKeyDown={e => e.key === 'Enter' && handleGenerate()}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-black mb-1.5">
                  Role Description
                  <span className="text-mid font-normal ml-1">(helps AI write better questions)</span>
                </label>
                <textarea
                  className={`${inputCls} resize-none`}
                  rows={3}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Paste key responsibilities, must-haves and seniority level…"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-black mb-1.5">Time per Answer</label>
                  <select className={selectCls} value={timeLimit} onChange={e => setTimeLimit(Number(e.target.value))}>
                    <option value={60}>60 seconds</option>
                    <option value={90}>90 seconds</option>
                    <option value={120}>2 minutes</option>
                    <option value={180}>3 minutes</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-black mb-1.5">Questions</label>
                  <select className={selectCls} value={qCount} onChange={e => setQCount(Number(e.target.value))}>
                    <option value={3}>3 questions</option>
                    <option value={4}>4 questions</option>
                    <option value={5}>5 questions</option>
                    <option value={6}>6 questions</option>
                  </select>
                </div>
              </div>

              {error && <p className="text-xs text-danger">{error}</p>}

              <div className="flex items-center gap-3 pt-1">
                <button
                  onClick={handleGenerate}
                  disabled={generating || !roleTitle.trim()}
                  className="flex-1 bg-accent hover:bg-accent2 disabled:opacity-40 text-white text-sm font-bold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {generating ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Generating…
                    </>
                  ) : (
                    <>✦ Generate Questions with AI</>
                  )}
                </button>
                <button
                  onClick={addManualQuestion}
                  className="text-sm text-mid hover:text-black font-bold transition-colors px-3 py-2.5 whitespace-nowrap"
                >
                  + Write manually
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2.5">
              {questions.map((q, i) => (
                <div key={i} className="flex items-center gap-2.5 group">
                  <span className="text-xs font-bold text-mid w-6 flex-shrink-0 text-right">Q{i + 1}</span>
                  <input
                    className={`${inputCls} flex-1`}
                    value={q}
                    onChange={e => updateQ(i, e.target.value)}
                    placeholder="Enter question…"
                    autoFocus={i === 0 && q === ''}
                  />
                  <button
                    onClick={() => removeQ(i)}
                    className="text-mid hover:text-danger transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0"
                    title="Remove question"
                  >
                    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/>
                    </svg>
                  </button>
                </div>
              ))}

              <button
                onClick={() => setQuestions(prev => [...prev, ''])}
                className="text-xs text-accent hover:text-accent2 font-bold transition-colors mt-1"
              >
                + Add question
              </button>

              {error && <p className="text-xs text-danger mt-2">{error}</p>}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex items-center justify-between bg-bg/50">
          <div>
            {step === 'questions' && (
              <button
                onClick={() => setStep('setup')}
                className="text-sm text-mid hover:text-black font-bold transition-colors"
              >
                ← Back
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="text-sm text-mid hover:text-black font-bold transition-colors">
              Cancel
            </button>
            {step === 'questions' && (
              <button
                onClick={handleCreate}
                disabled={creating || !questions.filter(q => q.trim()).length}
                className="bg-accent hover:bg-accent2 disabled:opacity-40 text-white text-sm font-bold px-5 py-2 rounded-lg transition-colors flex items-center gap-2"
              >
                {creating ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Creating…
                  </>
                ) : (
                  'Create Role →'
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
