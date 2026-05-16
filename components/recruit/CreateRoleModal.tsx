'use client'
import { useState, useEffect, useRef } from 'react'
import type { PrescreenSession, RubricDimension, RubricMode } from '@/lib/recruit-types'
import { DEFAULT_SHORTLISTED_TEMPLATE, DEFAULT_REJECTED_TEMPLATE } from '@/lib/outcome-templates'

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
  // Interview types - default to video for backward compatibility.
  // Either one or both can be selected. Phone-only roles skip the
  // candidate-self-serve recording flow and rely on the recruiter's
  // PhoneRecorder in the role detail.
  const [interviewTypes, setInterviewTypes] = useState<Array<'video' | 'phone'>>(['video'])
  const [company, setCompany]         = useState('')
  const [roleTitle, setRoleTitle]     = useState('')
  const [description, setDescription] = useState('')
  const [minutes, setMinutes]         = useState(1)
  const [seconds, setSeconds]         = useState(30)
  const [qCount, setQCount]           = useState<number>(4)
  const [customQCount, setCustomQCount] = useState<string>('')
  const descriptionRef = useRef<HTMLTextAreaElement | null>(null)

  const [rubricMode, setRubricMode] = useState<RubricMode>('standard')
  const [customRubric, setCustomRubric] = useState<RubricDimension[]>([
    { name: '', description: '' },
    { name: '', description: '' },
    { name: '', description: '' },
  ])

  // Phase 4 outcome-email section
  const [outcomeOpen, setOutcomeOpen]       = useState(false)
  const [autoSend, setAutoSend]             = useState(false)
  const [slSubject, setSlSubject]           = useState(DEFAULT_SHORTLISTED_TEMPLATE.subject)
  const [slBody, setSlBody]                 = useState(DEFAULT_SHORTLISTED_TEMPLATE.body)
  const [rjSubject, setRjSubject]           = useState(DEFAULT_REJECTED_TEMPLATE.subject)
  const [rjBody, setRjBody]                 = useState(DEFAULT_REJECTED_TEMPLATE.body)

  function autoGrow(el: HTMLTextAreaElement | null) {
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }

  const effectiveQCount = qCount === 0
    ? Math.max(1, Math.min(20, parseInt(customQCount, 10) || 4))
    : qCount
  const [questions, setQuestions]     = useState<string[]>([])
  const [generating, setGenerating]   = useState(false)
  const [creating, setCreating]       = useState(false)
  const [savingDraft, setSavingDraft] = useState(false)
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

  function addRubricDim() {
    setCustomRubric(prev => prev.length >= 6 ? prev : [...prev, { name: '', description: '' }])
  }
  function removeRubricDim(i: number) {
    setCustomRubric(prev => prev.length <= 3 ? prev : prev.filter((_, idx) => idx !== i))
  }
  function updateRubricDim(i: number, patch: Partial<RubricDimension>) {
    setCustomRubric(prev => prev.map((d, idx) => idx === i ? { ...d, ...patch } : d))
  }

  async function handleGenerate() {
    if (!roleTitle.trim()) { setError('Please enter a role title first.'); return }
    setError('')
    setGenerating(true)
    try {
      const res = await fetch('/api/prescreen/questions/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role_title: roleTitle.trim(), description: description.trim(), count: effectiveQCount }),
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

  async function handleSaveDraft() {
    if (!company.trim() || !roleTitle.trim()) { setError('Please enter company and role title before saving a draft.'); return }
    setError('')
    setSavingDraft(true)
    try {
      const res = await fetch('/api/prescreen/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company: company.trim(),
          role_title: roleTitle.trim(),
          questions: questions.filter(q => q.trim()),
          time_limit_seconds: timeLimit,
          rubric_mode: rubricMode,
          interview_types: interviewTypes,
          status: 'draft',
        }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      onCreated(data.session, data.candidateUrl)
    } catch {
      setError('Failed to save draft. Please try again.')
    } finally {
      setSavingDraft(false)
    }
  }

  async function handleCreate() {
    const filled = questions.filter(q => q.trim())
    if (!company.trim() || !roleTitle.trim()) { setError('Please enter company and role title.'); return }
    if (!filled.length) { setError('Please add at least one question.'); return }

    let customRubricPayload: RubricDimension[] | null = null
    if (rubricMode === 'custom') {
      const cleaned = customRubric
        .map(d => ({ name: d.name.trim(), description: d.description.trim() }))
        .filter(d => d.name && d.description)
      if (cleaned.length < 3 || cleaned.length > 6) {
        setError('Custom rubric needs 3-6 dimensions, each with a name and description.')
        return
      }
      customRubricPayload = cleaned
    }

    // Serialise outcome templates as JSON only if they differ from the default
    // (keeps the DB column null when the user didn't change anything).
    const slTpl = (slSubject !== DEFAULT_SHORTLISTED_TEMPLATE.subject || slBody !== DEFAULT_SHORTLISTED_TEMPLATE.body)
      ? JSON.stringify({ subject: slSubject, body: slBody })
      : null
    const rjTpl = (rjSubject !== DEFAULT_REJECTED_TEMPLATE.subject || rjBody !== DEFAULT_REJECTED_TEMPLATE.body)
      ? JSON.stringify({ subject: rjSubject, body: rjBody })
      : null

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
          rubric_mode: rubricMode,
          custom_rubric: customRubricPayload,
          interview_types: interviewTypes,
          auto_send_outcomes: autoSend,
          outcome_email_shortlisted: slTpl,
          outcome_email_rejected: rjTpl,
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

        <div className="px-7 py-6 max-h-[65vh] overflow-y-auto">
          {step === 'setup' ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-bold text-black mb-1.5">Company</label>
                  <input className={inputCls} value={company} onChange={e => setCompany(e.target.value)} placeholder="e.g. Acme Corp" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-black mb-1.5">Role Title</label>
                  <input className={inputCls} value={roleTitle} onChange={e => setRoleTitle(e.target.value)} placeholder="e.g. Senior Accountant" onKeyDown={e => e.key === 'Enter' && handleGenerate()} />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-black mb-1.5">
                  Role Description
                  <span className="text-mid font-normal ml-1">(help HQ.ai write better questions for you)</span>
                </label>
                <textarea
                  ref={descriptionRef}
                  className={`${inputCls} resize-none overflow-hidden min-h-[84px]`}
                  rows={3}
                  value={description}
                  onChange={e => { setDescription(e.target.value); autoGrow(e.currentTarget) }}
                  onInput={e => autoGrow(e.currentTarget as HTMLTextAreaElement)}
                  placeholder="Paste key responsibilities, must-haves and seniority level..."
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-black mb-1.5">
                  Interview type
                  <span className="text-mid font-normal ml-1">(pick one or both)</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {([
                    { id: 'video', title: 'Video pre-screen', desc: 'Candidate records video answers in their browser.' },
                    { id: 'phone', title: 'Phone screen', desc: 'Recruiter records the call. Audio is transcribed and scored against the same rubric.' },
                  ] as const).map(opt => {
                    const checked = interviewTypes.includes(opt.id)
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          setInterviewTypes(prev => {
                            if (prev.includes(opt.id)) {
                              // Don't allow unchecking the last one
                              if (prev.length === 1) return prev
                              return prev.filter(t => t !== opt.id)
                            }
                            return [...prev, opt.id]
                          })
                        }}
                        className={`flex items-start gap-2.5 p-3 rounded-xl border text-left transition-all ${checked ? 'border-black bg-black/5' : 'border-border hover:border-mid'}`}
                      >
                        <div className={`mt-0.5 w-4 h-4 rounded flex-shrink-0 flex items-center justify-center border-2 ${checked ? 'border-black bg-black' : 'border-border'}`}>
                          {checked && (
                            <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                            </svg>
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-charcoal">{opt.title}</p>
                          <p className="text-[11px] text-mid mt-0.5 leading-snug">{opt.desc}</p>
                        </div>
                      </button>
                    )
                  })}
                </div>
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
                          timeLimit === val ? 'bg-black text-white' : 'bg-light text-mid hover:bg-border'
                        }`}
                      >
                        {val < 60 ? `${val}s` : val % 60 === 0 ? `${val / 60}m` : `${Math.floor(val / 60)}m ${val % 60}s`}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 flex items-center gap-1">
                      <input type="number" min={0} max={10} className={inputCls} value={minutes} onChange={e => updateMinutes(Number(e.target.value))} aria-label="Minutes" />
                      <span className="text-xs text-mid">min</span>
                    </div>
                    <div className="flex-1 flex items-center gap-1">
                      <input type="number" min={0} max={59} className={inputCls} value={seconds} onChange={e => updateSeconds(Number(e.target.value))} aria-label="Seconds" />
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
                    <option value={0}>&lt;6 questions</option>
                  </select>
                  {qCount === 0 && (
                    <input
                      type="number"
                      min={1}
                      max={20}
                      className={`${inputCls} mt-2`}
                      value={customQCount}
                      onChange={e => setCustomQCount(e.target.value)}
                      placeholder="Enter number of questions"
                    />
                  )}
                </div>
              </div>

              <div className="pt-2 border-t border-border">
                <label className="block text-sm font-bold text-black mb-2">Scoring criteria</label>
                <div className="space-y-2">
                  <label className="flex items-start gap-2.5 cursor-pointer p-2 rounded-lg hover:bg-bg/60 transition-colors">
                    <input type="radio" name="rubricMode" className="mt-0.5" checked={rubricMode === 'standard'} onChange={() => setRubricMode('standard')} />
                    <div>
                      <p className="text-sm font-bold text-black">Use HQ.ai default scoring criteria <span className="text-mid font-normal">(recommended)</span></p>
                      <p className="text-xs text-mid mt-0.5">Clarity, relevance, specificity, structure, role fit - each scored 1-5.</p>
                    </div>
                  </label>
                  <label className="flex items-start gap-2.5 cursor-pointer p-2 rounded-lg hover:bg-bg/60 transition-colors">
                    <input type="radio" name="rubricMode" className="mt-0.5" checked={rubricMode === 'custom'} onChange={() => setRubricMode('custom')} />
                    <div>
                      <p className="text-sm font-bold text-black">Define custom scoring criteria for this role</p>
                      <p className="text-xs text-mid mt-0.5">3-6 dimensions, each scored 1-5.</p>
                    </div>
                  </label>
                </div>

                {rubricMode === 'custom' && (
                  <div className="mt-3 space-y-2">
                    {customRubric.map((d, i) => (
                      <div key={i} className="flex items-start gap-2 group">
                        <div className="flex-1 space-y-1.5">
                          <input className={inputCls} placeholder="Dimension name (e.g. client_communication)" value={d.name} onChange={e => updateRubricDim(i, { name: e.target.value })} />
                          <input className={inputCls} placeholder="Short description of what 'strong' looks like" value={d.description} onChange={e => updateRubricDim(i, { description: e.target.value })} />
                        </div>
                        <button type="button" onClick={() => removeRubricDim(i)} disabled={customRubric.length <= 3} className="text-mid hover:text-danger transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0 mt-2 disabled:opacity-0" title="Remove dimension">
                          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/>
                          </svg>
                        </button>
                      </div>
                    ))}
                    {customRubric.length < 6 && (
                      <button type="button" onClick={addRubricDim} className="text-xs text-accent hover:text-accent2 font-bold transition-colors">+ Add dimension</button>
                    )}
                  </div>
                )}
              </div>

              {/* Phase 4: candidate outcome emails */}
              <div className="pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setOutcomeOpen(v => !v)}
                  className="w-full flex items-center justify-between text-left"
                >
                  <div>
                    <p className="text-sm font-bold text-black">Candidate outcome emails</p>
                    <p className="text-xs text-mid mt-0.5">Send a message when candidates are shortlisted or rejected.</p>
                  </div>
                  <svg className={`w-4 h-4 text-mid transition-transform ${outcomeOpen ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd"/>
                  </svg>
                </button>

                {outcomeOpen && (
                  <div className="mt-3 space-y-4">
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input type="checkbox" className="mt-0.5" checked={autoSend} onChange={e => setAutoSend(e.target.checked)} />
                      <div>
                        <p className="text-sm font-bold text-black">Auto-send when candidates are shortlisted or rejected <span className="text-mid font-normal">(default off)</span></p>
                        <p className="text-xs text-mid mt-0.5">When off, the email is queued and you can trigger it manually from the candidate view.</p>
                      </div>
                    </label>

                    <p className="text-[10px] text-mid">Variables: <code className="font-mono">{'{candidate_first_name}'}</code>, <code className="font-mono">{'{candidate_name}'}</code>, <code className="font-mono">{'{role_title}'}</code>, <code className="font-mono">{'{company}'}</code>, <code className="font-mono">{'{calendly_block}'}</code> (shortlisted only).</p>

                    <div className="space-y-1.5">
                      <p className="text-xs font-bold text-black">Shortlisted email</p>
                      <input className={inputCls} value={slSubject} onChange={e => setSlSubject(e.target.value)} placeholder="Subject" />
                      <textarea className={`${inputCls} min-h-[140px]`} value={slBody} onChange={e => setSlBody(e.target.value)} placeholder="Body" />
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-xs font-bold text-black">Rejected email</p>
                      <input className={inputCls} value={rjSubject} onChange={e => setRjSubject(e.target.value)} placeholder="Subject" />
                      <textarea className={`${inputCls} min-h-[140px]`} value={rjBody} onChange={e => setRjBody(e.target.value)} placeholder="Body" />
                      <p className="text-[10px] text-mid">Rejection emails contain no scores or AI output by default - keep it warm and brief.</p>
                    </div>
                  </div>
                )}
              </div>

              {error && <p className="text-xs text-danger">{error}</p>}

              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 pt-1">
                <button
                  onClick={handleGenerate}
                  disabled={generating || !roleTitle.trim()}
                  className="flex-1 bg-black hover:bg-charcoal disabled:bg-light disabled:text-mid disabled:cursor-not-allowed text-white text-sm font-bold py-2.5 rounded-full transition-colors inline-flex items-center justify-center gap-2"
                >
                  {generating ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>Generate questions with AI</>
                  )}
                </button>
                <button
                  onClick={addManualQuestion}
                  className="text-sm text-mid hover:text-black font-bold transition-colors px-3 py-2 whitespace-nowrap self-start sm:self-auto"
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
                    placeholder="Enter question..."
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

        <div className="px-7 py-5 border-t border-border flex items-center justify-between bg-bg/50">
          <div>
            {step === 'questions' && (
              <button onClick={() => setStep('setup')} className="text-sm text-mid hover:text-black font-bold transition-colors">
                Back
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="text-sm text-mid hover:text-black font-bold transition-colors">
              Cancel
            </button>
            <button
              onClick={handleSaveDraft}
              disabled={savingDraft || creating || !company.trim() || !roleTitle.trim()}
              className="text-sm font-bold text-black border border-border hover:bg-light disabled:opacity-40 px-4 py-2.5 rounded-full transition-colors"
              title="Save current progress as a draft - you can finish questions later"
            >
              {savingDraft ? 'Saving…' : 'Save as draft'}
            </button>
            {step === 'questions' && (
              <button
                onClick={handleCreate}
                disabled={creating || savingDraft || !questions.filter(q => q.trim()).length}
                className="bg-accent hover:bg-accent2 disabled:opacity-40 text-white text-base font-bold px-6 py-3 rounded-full transition-colors flex items-center gap-2"
              >
                {creating ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Role'
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
          <p><strong>Absolute maximum:</strong> 4-5 minutes - anything longer risks rambling.</p>
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
