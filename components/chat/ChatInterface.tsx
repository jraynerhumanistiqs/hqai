'use client'
import { useState, useRef, useEffect, useCallback } from 'react'

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
  { icon: '📄', label: 'Employment contract', desc: 'Full-time, part-time or casual', prompt: 'I need to generate an employment contract for a new employee.' },
  { icon: '⚖️', label: 'Award & pay rates', desc: 'Penalty rates, overtime, allowances', prompt: 'What penalty rates and entitlements apply to my employees?' },
  { icon: '📊', label: 'Performance management', desc: 'PIP, warnings, coaching scripts', prompt: 'I need to manage a performance issue with an employee. Where do I start?' },
  { icon: '🔄', label: 'Casual conversion', desc: 'Fair Work 2023 obligations', prompt: 'What are my casual conversion obligations and when do they apply?' },
  { icon: '📋', label: 'Leave entitlements', desc: 'Annual, personal, parental, LSL', prompt: 'Can you explain all the leave entitlements my employees are entitled to?' },
  { icon: '🔔', label: 'Redundancy process', desc: 'Consultation, pay, genuine test', prompt: 'I need to make a role redundant. What process do I need to follow?' },
]

const QUICK_ACTIONS_RECRUIT = [
  { icon: '📢', label: 'Write a job ad', desc: 'SEEK & LinkedIn ready', prompt: 'I need to write a job advertisement for a new role.' },
  { icon: '🔍', label: 'Screening questions', desc: 'Role-relevant, compliant', prompt: 'Can you generate screening questions for a role I\'m recruiting for?' },
  { icon: '📞', label: 'Phone interview guide', desc: 'Structured call template', prompt: 'I need a phone interview guide for screening candidates.' },
  { icon: '⭐', label: 'Candidate scorecard', desc: 'Standardised evaluation', prompt: 'Can you create a candidate scorecard for evaluating applicants?' },
  { icon: '📋', label: 'Reference check', desc: 'Structured referee questions', prompt: 'I need a reference check template for a candidate.' },
  { icon: '✉️', label: 'Rejection email', desc: 'Professional, compliant', prompt: 'Can you write an unsuccessful candidate email?' },
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

  async function ensureConversation(firstMessage: string) {
    if (conversationId) return conversationId
    const res = await fetch('/api/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: firstMessage.substring(0, 60),
        module,
      })
    })
    const data = await res.json()
    setConversationId(data.id)
    return data.id
  }

  async function saveDocument(content: string, docType: string) {
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
  }

  const sendMessage = useCallback(async (text?: string) => {
    const content = text || input.trim()
    if (!content || isLoading) return

    setInput('')
    setIsLoading(true)

    const newMessages: Message[] = [...messages, { role: 'user', content }]
    setMessages(newMessages)

    const convId = await ensureConversation(content)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages,
          conversationId: convId,
          module,
        })
      })

      if (!res.ok || !res.body) throw new Error('Stream failed')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let assistantContent = ''
      let finalEscalate = false
      let finalDocType: string | null = null

      // Add placeholder assistant message
      setMessages(prev => [...prev, { role: 'assistant', content: '' }])

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const data = JSON.parse(line.slice(6))
            if (data.text) {
              assistantContent += data.text
              setMessages(prev => {
                const updated = [...prev]
                updated[updated.length - 1] = {
                  role: 'assistant',
                  content: assistantContent,
                }
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

      // Update final message with escalation/doc metadata
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

      // Auto-save document if generated
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
  const moduleDesc = module === 'recruit' ? 'Recruitment & talent acquisition' : 'HR compliance & advisory'

  return (
    <div className="flex flex-col h-full bg-[#000000]">
      {/* Topbar */}
      <div className="flex items-center gap-4 px-6 py-3.5 border-b border-[#222222] bg-[#0a0a0a] flex-shrink-0">
        <div>
          <h1 className="font-display text-lg font-bold text-white uppercase tracking-wider">{moduleLabel}</h1>
          <p className="text-xs text-gray-500">{moduleDesc}</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div className="bg-[#1a1a1a] border border-[#333333] rounded-full px-3 py-1 text-xs font-bold text-gray-400">{bizName}</div>
          <button
            onClick={() => setMessages([])}
            className="bg-[#1a1a1a] border border-[#333333] rounded-lg px-3 py-1.5 text-xs font-bold text-gray-400 hover:bg-[#222222] transition-colors"
          >
            + New chat
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto scrollbar-thin px-6 py-6 space-y-5">
        {messages.length === 0 && (
          <div className="max-w-2xl mx-auto">
            {/* Welcome */}
            <div className="text-center mb-8 pt-4">
              <div className="w-12 h-12 bg-accent/20 border border-accent/30 rounded-2xl flex items-center justify-center mx-auto mb-4 font-serif text-accent text-xl">HQ</div>
              <h2 className="font-display text-2xl font-bold text-white uppercase tracking-wider mb-2">
                {userName ? `Good morning, ${userName}` : 'Welcome to HQ.ai'}
              </h2>
              <p className="text-sm text-gray-400 max-w-md mx-auto leading-relaxed">
                {module === 'recruit'
                  ? 'I\'m your AI recruitment advisor. I\'ll help you write job ads, screen candidates, run reference checks, and shortlist the right people — faster.'
                  : 'I\'m your AI HR advisor. Ask me anything about employment law, awards, contracts, leave, or managing your team — and I\'ll give you a straight answer.'
                }
              </p>
            </div>

            {/* Quick actions */}
            <div className="grid grid-cols-2 gap-3">
              {quickActions.map((qa, i) => (
                <button key={i} onClick={() => sendMessage(qa.prompt)}
                  className="text-left bg-[#111111] border border-[#222222] rounded-xl p-4 hover:border-accent/40 hover:bg-[#1a1a1a] transition-all group">
                  <span className="text-xl block mb-2">{qa.icon}</span>
                  <span className="text-sm font-bold text-white block mb-1">{qa.label}</span>
                  <span className="text-xs text-gray-500">{qa.desc}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 max-w-3xl ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}>
            {/* Avatar */}
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5
              ${msg.role === 'user'
                ? 'bg-[#1a1a1a] text-gray-400 border border-[#333333]'
                : 'bg-accent/20 text-accent font-serif text-base border border-accent/30'}`}>
              {msg.role === 'user' ? (userName?.[0]?.toUpperCase() || 'U') : 'HQ'}
            </div>

            <div className="flex-1">
              <p className={`text-[11px] font-bold text-gray-500 mb-1.5 ${msg.role === 'user' ? 'text-right' : ''}`}>
                {msg.role === 'user' ? (userName || 'You') : `HQ · ${moduleLabel}`}
              </p>

              {/* Bubble */}
              <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed
                ${msg.role === 'user'
                  ? 'bg-accent text-white rounded-tr-sm'
                  : 'bg-[#111111] border border-[#222222] text-gray-300 rounded-tl-sm'}`}>
                <MessageContent content={msg.content} isUser={msg.role === 'user'} />
              </div>

              {/* Escalation card */}
              {msg.escalate && msg.role === 'assistant' && (
                <div className="mt-2 bg-coral2 border border-orange-200 rounded-xl p-3.5 flex gap-3">
                  <span className="text-lg flex-shrink-0">⚠️</span>
                  <div className="flex-1">
                    <p className="text-xs font-medium text-coral mb-1">Advisor recommended for this situation</p>
                    <p className="text-xs text-ink2 leading-relaxed mb-2.5">
                      This involves real legal exposure. {advisorName} knows your business and can give you specific, protected advice before you act.
                    </p>
                    <div className="flex gap-2 flex-wrap">
                      <button onClick={() => setShowAdvisorModal(true)}
                        className="bg-coral text-white text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-red-600 transition-colors">
                        📅 Book a call with {advisorName}
                      </button>
                      <button onClick={() => setShowAdvisorModal(true)}
                        className="bg-white text-ink2 text-xs font-medium px-3 py-1.5 rounded-lg border border-sand3 hover:bg-sand2 transition-colors">
                        Prepare context summary
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Document saved indicator */}
              {msg.docType && savedDocId && msg.role === 'assistant' && (
                <div className="mt-2 bg-teal3 border border-teal/20 rounded-xl px-3.5 py-2.5 flex items-center gap-2.5">
                  <span className="text-sm">✅</span>
                  <p className="text-xs text-teal flex-1">
                    <strong>{msg.docType}</strong> saved to your documents library
                  </p>
                  <a href="/dashboard/documents" className="text-xs font-medium text-teal hover:underline">View →</a>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {isLoading && (
          <div className="flex gap-3 max-w-3xl">
            <div className="w-8 h-8 rounded-xl bg-accent/20 border border-accent/30 flex items-center justify-center font-serif text-accent text-base flex-shrink-0">HQ</div>
            <div className="bg-[#111111] border border-[#222222] rounded-2xl rounded-tl-sm px-4 py-3.5">
              <div className="flex gap-1.5 items-center">
                {[0, 1, 2].map(i => (
                  <span key={i} className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 px-6 pb-5 pt-3 border-t border-[#222222] bg-[#0a0a0a]">
        <div className="flex items-end gap-3 bg-[#111111] border-[1.5px] border-[#333333] rounded-2xl px-4 py-3 focus-within:border-accent transition-colors">
          <textarea
            ref={inputRef}
            value={input}
            onChange={autoResize}
            onKeyDown={handleKey}
            placeholder={module === 'recruit'
              ? 'Ask about job ads, screening, candidates, offers…'
              : 'Ask about awards, contracts, leave, performance, compliance…'
            }
            rows={1}
            className="flex-1 bg-transparent text-sm text-white placeholder-gray-500 resize-none outline-none leading-relaxed max-h-[120px]"
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || isLoading}
            className="w-8 h-8 bg-accent rounded-xl flex items-center justify-center text-white flex-shrink-0 hover:bg-accent2 disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:scale-105 active:scale-95"
          >
            <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z"/>
            </svg>
          </button>
        </div>
        <p className="text-[11px] text-gray-600 text-center mt-2">
          HQ.ai provides guidance, not legal advice. Complex matters → speak with {advisorName} at Humanistiqs.
        </p>
      </div>

      {/* Advisor modal */}
      {showAdvisorModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setShowAdvisorModal(false)}>
          <div className="bg-[#111111] border border-[#222222] rounded-2xl p-7 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="font-display text-xl font-bold text-white uppercase tracking-wider mb-2">Talk to {advisorName}</h3>
            <p className="text-sm text-gray-400 mb-4 leading-relaxed">
              HQ.ai has prepared a summary of your conversation. {advisorName} will have full context before your call — no repeating yourself.
            </p>
            <div className="bg-[#1a1a1a] rounded-xl p-4 mb-4 text-sm text-gray-400 leading-relaxed space-y-1">
              <p><strong className="font-bold text-white">Business:</strong> {bizName}</p>
              <p><strong className="font-bold text-white">Industry:</strong> {industry}</p>
              <p><strong className="font-bold text-white">State:</strong> {state}</p>
              <p><strong className="font-bold text-white">Award:</strong> {award || 'Not specified'}</p>
              {messages.length > 0 && (
                <p><strong className="font-bold text-white">Last topic:</strong> {messages.filter(m => m.role === 'user').slice(-1)[0]?.content?.substring(0, 80)}…</p>
              )}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowAdvisorModal(false)}
                className="flex-1 py-2.5 bg-[#1a1a1a] hover:bg-[#222222] text-gray-400 rounded-xl text-sm font-bold border border-[#333333] transition-colors">
                Close
              </button>
              <a href="https://calendly.com" target="_blank" rel="noreferrer"
                className="flex-1 py-2.5 bg-accent hover:bg-accent2 text-white rounded-xl text-sm font-bold text-center transition-colors"
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

// Render markdown-lite message content
function MessageContent({ content, isUser }: { content: string; isUser: boolean }) {
  if (!content) return <span className="text-stone text-xs">Thinking…</span>

  const lines = content.split('\n')
  const elements: React.ReactNode[] = []
  let listItems: string[] = []

  const flushList = () => {
    if (listItems.length) {
      elements.push(
        <ul key={elements.length} className="list-disc pl-4 space-y-1 my-1">
          {listItems.map((item, i) => (
            <li key={i} dangerouslySetInnerHTML={{ __html: formatInline(item, isUser) }} />
          ))}
        </ul>
      )
      listItems = []
    }
  }

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) { flushList(); continue }

    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      listItems.push(trimmed.slice(2))
    } else if (trimmed.match(/^\d+\. /)) {
      listItems.push(trimmed.replace(/^\d+\. /, ''))
    } else {
      flushList()
      elements.push(
        <p key={elements.length} className="mb-1 last:mb-0"
          dangerouslySetInnerHTML={{ __html: formatInline(trimmed, isUser) }} />
      )
    }
  }
  flushList()

  return <div className="space-y-0.5">{elements}</div>
}

function formatInline(text: string, isUser: boolean): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, `<strong class="font-medium">$1</strong>`)
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, `<code class="bg-black/10 px-1 rounded text-xs font-mono">$1</code>`)
}
