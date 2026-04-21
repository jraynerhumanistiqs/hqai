'use client'
import { useState } from 'react'

interface Props {
  questions: string[]
  setQuestions: (qs: string[]) => void
}

export function QuestionsPanel({ questions, setQuestions }: Props) {
  const [editingIdx, setEditingIdx] = useState<number | null>(null)
  const [editVal, setEditVal]       = useState('')
  const [addingNew, setAddingNew]   = useState(false)
  const [newQ, setNewQ]             = useState('')

  function startEdit(i: number) { setEditingIdx(i); setEditVal(questions[i]) }
  function saveEdit(i: number) {
    if (!editVal.trim()) return
    const next = [...questions]; next[i] = editVal.trim()
    setQuestions(next); setEditingIdx(null)
  }
  function deleteQ(i: number) { setQuestions(questions.filter((_, idx) => idx !== i)) }
  function confirmAdd() {
    if (!newQ.trim()) return
    setQuestions([...questions, newQ.trim()]); setNewQ(''); setAddingNew(false)
  }

  if (!questions.length) return null

  return (
    <div className="bg-[#111111] border border-[#222] rounded-2xl p-5 mb-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-bold text-[#fd7325] uppercase tracking-widest">Pre-Screen Questions</p>
        <button
          onClick={() => setAddingNew(true)}
          className="text-xs text-gray-400 hover:text-white transition-colors"
        >
          + Add question
        </button>
      </div>

      <div className="space-y-2">
        {questions.map((q, i) => (
          <div key={i} className="flex items-start gap-3 bg-[#0a0a0a] border border-[#222] rounded-xl px-3 py-2.5 group">
            <span className="text-[10px] font-bold text-[#fd7325] mt-0.5 flex-shrink-0">Q{i + 1}</span>
            {editingIdx === i ? (
              <input
                autoFocus
                className="flex-1 bg-transparent text-white text-sm outline-none border-b border-[#fd7325]/40 pb-0.5"
                value={editVal}
                onChange={e => setEditVal(e.target.value)}
                onBlur={() => saveEdit(i)}
                onKeyDown={e => { if (e.key === 'Enter') saveEdit(i); if (e.key === 'Escape') setEditingIdx(null) }}
              />
            ) : (
              <span
                className="flex-1 text-sm text-gray-200 cursor-pointer hover:text-white"
                onClick={() => startEdit(i)}
              >
                {q}
              </span>
            )}
            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
              <button onClick={() => startEdit(i)} className="text-xs text-gray-500 hover:text-white transition-colors">Edit</button>
              <button onClick={() => deleteQ(i)} className="text-xs text-gray-500 hover:text-red-400 transition-colors">✕</button>
            </div>
          </div>
        ))}
      </div>

      {addingNew && (
        <div className="flex items-center gap-2 mt-3">
          <input
            autoFocus
            className="flex-1 bg-[#0a0a0a] border border-[#333] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#fd7325]/60"
            placeholder="Type your question here…"
            value={newQ}
            onChange={e => setNewQ(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') confirmAdd(); if (e.key === 'Escape') { setAddingNew(false); setNewQ('') } }}
          />
          <button onClick={confirmAdd} className="bg-[#fd7325] hover:bg-[#e5671f] text-white text-xs font-bold px-3 py-2 rounded-lg transition-colors">Add</button>
          <button onClick={() => { setAddingNew(false); setNewQ('') }} className="text-gray-500 hover:text-white text-xs transition-colors">Cancel</button>
        </div>
      )}
    </div>
  )
}
