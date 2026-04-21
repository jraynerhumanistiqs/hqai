'use client'
import { useState } from 'react'

interface Props {
  questions: string[]
  setQuestions: (qs: string[]) => void
  onGenerateQuestions: (roleTitle: string, description: string, count: number) => Promise<void>
  onCreateSession: (payload: {
    company: string
    role_title: string
    questions: string[]
    time_limit_seconds: number
  }) => Promise<void>
}

export function RoleSetupPanel({ questions, setQuestions, onGenerateQuestions, onCreateSession }: Props) {
  const [company, setCompany]         = useState('')
  const [roleTitle, setRoleTitle]     = useState('')
  const [description, setDescription] = useState('')
  const [timeLimit, setTimeLimit]     = useState(90)
  const [qCount, setQCount]           = useState(4)
  const [generating, setGenerating]   = useState(false)
  const [creating, setCreating]       = useState(false)
  const [error, setError]             = useState('')

  const inputCls = 'w-full bg-[#0a0a0a] border border-[#333] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#fd7325]/60'

  async function handleGenerate() {
    if (!roleTitle.trim()) { setError('Please enter a role title first.'); return }
    setError(''); setGenerating(true)
    try {
      await onGenerateQuestions(roleTitle.trim(), description.trim(), qCount)
    } catch {
      setError('Question generation failed. Please try again.')
    } finally { setGenerating(false) }
  }

  async function handleCreate() {
    if (!company.trim() || !roleTitle.trim()) { setError('Please enter a company and role title.'); return }
    if (!questions.length) { setError('Please generate or add at least one question.'); return }
    setError(''); setCreating(true)
    try {
      await onCreateSession({ company, role_title: roleTitle, questions, time_limit_seconds: timeLimit })
    } finally { setCreating(false) }
  }

  return (
    <div className="bg-[#111111] border border-[#222] rounded-2xl p-5 mb-4">
      <p className="text-[10px] font-bold text-[#fd7325] uppercase tracking-widest mb-4">Role Setup</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        <div>
          <label className="block text-xs font-bold text-gray-400 mb-1">Company</label>
          <input className={inputCls} value={company} onChange={e => setCompany(e.target.value)} placeholder="e.g. Smith & Partners" />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-400 mb-1">Role Title</label>
          <input className={inputCls} value={roleTitle} onChange={e => setRoleTitle(e.target.value)} placeholder="e.g. Senior Accountant" />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-bold text-gray-400 mb-1">Role Description <span className="font-normal text-gray-600">(AI context)</span></label>
          <textarea
            className={`${inputCls} resize-none`}
            rows={3}
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Paste key responsibilities, must-haves and seniority level. AI uses this to write better questions."
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-400 mb-1">Time Limit per Answer</label>
          <select className={inputCls} value={timeLimit} onChange={e => setTimeLimit(Number(e.target.value))}>
            <option value={60}>60 seconds</option>
            <option value={90}>90 seconds</option>
            <option value={120}>2 minutes</option>
            <option value={180}>3 minutes</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-400 mb-1">Number of Questions</label>
          <select className={inputCls} value={qCount} onChange={e => setQCount(Number(e.target.value))}>
            <option value={3}>3 questions</option>
            <option value={4}>4 questions</option>
            <option value={5}>5 questions</option>
          </select>
        </div>
      </div>

      {error && <p className="text-xs text-red-400 mb-3">{error}</p>}

      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="bg-[#fd7325] hover:bg-[#e5671f] disabled:opacity-50 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors flex items-center gap-1.5"
        >
          {generating ? (
            <><span className="w-3 h-3 border border-white/40 border-t-white rounded-full animate-spin" />Generating…</>
          ) : '✦ Generate Questions with AI'}
        </button>
        <button
          onClick={handleCreate}
          disabled={!questions.length || creating}
          className="bg-[#1a1a1a] hover:bg-[#222] disabled:opacity-40 text-white text-xs font-bold px-4 py-2 rounded-lg border border-[#333] transition-colors"
        >
          {creating ? 'Creating…' : 'Create Session & Get Link →'}
        </button>
      </div>
    </div>
  )
}
