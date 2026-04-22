'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

interface CommandBarProps {
  advisorName?: string
}

const COMMANDS = [
  { group: 'Navigate', items: [
    { label: 'HQ People - HR compliance',     href: '/dashboard',               icon: '👥', keys: ['P'] },
    { label: 'HQ Recruit - talent',           href: '/dashboard/recruit',       icon: '🔍', keys: ['R'] },
    { label: 'Documents library',             href: '/dashboard/documents',     icon: '📄', keys: ['D'] },
    { label: 'Award interpreter',             href: '/dashboard/awards',        icon: '⚖️', keys: ['A'] },
    { label: 'Performance tools',             href: '/dashboard/performance',   icon: '📊', keys: [] },
    { label: 'Settings',                      href: '/dashboard/settings',      icon: '⚙️', keys: [] },
  ]},
  { group: 'Quick actions', items: [
    { label: 'Generate employment contract',  prompt: 'Generate an employment contract for a new employee', icon: '📝', keys: [] },
    { label: 'Write a job advertisement',     prompt: 'Write a job advertisement for a new role',          icon: '📢', keys: [] },
    { label: 'Check award rates',             prompt: 'What are the current penalty rates for my industry?',icon: '💰', keys: [] },
    { label: 'Start a performance plan',      prompt: 'I need to create a performance improvement plan',   icon: '📈', keys: [] },
    { label: 'Casual conversion check',       prompt: 'Explain my casual conversion obligations',          icon: '🔄', keys: [] },
    { label: 'Redundancy process guide',      prompt: 'Walk me through the redundancy process',            icon: '📋', keys: [] },
  ]},
]

export default function CommandBar({ advisorName = 'Hugo' }: CommandBarProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  // Open with Cmd+K or Ctrl+K
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(o => !o)
        setQuery('')
        setSelected(0)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Focus input when opened
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50)
  }, [open])

  // Filter commands
  const filtered = query
    ? COMMANDS.map(g => ({
        ...g,
        items: g.items.filter(i => i.label.toLowerCase().includes(query.toLowerCase()))
      })).filter(g => g.items.length > 0)
    : COMMANDS

  const allItems = filtered.flatMap(g => g.items)

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelected(s => Math.min(s + 1, allItems.length - 1))
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelected(s => Math.max(s - 1, 0))
    }
    if (e.key === 'Enter') {
      const item = allItems[selected]
      if (item) execute(item)
    }
  }

  function execute(item: any) {
    setOpen(false)
    setQuery('')
    if (item.href) {
      router.push(item.href)
    } else if (item.prompt) {
      // Store prompt in sessionStorage for the chat to pick up
      sessionStorage.setItem('hq_cmd_prompt', item.prompt)
      router.push('/dashboard')
    }
  }

  if (!open) return null

  let globalIndex = 0

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]"
      onClick={() => setOpen(false)}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative w-full max-w-[560px] mx-4 bg-white rounded-xl shadow-modal overflow-hidden slide-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[#E4E4E2]">
          <svg className="w-4 h-4 text-[#6B6B6B] flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd"/>
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={e => { setQuery(e.target.value); setSelected(0) }}
            onKeyDown={handleKeyDown}
            placeholder="Search or ask HQ anything…"
            className="flex-1 text-[14px] text-[#0A0A0A] placeholder-[#6B6B6B] outline-none bg-transparent"
          />
          <kbd className="text-[10px] text-[#6B6B6B] bg-[#F7F7F5] border border-[#E4E4E2] rounded px-1.5 py-0.5">ESC</kbd>
        </div>

        {/* Results */}
        <div className="max-h-[360px] overflow-y-auto scrollbar-thin py-2">
          {allItems.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-[13px] text-[#6B6B6B]">No results for "{query}"</p>
              <p className="text-[12px] text-[#6B6B6B]/60 mt-1">Try asking HQ directly in the chat</p>
            </div>
          ) : (
            filtered.map(group => (
              <div key={group.group}>
                <p className="text-[10px] font-medium text-[#6B6B6B] uppercase tracking-widest px-4 py-1.5">
                  {group.group}
                </p>
                {group.items.map(item => {
                  const idx = globalIndex++
                  return (
                    <button
                      key={item.label}
                      onClick={() => execute(item)}
                      onMouseEnter={() => setSelected(idx)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors
                        ${selected === idx ? 'bg-[#F7F7F5]' : ''}`}
                    >
                      <span className="text-base w-5 text-center flex-shrink-0">{item.icon}</span>
                      <span className={`flex-1 text-[13px] font-medium ${selected === idx ? 'text-[#0A0A0A]' : 'text-[#1F1F1F]'}`}>
                        {item.label}
                      </span>
                      {item.keys?.length > 0 && (
                        <kbd className="text-[10px] text-[#6B6B6B] bg-[#F7F7F5] border border-[#E4E4E2] rounded px-1.5 py-0.5">
                          {item.keys[0]}
                        </kbd>
                      )}
                      {selected === idx && (
                        <span className="text-[10px] text-[#6B6B6B]">↵</span>
                      )}
                    </button>
                  )
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-[#E4E4E2] px-4 py-2 flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-[11px] text-[#6B6B6B]">
            <kbd className="bg-[#F7F7F5] border border-[#E4E4E2] rounded px-1 py-0.5 text-[10px]">↑↓</kbd>
            <span>Navigate</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-[#6B6B6B]">
            <kbd className="bg-[#F7F7F5] border border-[#E4E4E2] rounded px-1 py-0.5 text-[10px]">↵</kbd>
            <span>Select</span>
          </div>
          <div className="ml-auto flex items-center gap-1.5 text-[11px] text-[#6B6B6B]">
            <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
            <span>{advisorName} is available</span>
          </div>
        </div>
      </div>
    </div>
  )
}
