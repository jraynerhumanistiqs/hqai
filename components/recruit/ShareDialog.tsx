'use client'
import { useEffect, useState } from 'react'
import type { PrescreenShareLink } from '@/lib/recruit-types'

interface Props {
  responseId: string
  candidateName: string
  roleTitle: string
  company: string
  onClose: () => void
}

type HydratedLink = PrescreenShareLink & { url: string; view_count: number }

export function ShareDialog({ responseId, candidateName, roleTitle, company, onClose }: Props) {
  const [label, setLabel]       = useState('')
  const [days, setDays]         = useState(14)
  const [creating, setCreating] = useState(false)
  const [links, setLinks]       = useState<HydratedLink[]>([])
  const [loading, setLoading]   = useState(true)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [justCreated, setJustCreated] = useState<HydratedLink | null>(null)

  const [emailOpen, setEmailOpen]   = useState<string | null>(null)
  const [emailTo, setEmailTo]       = useState('')
  const [sending, setSending]       = useState(false)
  const [emailSent, setEmailSent]   = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch(`/api/prescreen/responses/${responseId}/share`)
      .then(r => r.json())
      .then(d => { if (!cancelled) setLinks(d.links ?? []) })
      .catch(console.error)
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [responseId])

  async function create() {
    setCreating(true)
    try {
      const res = await fetch(`/api/prescreen/responses/${responseId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: label.trim() || undefined, expiresInDays: days }),
      })
      const data = await res.json()
      if (res.ok && data.link && data.url) {
        const item: HydratedLink = { ...data.link, url: data.url, view_count: 0 }
        setLinks(prev => [item, ...prev])
        setJustCreated(item)
        setLabel('')
      }
    } finally {
      setCreating(false)
    }
  }

  async function copyUrl(url: string, id: string) {
    await navigator.clipboard.writeText(url)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 1800)
  }

  async function revoke(id: string) {
    if (!confirm('Revoke this review link? Anyone with the URL will lose access.')) return
    await fetch(`/api/prescreen/share/${id}`, { method: 'DELETE' })
    setLinks(prev => prev.map(l => l.id === id ? { ...l, revoked_at: new Date().toISOString() } : l))
  }

  async function sendByEmail(link: HydratedLink) {
    if (!emailTo.trim()) return
    setSending(true)
    try {
      const res = await fetch('/api/prescreen/share/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: emailTo.trim(),
          reviewUrl: link.url,
          candidateName,
          roleTitle,
          company,
          expiresAt: link.expires_at,
        }),
      })
      if (res.ok) {
        setEmailSent(true)
        setTimeout(() => { setEmailSent(false); setEmailOpen(null); setEmailTo('') }, 2000)
      }
    } finally {
      setSending(false)
    }
  }

  function status(link: HydratedLink): string {
    if (link.revoked_at) return 'revoked'
    if (link.expires_at && new Date(link.expires_at) < new Date()) return 'expired'
    return 'active'
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-card max-w-xl w-full max-h-[85vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <p className="text-xs font-bold text-black uppercase tracking-widest">Share with hiring manager</p>
          <button onClick={onClose} className="text-mid hover:text-black text-lg leading-none">&times;</button>
        </div>

        <div className="px-5 py-4 border-b border-border space-y-3">
          <div>
            <label className="block text-xs font-bold text-black mb-1">Label (optional)</label>
            <input
              className="w-full border border-border rounded-lg px-3 py-2 text-sm text-black placeholder-mid/60 focus:outline-none focus:border-black bg-white"
              placeholder="e.g. Sarah - Hiring Manager"
              value={label}
              onChange={e => setLabel(e.target.value)}
              maxLength={80}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-black mb-1">Expiry</label>
            <div className="flex items-center gap-1">
              {[7, 14, 30].map(d => (
                <button
                  key={d}
                  onClick={() => setDays(d)}
                  className={`text-xs font-bold px-3 py-1.5 rounded-full border transition-colors ${
                    days === d ? 'bg-black text-white border-black' : 'bg-white text-mid border-border hover:text-black'
                  }`}
                >{d} days</button>
              ))}
            </div>
          </div>
          <button
            onClick={create}
            disabled={creating}
            className="text-xs font-bold px-4 py-2 rounded-full bg-black text-white disabled:opacity-40"
          >
            {creating ? 'Creating...' : 'Generate review link'}
          </button>

          {justCreated && (
            <div className="mt-2 flex items-center gap-2 bg-bg border border-border rounded-lg px-3 py-2">
              <code className="flex-1 text-xs text-black truncate font-mono">{justCreated.url}</code>
              <button
                onClick={() => copyUrl(justCreated.url, justCreated.id)}
                className="text-xs text-mid hover:text-black font-bold flex-shrink-0"
              >{copiedId === justCreated.id ? 'Copied' : 'Copy'}</button>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="px-5 py-3 border-b border-border">
            <p className="text-xs font-bold text-black uppercase tracking-widest">Active links</p>
          </div>
          {loading && <div className="px-5 py-4 text-xs text-mid">Loading...</div>}
          {!loading && links.length === 0 && (
            <div className="px-5 py-4 text-xs text-mid">No review links yet.</div>
          )}
          <div className="divide-y divide-border">
            {links.map(l => {
              const st = status(l)
              return (
                <div key={l.id} className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-black truncate">{l.label ?? 'Untitled link'}</p>
                      <p className="text-[11px] text-mid">
                        {st === 'active' ? `Expires ${new Date(l.expires_at!).toLocaleDateString('en-AU')}` : st}
                        {' - '}{l.view_count} view{l.view_count === 1 ? '' : 's'}
                      </p>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border capitalize ${
                      st === 'active' ? 'bg-green-50 text-green-600 border-green-200' :
                      st === 'revoked' ? 'bg-light text-mid border-border' :
                      'bg-amber-50 text-amber-700 border-amber-200'
                    }`}>{st}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <code className="flex-1 text-[11px] text-mid bg-bg border border-border rounded-lg px-2 py-1 truncate font-mono">{l.url}</code>
                    <button
                      onClick={() => copyUrl(l.url, l.id)}
                      className="text-[11px] font-bold text-mid hover:text-black flex-shrink-0"
                    >{copiedId === l.id ? 'Copied' : 'Copy'}</button>
                    {st === 'active' && (
                      <>
                        <button
                          onClick={() => { setEmailOpen(emailOpen === l.id ? null : l.id); setEmailTo(''); setEmailSent(false) }}
                          className="text-[11px] font-bold text-mid hover:text-black flex-shrink-0"
                        >Email</button>
                        <button
                          onClick={() => revoke(l.id)}
                          className="text-[11px] font-bold text-mid hover:text-danger flex-shrink-0"
                        >Revoke</button>
                      </>
                    )}
                  </div>
                  {emailOpen === l.id && (
                    <div className="mt-2 flex items-center gap-2">
                      <input
                        type="email"
                        placeholder="recipient@company.com"
                        className="flex-1 border border-border rounded-lg px-3 py-1.5 text-xs text-black focus:outline-none focus:border-black bg-white"
                        value={emailTo}
                        onChange={e => setEmailTo(e.target.value)}
                      />
                      <button
                        onClick={() => sendByEmail(l)}
                        disabled={sending || !emailTo.trim()}
                        className="text-xs font-bold px-3 py-1.5 rounded-full bg-black text-white disabled:opacity-40"
                      >{emailSent ? 'Sent' : sending ? 'Sending...' : 'Send'}</button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
