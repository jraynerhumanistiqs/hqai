'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import CommandBar from '@/components/ui/CommandBar'

interface Message {
  role: 'user' | 'assistant'
  content: string
  escalate?: boolean
  docType?: string | null
}

interface ChatInterfaceProps {
  module: 'people' | 'recruit'
  userName: string
  bizName: string
  advisorName: string
  industry: string
  state: string
  award: string
}

const QUICK_ACTIONS_PEOPLE = [
  { icon: '📄', label: 'Employment contract',    desc: 'Full-time, part-time or casual',       prompt: 'I need to generate an employment contract for a new employee.' },
  { icon: '⚖️', label: 'Award & penalty rates',  desc: 'Overtime, weekends, allowances',        prompt: 'What penalty rates and entitlements apply to my employees?' },
  { icon: '📊', label: 'Performance management', desc: 'PIP, warnings, coaching scripts',       prompt: 'I need to manage a performance issue with an employee. Where do I start?' },
  { icon: '🔄', label: 'Casual conversion',       desc: 'Fair Work 2023 obligations',            prompt: 'What are my casual conversion obligations under the Fair Work Act?' },
  { icon: '📋', label: 'Leave entitlements',      desc: 'Annual, personal, parental, LSL',       prompt: 'Explain all the leave entitlements my employees are entitled to.' },
  { icon: '🔔', label: 'Redundancy process',      desc: 'Consultation, pay, genuine test',       prompt: 'I need to make a role redundant. What process do I need to follow?' },
]

const QUICK_ACTIONS_RECRUIT = [
  { icon: '📢', label: 'Write a job ad',          desc: 'SEEK & LinkedIn ready',                 prompt: 'I need to write a job advertisement for a new role.' },
  { icon: '🔍', label: 'Screening questions',      desc: 'Role-relevant, compliant',              prompt: 'Generate screening questions for a role I am recruiting for.' },
  { icon: '📞', label: 'Phone interview guide',    desc: 'Structured call template',              prompt: 'I need a phone interview guide for screening candidates.' },
  { icon: '⭐', label: 'Candidate scorecard',      desc: 'Standardised evaluation',               prompt: 'Create a candidate scorecard for evaluating applicants.' },
  { icon: '📋', label: 'Reference check',          desc: 'Structured referee questions',          prompt: 'I need a reference check template for a candidate.' },
  { icon: '✉️', label: 'Rejection email',          desc: 'Professional, compliant',               prompt: 'Write an unsuccessful candidate email.' },
]

