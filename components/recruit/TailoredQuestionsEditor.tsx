'use client'

// TailoredQuestionsEditor - the per-candidate "Tailored screening
// questions" card on the Shortlist Agent, now editable.
//
// Questions are generated per candidate at handoff time (see
// lib/cv-screening-questions.ts) and stored in
// prescreen_responses.custom_questions. This editor lets the recruiter
// tweak that list before the phone screen: click a question to edit it,
// add one, remove one, or nudge the order. Every change saves
// automatically (no Save button to remember - the least-thought-required
// option) and the phone screen recorder consumes the edited list because
// it seeds from the same custom_questions field.

import { useEffect, useRef, useState } from 'react'

interface Props {
  candidateName: string
  /** The candidate's own tailored questions (prescreen_responses.custom_questions). */
  questions: string[] | null | undefined
  /** The role's shared question set - offered as a starting point when
   *  the candidate has no tailored questions yet. */
  seedQuestions?: string[]
  /** Persist the new list. Parent handles optimistic update + PATCH. */
  onSave: (next: string[]) => Promise<void> | void
}

export function TailoredQuestionsEditor({ candidateName, questions, seedQuestions, onSave }: Props) {
  const list = Array.isArray(questions)
    ? questions.filter(q => typeof q === 'string' && q.trim())
    : []
  // editingIdx === list.length means "adding a new question".
  const [editingIdx, setEditingIdx] = useState<number | null>(null)
  const [draft, setDraft] = useState('')
  const [savedFlash, setSavedFlash] = useState(false)
  const flashTimer = useRef<number | null>(null)

  useEffect(() => () => { if (flashTimer.current) window.clearTimeout(flashTimer.current) }, [])

  function persist(next: string[]) {
    void onSave(next)
    setSavedFlash(true)
    if (flashTimer.current) window.clearTimeout(flashTimer.current)
    flashTimer.current = window.setTimeout(() => setSavedFlash(false), 2000)
  }

  function startEdit(i: number, current: string) {
    setEditingIdx(i)
    setDraft(current)
  }

  function commitEdit() {
    if (editingIdx === null) return
    const text = draft.trim()
    const next = [...list]
    if (editingIdx >= list.length) {
      if (text) next.push(text)
    } else if (!text) {
      next.splice(editingIdx, 1)
    } else {
      next[editingIdx] = text
    }
    setEditingIdx(null)
    setDraft('')
    if (JSON.stringify(next) !== JSON.stringify(list)) persist(next)
  }

  function cancelEdit() {
    setEditingIdx(null)
    setDraft('')
  }

  function remove(i: number) {
    persist(list.filter((_, idx) => idx !== i))
  }

  function move(i: number, dir: -1 | 1) {
    const j = i + dir
    if (j < 0 || j >= list.length) return
    const next = [...list]
    ;[next[i], next[j]] = [next[j], next[i]]
    persist(next)
  }

  // Empty state - no tailored questions yet. Offer the role's shared set
  // as a one-click starting point, or a blank question.
  if (list.length === 0 && editingIdx === null) {
    return (
      <div className="bg-bg-elevated rounded-2xl border border-border shadow-card p-4">
        <p className="text-xs font-bold text-ink uppercase tracking-widest mb-1">Tailored screening questions</p>
        <p className="text-[11px] text-mid mb-2.5">
          No tailored questions for {candidateName} yet. Start from the role&apos;s shared set and adjust, or write your own - the phone screen recorder uses this list.
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          {Array.isArray(seedQuestions) && seedQuestions.length > 0 && (
            <button
              type="button"
              onClick={() => persist([...seedQuestions])}
              className="text-xs font-bold px-3 py-1.5 rounded-full border border-border bg-bg-elevated text-ink hover:bg-bg transition-colors"
            >
              Start from role questions
            </button>
          )}
          <button
            type="button"
            onClick={() => startEdit(0, '')}
            className="text-xs font-bold px-3 py-1.5 rounded-full border border-dashed border-border text-mid hover:text-ink hover:border-ink/40 transition-colors"
          >
            + Add a question
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-bg-elevated rounded-2xl border border-border shadow-card p-4">
      <div className="flex items-center justify-between gap-2 mb-1">
        <p className="text-xs font-bold text-ink uppercase tracking-widest">Tailored screening questions</p>
        {savedFlash && <span className="text-[10px] font-bold text-success">Saved</span>}
      </div>
      <p className="text-[11px] text-mid mb-2.5">
        Generated for {candidateName} specifically, probing the weaker spots in their CV score.
        Click a question to edit it - changes save automatically and feed the phone screen recorder.
      </p>
      <ol className="space-y-1.5">
        {list.map((q, i) => (
          <li key={`${i}-${q}`} className="group flex items-start gap-2">
            <span className="text-xs font-bold text-accent w-5 flex-shrink-0 pt-0.5">{i + 1}.</span>
            {editingIdx === i ? (
              <textarea
                autoFocus
                value={draft}
                rows={2}
                onChange={e => setDraft(e.target.value)}
                onBlur={commitEdit}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commitEdit() }
                  if (e.key === 'Escape') { e.preventDefault(); cancelEdit() }
                }}
                aria-label={`Edit question ${i + 1}`}
                className="flex-1 text-xs text-ink bg-bg border border-accent/60 rounded-lg px-2 py-1.5 leading-snug focus:outline-none focus:ring-2 focus:ring-accent/30 resize-y"
              />
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => startEdit(i, q)}
                  title="Click to edit this question"
                  className="flex-1 text-left text-xs text-charcoal leading-snug rounded-lg px-2 py-1 -mx-2 hover:bg-bg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
                >
                  {q}
                </button>
                <span className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => move(i, -1)}
                    disabled={i === 0}
                    aria-label={`Move question ${i + 1} up`}
                    className="w-5 h-5 flex items-center justify-center rounded text-mid hover:text-ink disabled:opacity-30 disabled:hover:text-mid"
                  >
                    <svg viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3" aria-hidden>
                      <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => move(i, 1)}
                    disabled={i === list.length - 1}
                    aria-label={`Move question ${i + 1} down`}
                    className="w-5 h-5 flex items-center justify-center rounded text-mid hover:text-ink disabled:opacity-30 disabled:hover:text-mid"
                  >
                    <svg viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3" aria-hidden>
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(i)}
                    aria-label={`Remove question ${i + 1}`}
                    title="Remove this question"
                    className="w-5 h-5 flex items-center justify-center rounded text-mid hover:text-danger"
                  >
                    <svg viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3" aria-hidden>
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </span>
              </>
            )}
          </li>
        ))}
        {editingIdx !== null && editingIdx >= list.length && (
          <li className="flex items-start gap-2">
            <span className="text-xs font-bold text-accent w-5 flex-shrink-0 pt-0.5">{list.length + 1}.</span>
            <textarea
              autoFocus
              value={draft}
              rows={2}
              onChange={e => setDraft(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commitEdit() }
                if (e.key === 'Escape') { e.preventDefault(); cancelEdit() }
              }}
              aria-label="New question"
              placeholder="Type the new question..."
              className="flex-1 text-xs text-ink bg-bg border border-accent/60 rounded-lg px-2 py-1.5 leading-snug focus:outline-none focus:ring-2 focus:ring-accent/30 resize-y"
            />
          </li>
        )}
      </ol>
      {editingIdx === null && (
        <button
          type="button"
          onClick={() => startEdit(list.length, '')}
          className="mt-2 text-[11px] font-bold px-2.5 py-1 rounded-full border border-dashed border-border text-mid hover:text-ink hover:border-ink/40 transition-colors"
        >
          + Add question
        </button>
      )}
    </div>
  )
}
