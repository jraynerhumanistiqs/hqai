'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { PrescreenNote, TeamMember } from '@/lib/recruit-types'

interface Props {
  responseId: string
}

function initials(name: string) {
  return (name || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
}

function renderBody(body: string, memberById: Record<string, TeamMember>, mentionIds: string[]) {
  // Split on @token and render any @<name> that matches a mentioned teammate as a chip.
  const parts: Array<{ text: string; chip: boolean }> = []
  const re = /(@[A-Za-z][\w\-\.]*)/g
  let last = 0
  const mentionedNames = new Set(
    mentionIds.map(id => memberById[id]?.name).filter(Boolean).map(n => n!.toLowerCase().replace(/\s+/g, '')),
  )
  let m: RegExpExecArray | null
  while ((m = re.exec(body))) {
    if (m.index > last) parts.push({ text: body.slice(last, m.index), chip: false })
    const token = m[0].slice(1).toLowerCase().replace(/\s+/g, '')
    const isChip = mentionedNames.has(token) || mentionIds.length > 0
    parts.push({ text: m[0], chip: isChip })
    last = m.index + m[0].length
  }
  if (last < body.length) parts.push({ text: body.slice(last), chip: false })
  return parts
}

export function NotesPanel({ responseId }: Props) {
  const [notes, setNotes]         = useState<PrescreenNote[]>([])
  const [loading, setLoading]     = useState(true)
  const [members, setMembers]     = useState<TeamMember[]>([])
  const [text, setText]           = useState('')
  const [mentions, setMentions]   = useState<string[]>([])
  const [saving, setSaving]       = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState('')
  const [me, setMe]               = useState<string | null>(null)

  const [acOpen, setAcOpen]       = useState(false)
  const [acQuery, setAcQuery]     = useState('')
  const [acIndex, setAcIndex]     = useState(0)
  const textareaRef               = useRef<HTMLTextAreaElement | null>(null)

  useEffect(() => {
    const supa = createClient()
    supa.auth.getUser().then(({ data }) => setMe(data.user?.id ?? null))
  }, [])

  useEffect(() => {
    let cancelled = false
    fetch(`/api/prescreen/responses/${responseId}/notes`)
      .then(r => r.json())
      .then(d => { if (!cancelled) setNotes(d.notes ?? []) })
      .catch(console.error)
      .finally(() => { if (!cancelled) setLoading(false) })
    fetch('/api/team/members')
      .then(r => r.json())
      .then(d => { if (!cancelled) setMembers(d.members ?? []) })
      .catch(console.error)
    return () => { cancelled = true }
  }, [responseId])

  // Realtime subscribe to notes for this response
  useEffect(() => {
    const supa = createClient()
    const channel = supa
      .channel(`prescreen_notes:${responseId}`)
      .on(
        // @ts-expect-error - generic types for postgres_changes
        'postgres_changes',
        { event: '*', schema: 'public', table: 'prescreen_notes', filter: `response_id=eq.${responseId}` },
        (payload: any) => {
          setNotes(prev => {
            if (payload.eventType === 'INSERT') {
              if (prev.some(n => n.id === payload.new.id)) return prev
              return [...prev, payload.new]
            }
            if (payload.eventType === 'UPDATE') {
              return prev.map(n => n.id === payload.new.id ? { ...n, ...payload.new } : n)
            }
            if (payload.eventType === 'DELETE') {
              return prev.filter(n => n.id !== payload.old.id)
            }
            return prev
          })
        },
      )
      .subscribe()
    return () => { supa.removeChannel(channel) }
  }, [responseId])

  const memberById = useMemo(() => {
    const m: Record<string, TeamMember> = {}
    members.forEach(t => { m[t.id] = t })
    return m
  }, [members])

  const acMatches = useMemo(() => {
    if (!acQuery) return members.slice(0, 6)
    const q = acQuery.toLowerCase()
    return members.filter(m => m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q)).slice(0, 6)
  }, [members, acQuery])

  function onTextChange(v: string) {
    setText(v)
    const ta = textareaRef.current
    const caret = ta?.selectionStart ?? v.length
    const before = v.slice(0, caret)
    const m = before.match(/@([A-Za-z][\w\-\.]*)$/)
    if (m) {
      setAcOpen(true)
      setAcQuery(m[1])
      setAcIndex(0)
    } else {
      setAcOpen(false)
    }
  }

  function pickMention(member: TeamMember) {
    const ta = textareaRef.current
    const caret = ta?.selectionStart ?? text.length
    const before = text.slice(0, caret)
    const after = text.slice(caret)
    const replaced = before.replace(/@([A-Za-z][\w\-\.]*)$/, `@${member.name.replace(/\s+/g, '')}`)
    const next = replaced + ' ' + after
    setText(next)
    setMentions(prev => prev.includes(member.id) ? prev : [...prev, member.id])
    setAcOpen(false)
    setTimeout(() => ta?.focus(), 0)
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (!acOpen || acMatches.length === 0) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setAcIndex(i => (i + 1) % acMatches.length) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setAcIndex(i => (i - 1 + acMatches.length) % acMatches.length) }
    else if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); pickMention(acMatches[acIndex]) }
    else if (e.key === 'Escape') { setAcOpen(false) }
  }

  async function submit() {
    const trimmed = text.trim()
    if (!trimmed) return
    setSaving(true)
    try {
      // Keep only mentions whose handle actually appears in body.
      const used = mentions.filter(id => {
        const name = memberById[id]?.name.replace(/\s+/g, '') ?? ''
        return new RegExp(`@${name}\\b`, 'i').test(trimmed)
      })
      const res = await fetch(`/api/prescreen/responses/${responseId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: trimmed, mentions: used }),
      })
      if (res.ok) { setText(''); setMentions([]) }
    } finally {
      setSaving(false)
    }
  }

  async function saveEdit(id: string) {
    const body = editDraft.trim()
    if (!body) return
    await fetch(`/api/prescreen/notes/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body }),
    })
    setEditingId(null)
    setEditDraft('')
  }

  async function remove(id: string) {
    if (!confirm('Delete this note?')) return
    await fetch(`/api/prescreen/notes/${id}`, { method: 'DELETE' })
  }

  return (
    <div className="bg-white rounded-2xl border border-border shadow-card overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <div>
          <p className="text-xs font-bold text-ink uppercase tracking-widest">
            Internal notes
            <span className="ml-2 text-mid normal-case font-normal">{notes.length}</span>
          </p>
          <p className="text-[11px] text-mid mt-0.5">Only your team sees these.</p>
        </div>
      </div>

      <div className="divide-y divide-border">
        {loading && (
          <div className="px-5 py-6 text-xs text-mid">Loading notes...</div>
        )}
        {!loading && notes.length === 0 && (
          <div className="px-5 py-6 text-xs text-mid">No notes yet. Start the conversation below.</div>
        )}
        {notes.map(n => {
          const isMine = me && n.author_id === me
          const authorName = n.author_name ?? (n.author_email?.split('@')[0] ?? 'Teammate')
          const parts = renderBody(n.body, memberById, Array.isArray(n.mentions) ? n.mentions : [])
          return (
            <div key={n.id} className="px-5 py-3 flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-light flex items-center justify-center text-[11px] font-bold text-ink flex-shrink-0">
                {initials(authorName)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-ink truncate">{authorName}</p>
                  <span className="text-[11px] text-mid">
                    {new Date(n.created_at).toLocaleString('en-AU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    {n.edited_at ? ' - edited' : ''}
                  </span>
                </div>
                {editingId === n.id ? (
                  <div className="mt-1 flex items-end gap-2">
                    <textarea
                      className="flex-1 border border-border rounded-lg px-3 py-2 text-sm text-ink focus:outline-none focus:border-black bg-white"
                      rows={2}
                      value={editDraft}
                      onChange={e => setEditDraft(e.target.value)}
                    />
                    <button
                      onClick={() => saveEdit(n.id)}
                      className="text-xs font-bold px-3 py-2 rounded-full bg-accent text-ink-on-accent"
                    >Save</button>
                    <button
                      onClick={() => { setEditingId(null); setEditDraft('') }}
                      className="text-xs font-bold px-3 py-2 rounded-full text-mid hover:text-ink"
                    >Cancel</button>
                  </div>
                ) : (
                  <p className="text-sm text-charcoal mt-0.5 whitespace-pre-wrap break-words">
                    {parts.map((p, i) => p.chip ? (
                      <span key={i} className="bg-light px-1 rounded text-ink font-bold">{p.text}</span>
                    ) : (
                      <span key={i}>{p.text}</span>
                    ))}
                  </p>
                )}
              </div>
              {isMine && editingId !== n.id && (
                <div className="flex-shrink-0 flex items-center gap-2 text-[11px]">
                  <button
                    onClick={() => { setEditingId(n.id); setEditDraft(n.body) }}
                    className="text-mid hover:text-ink font-bold"
                  >Edit</button>
                  <button
                    onClick={() => remove(n.id)}
                    className="text-mid hover:text-danger font-bold"
                  >Delete</button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="border-t border-border p-4 relative">
        <textarea
          ref={textareaRef}
          className="w-full border border-border rounded-lg px-3 py-2 text-sm text-ink placeholder-mid/60 focus:outline-none focus:border-black bg-white"
          rows={2}
          placeholder="Add a note. Type @ to tag a teammate."
          value={text}
          onChange={e => onTextChange(e.target.value)}
          onKeyDown={onKeyDown}
        />
        {acOpen && acMatches.length > 0 && (
          <div className="absolute left-4 bottom-20 bg-white border border-border rounded-2xl shadow-card z-10 w-64 max-h-56 overflow-y-auto">
            {acMatches.map((m, i) => (
              <button
                key={m.id}
                onMouseDown={e => { e.preventDefault(); pickMention(m) }}
                className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 ${
                  i === acIndex ? 'bg-light' : 'hover:bg-light'
                }`}
              >
                <div className="w-6 h-6 rounded-full bg-light flex items-center justify-center text-[10px] font-bold text-ink flex-shrink-0">
                  {initials(m.name)}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-ink truncate">{m.name}</p>
                  <p className="text-[11px] text-mid truncate">{m.email}</p>
                </div>
              </button>
            ))}
          </div>
        )}
        <div className="flex items-center justify-end gap-2 mt-2">
          <button
            onClick={submit}
            disabled={saving || !text.trim()}
            className="text-xs font-bold px-4 py-2 rounded-full bg-black text-white disabled:opacity-40"
          >
            {saving ? 'Posting...' : 'Post note'}
          </button>
        </div>
      </div>
    </div>
  )
}