export default function ChatInterface({ module, userName, bizName, advisorName, industry, state, award }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [showAdvisorModal, setShowAdvisorModal] = useState(false)
  const [savedDocId, setSavedDocId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const quickActions = module === 'recruit' ? QUICK_ACTIONS_RECRUIT : QUICK_ACTIONS_PEOPLE

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  // Check for command bar prompt
  useEffect(() => {
    const cmdPrompt = sessionStorage.getItem('hq_cmd_prompt')
    if (cmdPrompt && module === 'people') {
      sessionStorage.removeItem('hq_cmd_prompt')
      setTimeout(() => sendMessage(cmdPrompt), 300)
    }
  }, [])

  async function ensureConversation(firstMessage: string) {
    if (conversationId) return conversationId
    try {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: firstMessage.substring(0, 60), module })
      })
      const data = await res.json()
      setConversationId(data.id)
      return data.id
    } catch { return null }
  }

  async function saveDocument(content: string, docType: string) {
    try {
      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `${docType} — ${new Date().toLocaleDateString('en-AU')}`,
          type: docType.toLowerCase().replace(/\s+/g, '-'),
          content,
          conversationId,
        })
      })
      const data = await res.json()
      setSavedDocId(data.id)
    } catch {}
  }

  const sendMessage = useCallback(async (text?: string) => {
    const content = text || input.trim()
    if (!content || isLoading) return

    setInput('')
    if (inputRef.current) {
      inputRef.current.style.height = 'auto'
    }
    setIsLoading(true)

    const newMessages: Message[] = [...messages, { role: 'user', content }]
    setMessages(newMessages)

    const convId = await ensureConversation(content)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages, conversationId: convId, module })
      })

      if (!res.ok || !res.body) throw new Error('Stream failed')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let assistantContent = ''
      let finalEscalate = false
      let finalDocType: string | null = null

      setMessages(prev => [...prev, { role: 'assistant', content: '' }])

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        for (const line of chunk.split('\n')) {
          if (!line.startsWith('data: ')) continue
          try {
            const data = JSON.parse(line.slice(6))
            if (data.text) {
              assistantContent += data.text
              setMessages(prev => {
                const updated = [...prev]
                updated[updated.length - 1] = { role: 'assistant', content: assistantContent }
                return updated
              })
            }
            if (data.done) {
              finalEscalate = data.escalate
              finalDocType = data.docType
            }
          } catch {}
        }
      }

      setMessages(prev => {
        const updated = [...prev]
        updated[updated.length - 1] = {
          role: 'assistant',
          content: assistantContent,
          escalate: finalEscalate,
          docType: finalDocType,
        }
        return updated
      })

      if (finalDocType && assistantContent.length > 200) {
        await saveDocument(assistantContent, finalDocType)
      }

    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'I\'m having trouble connecting right now. Please try again in a moment.',
      }])
    }

    setIsLoading(false)
  }, [input, messages, isLoading, conversationId, module])

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  function autoResize(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
  }

  const moduleLabel = module === 'recruit' ? 'HQ Recruit' : 'HQ People'

  return (
    <div className="flex flex-col h-full bg-[#F7F7F5]">

      <CommandBar advisorName={advisorName} />

      {/* Topbar */}
      <div className="flex items-center gap-4 px-6 py-3 border-b border-[#E4E4E2] bg-white flex-shrink-0">
        <div>
          <h1 className="font-serif text-[18px] font-normal text-[#0A0A0A] tracking-tight leading-tight">{moduleLabel}</h1>
          <p className="text-[12px] text-[#6B6B6B]">
            {module === 'recruit' ? 'Recruitment & talent acquisition' : 'HR compliance & advisory'}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {/* Command bar trigger */}
          <button
            onClick={() => {
              const event = new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true })
              window.dispatchEvent(event)
            }}
            className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-[#F7F7F5] border border-[#E4E4E2] rounded-md text-[12px] text-[#6B6B6B] hover:border-[#0A0A0A]/20 transition-colors"
          >
            <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd"/>
            </svg>
            <span>Search or ask…</span>
            <kbd className="text-[10px] bg-white border border-[#E4E4E2] rounded px-1">⌘K</kbd>
          </button>

          <div className="bg-[#F7F7F5] border border-[#E4E4E2] rounded-full px-3 py-1 text-[12px] font-medium text-[#1F1F1F]">
            {bizName}
          </div>
          <button
            onClick={() => setMessages([])}
            className="bg-white border border-[#E4E4E2] rounded-md px-3 py-1.5 text-[12px] font-medium text-[#1F1F1F] hover:bg-[#F7F7F5] transition-colors"
          >
            + New chat
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto scrollbar-thin px-6 py-6 space-y-6">
        {messages.length === 0 && (
          <div className="max-w-2xl mx-auto fade-in">
            {/* Welcome */}
            <div className="text-center mb-10 pt-2">
              <div className="w-11 h-11 bg-white border border-[#E4E4E2] rounded-xl flex items-center justify-center mx-auto mb-5 shadow-card">
                <span className="font-serif text-[#0A0A0A] text-base">HQ</span>
              </div>
              <h2 className="font-serif text-[26px] font-normal text-[#0A0A0A] mb-2 tracking-tight">
                {userName ? `Good morning, ${userName}` : `Welcome to ${moduleLabel}`}
              </h2>
              <p className="text-[14px] text-[#6B6B6B] max-w-[420px] mx-auto leading-relaxed">
                {module === 'recruit'
                  ? 'Write job ads, screen candidates, run reference checks, and shortlist the right people — faster.'
                  : 'Ask me anything about employment law, awards, contracts, leave, or managing your team.'}
              </p>
              <p className="text-[12px] text-[#6B6B6B]/60 mt-3">
                Press <kbd className="bg-white border border-[#E4E4E2] rounded px-1.5 py-0.5 text-[10px]">⌘K</kbd> to search or jump to any action
              </p>
            </div>

            {/* Quick actions */}
            <div className="grid grid-cols-2 gap-2.5">
              {quickActions.map((qa, i) => (
                <button key={i} onClick={() => sendMessage(qa.prompt)}
                  className="text-left bg-white border border-[#E4E4E2] rounded-lg p-4 hover:border-[#0A0A0A]/20 hover:shadow-card transition-all group hover-lift">
                  <span className="text-lg block mb-2">{qa.icon}</span>
                  <span className="text-[13px] font-medium text-[#0A0A0A] block mb-0.5">{qa.label}</span>
                  <span className="text-[12px] text-[#6B6B6B]">{qa.desc}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 fade-in ${msg.role === 'user' ? 'flex-row-reverse max-w-xl ml-auto' : 'max-w-2xl'}`}>
            {/* Avatar */}
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-medium flex-shrink-0 mt-0.5
              ${msg.role === 'user'
                ? 'bg-[#0A0A0A] text-white'
                : 'bg-white border border-[#E4E4E2] text-[#0A0A0A] font-serif text-[12px] shadow-card'}`}>
              {msg.role === 'user' ? (userName?.[0]?.toUpperCase() || 'U') : 'HQ'}
            </div>

            <div className="flex-1 min-w-0">
              <p className={`text-[11px] font-medium text-[#6B6B6B] mb-1.5 ${msg.role === 'user' ? 'text-right' : ''}`}>
                {msg.role === 'user' ? (userName || 'You') : `HQ · ${moduleLabel}`}
              </p>

              {/* Message bubble */}
              <div className={`rounded-xl px-4 py-3 text-[14px] leading-relaxed
                ${msg.role === 'user'
                  ? 'bg-[#0A0A0A] text-white rounded-tr-sm'
                  : 'bg-white border border-[#E4E4E2] text-[#0A0A0A] rounded-tl-sm shadow-card'}`}>
                <MessageContent content={msg.content} isUser={msg.role === 'user'} />
              </div>

              {/* Escalation card */}
              {msg.escalate && msg.role === 'assistant' && (
                <div className="mt-2.5 bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
                  <div className="w-7 h-7 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-sm">⚡</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-[12px] font-medium text-amber-800 mb-1">Advisor recommended</p>
                    <p className="text-[12px] text-amber-700 leading-relaxed mb-3">
                      This situation carries legal exposure. {advisorName} knows your business and can give you specific, protected advice before you act.
                    </p>
                    <div className="flex gap-2">
                      <button onClick={() => setShowAdvisorModal(true)}
                        className="bg-[#0A0A0A] text-white text-[12px] font-medium px-3 py-1.5 rounded-lg hover:bg-[#1F1F1F] transition-colors">
                        Book a call with {advisorName}
                      </button>
                      <button onClick={() => setShowAdvisorModal(true)}
                        className="bg-white text-[#1F1F1F] text-[12px] font-medium px-3 py-1.5 rounded-lg border border-[#E4E4E2] hover:bg-[#F7F7F5] transition-colors">
                        Prepare summary
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Document saved */}
              {msg.docType && savedDocId && msg.role === 'assistant' && (
                <div className="mt-2 bg-[#EAF0EC] border border-[#6F8F7A]/20 rounded-xl px-4 py-2.5 flex items-center gap-2.5">
                  <span className="text-sm">✓</span>
                  <p className="text-[12px] text-[#5A7A65] flex-1">
                    <strong className="font-medium">{msg.docType}</strong> saved to documents
                  </p>
                  <a href="/dashboard/documents" className="text-[12px] font-medium text-[#5A7A65] hover:underline">
                    View →
                  </a>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {isLoading && (
          <div className="flex gap-3 max-w-2xl fade-in">
            <div className="w-7 h-7 rounded-lg bg-white border border-[#E4E4E2] flex items-center justify-center font-serif text-[#0A0A0A] text-[12px] flex-shrink-0 shadow-card">HQ</div>
            <div className="bg-white border border-[#E4E4E2] rounded-xl rounded-tl-sm px-4 py-3.5 shadow-card">
              <div className="flex gap-1.5 items-center">
                {[0, 1, 2].map(i => (
                  <span key={i} className="w-1.5 h-1.5 bg-[#E4E4E2] rounded-full animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 px-6 pb-5 pt-3 border-t border-[#E4E4E2] bg-white">
        <div className="flex items-end gap-3 bg-[#F7F7F5] border-[1.5px] border-[#E4E4E2] rounded-xl px-4 py-3 focus-within:border-[#0A0A0A]/30 transition-colors">
          <textarea
            ref={inputRef}
            value={input}
            onChange={autoResize}
            onKeyDown={handleKey}
            placeholder={module === 'recruit'
              ? 'Ask about job ads, screening, candidates, offers…'
              : 'Ask about awards, contracts, leave, performance, compliance…'}
            rows={1}
            className="flex-1 bg-transparent text-[14px] text-[#0A0A0A] placeholder-[#6B6B6B] resize-none outline-none leading-relaxed max-h-[120px]"
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || isLoading}
            className="w-8 h-8 bg-[#0A0A0A] rounded-lg flex items-center justify-center text-white flex-shrink-0 hover:bg-[#1F1F1F] disabled:opacity-30 disabled:cursor-not-allowed transition-all hover:scale-105 active:scale-95"
          >
            <svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z"/>
            </svg>
          </button>
        </div>
        <p className="text-[11px] text-[#6B6B6B]/60 text-center mt-2">
          HQ.ai provides guidance, not legal advice · Complex matters → speak with {advisorName} at Humanistiqs
        </p>
      </div>

      {/* Advisor modal */}
      {showAdvisorModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 backdrop-blur-sm"
          onClick={() => setShowAdvisorModal(false)}>
          <div className="bg-white rounded-2xl p-7 w-full max-w-md shadow-modal slide-up"
            onClick={e => e.stopPropagation()}>
            <h3 className="font-serif text-[22px] font-normal text-[#0A0A0A] mb-2">Talk to {advisorName}</h3>
            <p className="text-[13px] text-[#6B6B6B] mb-4 leading-relaxed">
              HQ.ai has prepared a summary of your conversation. {advisorName} will have full context before your call — no repeating yourself.
            </p>
            <div className="bg-[#F7F7F5] border border-[#E4E4E2] rounded-xl p-4 mb-5 text-[13px] text-[#1F1F1F] leading-relaxed space-y-1.5">
              <p><span className="font-medium text-[#0A0A0A]">Business:</span> {bizName}</p>
              <p><span className="font-medium text-[#0A0A0A]">Industry:</span> {industry || 'Not specified'}</p>
              <p><span className="font-medium text-[#0A0A0A]">State:</span> {state || 'Not specified'}</p>
              <p><span className="font-medium text-[#0A0A0A]">Award:</span> {award || 'Not specified'}</p>
              {messages.length > 0 && (
                <p><span className="font-medium text-[#0A0A0A]">Last topic:</span> {messages.filter(m => m.role === 'user').slice(-1)[0]?.content?.substring(0, 80)}…</p>
              )}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowAdvisorModal(false)}
                className="flex-1 py-2.5 bg-[#F7F7F5] hover:bg-[#EAEAEA] text-[#1F1F1F] rounded-xl text-[13px] font-medium border border-[#E4E4E2] transition-colors">
                Close
              </button>
              <a href="https://calendly.com" target="_blank" rel="noreferrer"
                className="flex-1 py-2.5 bg-[#0A0A0A] hover:bg-[#1F1F1F] text-white rounded-xl text-[13px] font-medium text-center transition-colors"
                onClick={() => setShowAdvisorModal(false)}>
                📅 Book a call
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function MessageContent({ content, isUser }: { content: string; isUser: boolean }) {
  if (!content) return (
    <span className="text-[#6B6B6B] text-[13px]">Thinking…</span>
  )

  const lines = content.split('\n')
  const elements: React.ReactNode[] = []
  let listItems: string[] = []
  let listType: 'ul' | 'ol' = 'ul'

  const flushList = () => {
    if (!listItems.length) return
    elements.push(
      listType === 'ul'
        ? <ul key={elements.length} className="list-disc pl-4 space-y-1 my-2 text-[13px]">
            {listItems.map((item, i) => <li key={i} dangerouslySetInnerHTML={{ __html: formatInline(item, isUser) }} />)}
          </ul>
        : <ol key={elements.length} className="list-decimal pl-4 space-y-1 my-2 text-[13px]">
            {listItems.map((item, i) => <li key={i} dangerouslySetInnerHTML={{ __html: formatInline(item, isUser) }} />)}
          </ol>
    )
    listItems = []
  }

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) { flushList(); continue }

    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      listType = 'ul'
      listItems.push(trimmed.slice(2))
    } else if (trimmed.match(/^\d+\. /)) {
      listType = 'ol'
      listItems.push(trimmed.replace(/^\d+\. /, ''))
    } else if (trimmed.startsWith('### ') || trimmed.startsWith('## ') || trimmed.startsWith('# ')) {
      flushList()
      const text = trimmed.replace(/^#+\s/, '')
      elements.push(
        <p key={elements.length} className="font-medium text-[#0A0A0A] mt-3 mb-1 text-[13px]"
          dangerouslySetInnerHTML={{ __html: formatInline(text, isUser) }} />
      )
    } else {
      flushList()
      elements.push(
        <p key={elements.length} className="mb-1.5 last:mb-0 text-[14px]"
          dangerouslySetInnerHTML={{ __html: formatInline(trimmed, isUser) }} />
      )
    }
  }
  flushList()

  return <div>{elements}</div>
}

function formatInline(text: string, isUser: boolean): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-medium">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, `<code class="bg-black/8 px-1.5 py-0.5 rounded text-[12px] font-mono">$1</code>`)
}
