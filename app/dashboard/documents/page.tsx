'use client'
import { useEffect, useState } from 'react'

interface Doc {
  id: string
  title: string
  type: string
  content: string
  created_at: string
  status: string
}

const TYPE_ICONS: Record<string, string> = {
  'employment-contract': '📄',
  'letter-of-offer': '✉️',
  'job-advertisement': '📢',
  'warning-letter': '⚠️',
  'termination-letter': '🔴',
  'performance-improvement-plan': '📊',
  'suitable-duties-plan': '🏥',
  default: '📋',
}

const TYPE_COLORS: Record<string, string> = {
  'employment-contract': 'bg-teal3 text-teal',
  'letter-of-offer': 'bg-amber2 text-amber',
  'job-advertisement': 'bg-purple-50 text-purple-700',
  'warning-letter': 'bg-orange-50 text-orange-700',
  'termination-letter': 'bg-coral2 text-coral',
  default: 'bg-sand2 text-ink2',
}

export default function DocumentsPage() {
  const [docs, setDocs] = useState<Doc[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Doc | null>(null)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetch('/api/documents')
      .then(r => r.json())
      .then(data => { setDocs(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const docTypes = ['all', ...Array.from(new Set(docs.map(d => d.type).filter(Boolean)))]

  const filtered = docs.filter(d => {
    const matchesFilter = filter === 'all' || d.type === filter
    const matchesSearch = !search || d.title.toLowerCase().includes(search.toLowerCase())
    return matchesFilter && matchesSearch
  })

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  async function copyToClipboard(content: string) {
    await navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function downloadAsDocx(doc: Doc) {
    const a = document.createElement('a')
    a.href = `/api/documents/download?id=${doc.id}`
    a.download = `${doc.title.replace(/[^a-z0-9]/gi, '_')}.docx`
    a.click()
  }

  function downloadAsText(doc: Doc) {
    const blob = new Blob([doc.content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${doc.title.replace(/[^a-z0-9]/gi, '_')}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex h-full bg-[#000000]">
      {/* Left — list */}
      <div className="w-72 flex-shrink-0 border-r border-[#222222] flex flex-col bg-[#0a0a0a]">
        <div className="p-4 border-b border-[#222222]">
          <h2 className="font-display text-lg font-bold text-white uppercase tracking-wider mb-3">Documents</h2>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search documents…"
            className="w-full px-3 py-2 bg-[#1a1a1a] border border-[#333333] rounded-lg text-sm text-white placeholder-gray-500 outline-none focus:border-accent transition-colors"
          />
        </div>

        {/* Type filter */}
        <div className="px-3 py-2 border-b border-[#222222] flex flex-wrap gap-1.5">
          {docTypes.slice(0, 5).map(t => (
            <button key={t} onClick={() => setFilter(t)}
              className={`px-2.5 py-1 rounded-full text-xs font-bold transition-colors capitalize
                ${filter === t ? 'bg-accent text-white' : 'bg-[#1a1a1a] border border-[#333333] text-gray-400 hover:border-accent'}`}>
              {t === 'all' ? 'All' : t.replace(/-/g, ' ')}
            </button>
          ))}
        </div>

        {/* Doc list */}
        <div className="flex-1 overflow-y-auto scrollbar-thin py-2">
          {loading ? (
            <div className="flex items-center justify-center h-32 text-sm text-gray-500">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 px-4">
              <div className="text-3xl mb-3">📭</div>
              <p className="text-sm text-gray-500">
                {docs.length === 0 ? 'No documents yet. Ask HQ to generate a contract, job ad or letter.' : 'No documents match your search.'}
              </p>
            </div>
          ) : filtered.map(doc => (
            <button key={doc.id} onClick={() => setSelected(doc)}
              className={`w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-[#1a1a1a] transition-colors border-b border-[#222222]/50
                ${selected?.id === doc.id ? 'bg-[#1a1a1a]' : ''}`}>
              <span className="text-lg flex-shrink-0 mt-0.5">{TYPE_ICONS[doc.type] || TYPE_ICONS.default}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white truncate">{doc.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">{formatDate(doc.created_at)}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Right — preview */}
      {selected ? (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Doc header */}
          <div className="flex items-center gap-3 px-6 py-4 border-b border-[#222222] bg-[#0a0a0a] flex-shrink-0">
            <div>
              <h3 className="font-bold text-white">{selected.title}</h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs font-bold px-2 py-0.5 rounded-full capitalize bg-accent/20 text-accent">
                  {selected.type?.replace(/-/g, ' ') || 'document'}
                </span>
                <span className="text-xs text-gray-500">{formatDate(selected.created_at)}</span>
              </div>
            </div>
            <div className="ml-auto flex gap-2">
              <button onClick={() => copyToClipboard(selected.content)}
                className="px-3 py-1.5 bg-[#1a1a1a] border border-[#333333] rounded-lg text-xs font-bold text-gray-400 hover:bg-[#222222] transition-colors">
                {copied ? '✓ Copied' : 'Copy'}
              </button>
              <button onClick={() => downloadAsDocx(selected)}
                className="px-3 py-1.5 bg-accent text-white rounded-lg text-xs font-bold hover:bg-accent2 transition-colors">
                DOCX
              </button>
              <button onClick={() => downloadAsText(selected)}
                className="px-3 py-1.5 bg-[#1a1a1a] border border-[#333333] rounded-lg text-xs font-bold text-gray-400 hover:bg-[#222222] transition-colors">
                TXT
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto scrollbar-thin p-8">
            <div className="max-w-2xl mx-auto">
              <pre className="whitespace-pre-wrap font-sans text-sm text-gray-300 leading-relaxed">{selected.content}</pre>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center bg-[#000000]">
          <div className="text-center">
            <div className="text-4xl mb-4">📂</div>
            <p className="font-display text-lg font-bold text-white uppercase tracking-wider mb-2">Select a document</p>
            <p className="text-sm text-gray-500">Choose a document from the list to preview and download</p>
          </div>
        </div>
      )}
    </div>
  )
}
