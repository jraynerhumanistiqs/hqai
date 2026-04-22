'use client'
import { useState, useEffect } from 'react'
import type { PrescreenSession } from '@/lib/recruit-types'

interface Props {
  onClose: () => void
  onCreated: (session: PrescreenSession, candidateUrl: string) => void
}

type Step = 'setup' | 'questions'

const inputCls = 'w-full border border-border rounded-lg px-3.5 py-2.5 text-sm text-black placeholder-mid/60 focus:outline-none focus:border-accent/60 bg-white transition-colors'
const selectCls = `${inputCls} cursor-pointer`

const TIP_THRESHOLD = 300

export function CreateRoleModal({ onClose, onCreated }: Props) {
  const [step, setStep]               = useState<Step>('setup')
  const [company, setCompany]         = useState('')
  const [roleTitle, setRoleTitle]     = useState('')
  const [description, setDescription] = useState('')
  const [minutes, setMinutes]         = useState(1)
  const [seconds, setSeconds]         = useState(30)
  const [qCount, setQCount]           = useState(4)
  const [questions, setQuestions]     = useState<string[]>([])
  const [generating, setGenerating]   = useState(false)
  const [creating, setCreating]       = useState(false)
  const [error, setError]             = useState('')
  const [showTip, setShowTip]         = useState(false)
  const [tipArmed, setTipArmed]       = useState(true)

  const timeLimit = Math.max(10, Math.min(600, minutes * 60 + seconds))

  useEffect(() => {
    if (timeLimit >= TIP_THRESHOLD && tipArmed) {
      setShowTip(true)
      setTipArmed(false)
    } else if (timeLimit < TIP_THRESHOLD && !tipArmed) {
      setTipArmed(true)
    }
  }, [timeLimit, tipArmed])

  function applyPreset(val: number) {
    const m = Math.floor(val / 60)
    const s = val % 60
    setMinutes(m)
    setSeconds(s)
  }

  function updateMinutes(v: number) {
    if (!Number.isFinite(v)) v = 0
    setMinutes(Math.max(0, Math.min(10, Math.floor(v))))
  }

  function updateSeconds(v: number) {
    if (!Number.isFinite(v)) v = 0
    setSeconds(Math.max(0, Math.min(59, Math.floor(v))))
  }

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
        className="bg-white rounded-2xl shadow-modal w-full max-w-xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-7 py-5 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="font-serif text-xl font-bold text-black">
              {step === 'setup' ? 'New Recruitment Role' : 'Review Questions'}
            </h2>
            <p className="text-sm text-mid mt-0.5">
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
        <div className="px-7 py-6 max-h-[65vh] overflow-y-auto">
          {step === 'setup' ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-bold text-black mb-1.5">Company</label>
                  <input
                    className={inputCls}
                    value={company}
                    onChange={e => setCompany(e.target.value)}
                    placeholder="e.g. Acme Corp"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-black mb-1.5">Role Title</label>
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
                <label className="block text-sm font-bold text-black mb-1.5">
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
                  <label className="block text-sm font-bold text-black mb-1.5">
                    Time per Answer
                    <span className="text-mid font-normal ml-1">({timeLimit < 60 ? `${timeLimit}s` : `${Math.floor(timeLimit / 60)}m${timeLimit % 60 ? ` ${timeLimit % 60}s` : ''}`})</span>
                  </label>
                  <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                    {[60, 90, 120, 180, 300].map(val => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => applyPreset(val)}
                        className={`text-xs font-bold px-3 py-1.5 rounded-full transition-colors ${
                          timeLimit === val
                            ? 'bg-black text-white'
                            : 'bg-light text-mid hover:bg-border'
                        }`}
                      >
                        {val < 60 ? `${val}s` : val % 60 === 0 ? `${val / 60}m` : `${Math.floor(val / 60)}m ${val % 60}s`}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 flex items-center gap-1">
                      <input
                        type="number"
                        min={0}
                        max={10}
                        className={inputCls}
                        value={minutes}
                        onChange={e => updateMinutes(Number(e.target.value))}
                        aria-label="Minutes"
                      />
                      <span className="text-xs text-mid">min</span>
                    </div>
                    <div className="flex-1 flex items-center gap-1">
                      <input
                        type="number"
                        min={0}
                        max={59}
                        className={inputCls}
                        value={seconds}
                        onChange={e => updateSeconds(Number(e.target.value))}
                        aria-label="Seconds"
                      />
                      <span className="text-xs text-mid">sec</span>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-black mb-1.5">Questions</label>
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
                  className="flex-1 bg-accent hover:bg-accent2 disabled:opacity-40 text-white text-base font-bold py-3 rounded-full transition-colors flex items-center justify-center gap-2"
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
        <div className="px-7 py-5 border-t border-border flex items-center justify-between bg-bg/50">
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
                className="bg-accent hover:bg-accent2 disabled:opacity-40 text-white text-base font-bold px-6 py-3 rounded-full transition-colors flex items-center gap-2"
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

      {showTip && <BestPracticeTipModal onClose={() => setShowTip(false)} />}
    </div>
  )
}

function BestPracticeTipModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-modal max-w-md w-full p-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-1">
          <h3 className="font-display text-lg font-bold text-charcoal uppercase tracking-wider">Best-Practice Tip</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 -mt-1 -mr-1 flex items-center justify-center rounded-lg hover:bg-light transition-colors text-mid hover:text-black"
            aria-label="Close"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/>
            </svg>
          </button>
        </div>
        <p className="text-sm text-mid mb-4">Interview answer length guidelines</p>

        <div className="space-y-3 text-sm text-charcoal">
          <p><strong>Simple / direct questions:</strong> 30-60 seconds.</p>
          <p><strong>Behavioural / complex questions (STAR):</strong> 90 seconds to 3 minutes.</p>
          <p><strong>Absolute maximum:</strong> 4-5 minutes - anything longer risks rambling and losing the interviewer&apos;s attention.</p>

          <div className="bg-light rounded-xl p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-mid mb-2">Key considerations</p>
            <ul className="list-disc pl-5 space-y-1.5 text-sm">
              <li>One-way recorded interviews commonly have 2-3 minute limits per question.</li>
              <li>Quality &gt; quantity - a focused 90-second answer beats a rambling 4-minute one.</li>
              <li>Structure answers with the STAR method (Situation, Task, Action, Result).</li>
              <li>Aim for consistency - keep answers within a similar time frame.</li>
            </ul>
          </div>

          <div className="bg-light rounded-xl p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-mid mb-2">Pro tip</p>
            <p className="text-sm">Practise by recording yourself to check pacing.</p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full bg-black hover:bg-[#1a1a1a] text-white font-bold py-2.5 rounded-full text-sm mt-5 transition-colors"
        >
          Got it
        </button>
      </div>
    </div>
  )
}
