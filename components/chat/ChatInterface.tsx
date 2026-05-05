'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { detectTemplate, ALL_TEMPLATES, type TemplateFormField } from '@/lib/template-ip'
import { parseCitations, type Citation } from '@/lib/parse-citations'
import CitationChip from './CitationChip'
import MessageCitations from './MessageCitations'

interface Message {
  role: 'user' | 'assistant'
  content: string
  escalate?: boolean
  docType?: string | null
  formType?: string | null
  formCompleted?: boolean
  // NOTE: persisted client-side only for now. If the Supabase messages schema
  // later accepts a `citations` jsonb column, wire it in the chat route too.
  citations?: Citation[]
}

// Build DOC_FORMS lookup from template-ip definitions
const DOC_FORMS: Record<string, { title: string; description: string; fields: TemplateFormField[] }> = Object.fromEntries(
  ALL_TEMPLATES
    .filter(t => t.formFields.length > 0)
    .map(t => [t.title, { title: t.title, description: t.description, fields: t.formFields }])
)

// Client-side document detection - powered by template-ip.ts (33 template types)
function detectDocType(text: string): string | null {
  const tmpl = detectTemplate(text)
  return tmpl ? tmpl.title : null
}

interface ChatInterfaceProps {
  module: 'people' | 'recruit'
  userName: string
  bizName: string
  advisorName: string
  industry: string
  state: string
  award: string
  initialPrompt?: string
}

// Short prompt chips for empty state (pill-shaped, scenario-framed)
const SUGGESTIONS_PEOPLE = [
  'Draft a termination letter',
  'Casual to permanent conversion',
  'Calculate redundancy pay',
  'Write a formal warning notice',
]

const SUGGESTIONS_RECRUIT = [
  'Write a job ad for SEEK',
  'Screening questions for a senior role',
  'Reference check template',
  'Unsuccessful candidate email',
]

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

export default function ChatInterface({ module, userName, bizName, advisorName, industry, state, award, initialPrompt }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [showAdvisorModal, setShowAdvisorModal] = useState(false)
  const [savedDocId, setSavedDocId] = useState<string | null>(null)
  const [showContextInput, setShowContextInput] = useState(false)
  const [extraContext, setExtraContext] = useState('')
  const [activeForm, setActiveForm] = useState<string | null>(null)
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  const suggestions = module === 'recruit' ? SUGGESTIONS_RECRUIT : SUGGESTIONS_PEOPLE

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
        title: `${docType} - ${new Date().toLocaleDateString('en-AU')}`,
        type: docType.toLowerCase().replace(/\s+/g, '-'),
        content,
        conversationId,
      })
    })
    const data = await res.json()
    setSavedDocId(data.id)
  }

  function stopGeneration() {
    abortRef.current?.abort()
    abortRef.current = null
    setIsLoading(false)
  }

  async function copyMessage(content: string, idx: number) {
    try {
      await navigator.clipboard.writeText(content)
      setCopiedIdx(idx)
      setTimeout(() => setCopiedIdx(null), 1500)
    } catch {}
  }

  // Direct message send (no form interception) - must be defined before handleFormSubmit
  const sendMessageDirect = useCallback(async (content: string) => {
    if (!content || isLoading) return

    const controller = new AbortController()
    abortRef.current = controller

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
        }),
        signal: controller.signal,
      })

      if (!res.ok || !res.body) {
        // Surface the HTTP status so an outage at the route level (401 if
        // session cookie expired, 500 if the route crashed before streaming)
        // is visible in-app rather than as a generic apology.
        const bodyText = await res.text().catch(() => '')
        throw new Error(
          `Stream failed (HTTP ${res.status}${res.statusText ? ' ' + res.statusText : ''})` +
            (bodyText ? `: ${bodyText.slice(0, 200)}` : ''),
        )
      }

      const reader = res.body.getReader()
      // utf-8 decoder with stream:true so multi-byte chars (emoji, em
      // dashes, smart quotes) split across SSE chunks decode cleanly
      // instead of producing garbled Latin-1 bytes.
      const decoder = new TextDecoder('utf-8')
      let assistantContent = ''
      let statusMessage = ''
      let finalEscalate = false
      let finalDocType: string | null = null
      let finalCitations: Citation[] | undefined = undefined
      // When the backend emits {error, detail}, we need to surface it directly
      // in the chat bubble - previously the frontend ignored the field and
      // the user saw a blank reply. Demo-critical: lets us diagnose API key /
      // credit / Anthropic outages on sight instead of having to open dev tools.
      let serverError: { error: string; detail?: string } | null = null

      setMessages(prev => [...prev, { role: 'assistant', content: '' }])

      const renderCurrent = () => {
        // Status pulses use a sentinel prefix instead of markdown underscores
        // - MessageContent strips the prefix and renders the rest as italics
        // via CSS. Avoids literal "_" leaking into the bubble.
        const display = assistantContent || (statusMessage ? `__STATUS__${statusMessage}` : '')
        setMessages(prev => {
          const updated = [...prev]
          updated[updated.length - 1] = { role: 'assistant', content: display }
          return updated
        })
      }

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n')
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const data = JSON.parse(line.slice(6))
            if (typeof data.status === 'string') {
              statusMessage = data.message || data.status
              if (!assistantContent) renderCurrent()
            }
            if (data.text) {
              statusMessage = ''
              assistantContent += data.text
              renderCurrent()
            }
            if (data.done) {
              finalEscalate = data.escalate
              finalDocType = data.docType
              if (Array.isArray(data.citations)) {
                finalCitations = data.citations as Citation[]
              }
            }
            if (Array.isArray(data.citations)) {
              // Some wire formats emit citations as a separate event before done
              finalCitations = data.citations as Citation[]
            }
            if (data.error) {
              serverError = { error: String(data.error), detail: data.detail }
            }
          } catch {}
        }
      }

      setMessages(prev => {
        const updated = [...prev]
        // If the backend sent an explicit error event AND we have no usable
        // text, render a diagnostic bubble so the user can see the real cause
        // (API key, credit, Anthropic 5xx, Supabase auth) without dev tools.
        if (serverError && !assistantContent.trim()) {
          updated[updated.length - 1] = {
            role: 'assistant',
            content:
              `Chat ran into a server error. ${serverError.error}` +
              (serverError.detail ? `\n\nDetails: ${serverError.detail}` : '') +
              `\n\nIf this keeps happening, check the Anthropic console for credit/key status and the Vercel deployment logs.`,
          }
          return updated
        }
        // Fallback: if the route didn't send a separate citations array,
        // parse the trailing ```citations``` block from the assistant text.
        let citations = finalCitations
        let displayContent = assistantContent
        if (!citations) {
          const parsed = parseCitations(assistantContent)
          citations = parsed.citations
          displayContent = parsed.cleanText
        }
        updated[updated.length - 1] = {
          role: 'assistant',
          content: displayContent,
          escalate: finalEscalate,
          docType: finalDocType,
          citations: citations && citations.length > 0 ? citations : undefined,
        }
        return updated
      })

      if (finalDocType && assistantContent.length > 200) {
        await saveDocument(assistantContent, finalDocType)
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        // User stopped - keep partial content, no error message
      } else {
        const detail =
          err instanceof Error ? err.message : String(err ?? 'Unknown error')
        setMessages(prev => [...prev, {
          role: 'assistant',
          content:
            `I'm having trouble connecting right now.\n\nDetails: ${detail}\n\n` +
            `Please try again in a moment. If this keeps happening, check the Anthropic ` +
            `console for credit/key status and the Vercel deployment logs.`,
        }])
      }
    }

    abortRef.current = null
    setIsLoading(false)
  }, [messages, isLoading, conversationId, module])

  // Handle form submission - generate DOCX backend-side and deliver download
  const handleFormSubmit = useCallback(async (docType: string, formData: Record<string, string>) => {
    setActiveForm(null)

    // Mark form as completed
    setMessages(prev => prev.map(m =>
      m.formType === docType && !m.formCompleted
        ? { ...m, formCompleted: true }
        : m
    ))

    // Add a "generating" message
    setMessages(prev => [...prev, {
      role: 'assistant',
      content: `Generating your **${docType}** as a Word document. This may take a moment...`,
      docType: null,
    }])
    setIsLoading(true)

    try {
      const res = await fetch('/api/documents/contract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formData, docType, templateId: ALL_TEMPLATES.find(t => t.title === docType)?.id }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Generation failed' }))
        throw new Error(err.error || 'Generation failed')
      }

      // Download the DOCX blob
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const filename = `${docType.replace(/[^a-zA-Z0-9 ]/g, '').replace(/\s+/g, '_')}.docx`

      // Trigger download
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)

      // Update message to show success with re-download option
      setMessages(prev => {
        const updated = [...prev]
        updated[updated.length - 1] = {
          role: 'assistant',
          content: `Your **${docType}** has been generated and downloaded as a Word document. It's also been saved to your documents library.\n\nThe document includes your company logo and all required clauses tailored to your business. Please review it carefully and make any necessary adjustments before issuing to the employee.`,
          docType: docType,
        }
        return updated
      })

      // Clean up
      setTimeout(() => URL.revokeObjectURL(url), 30000)
      setSavedDocId('generated') // Flag for UI

    } catch (err: any) {
      setMessages(prev => {
        const updated = [...prev]
        updated[updated.length - 1] = {
          role: 'assistant',
          content: `I wasn't able to generate the document: ${err.message}. Let me try creating it here in chat instead.`,
        }
        return updated
      })

      // Fallback to chat-based generation
      const formDef = DOC_FORMS[docType]
      let prompt = `Please generate a complete ${docType} with the following details:\n\n`
      if (formDef) {
        for (const field of formDef.fields) {
          const val = formData[field.key]
          if (val && val.trim()) {
            prompt += `**${field.label}:** ${val}\n`
          }
        }
      }
      prompt += `\nGenerate the FULL, COMPLETE document. Do not abbreviate.`
      await sendMessageDirect(prompt)
      return
    }

    setIsLoading(false)
  }, [sendMessageDirect])

  const sendMessage = useCallback(async (text?: string) => {
    const content = text || input.trim()
    if (!content || isLoading) return

    // Check if this is a document request - show form instead
    const detectedDoc = detectDocType(content)
    if (detectedDoc && DOC_FORMS[detectedDoc] && !activeForm) {
      setInput('')
      setMessages(prev => [
        ...prev,
        { role: 'user', content },
        { role: 'assistant', content: '', formType: detectedDoc, formCompleted: false },
      ])
      setActiveForm(detectedDoc)
      await ensureConversation(content)
      return
    }

    setInput('')
    if (inputRef.current) inputRef.current.style.height = 'auto'
    await sendMessageDirect(content)
  }, [input, isLoading, activeForm, sendMessageDirect])

  // Auto-send initial prompt (e.g. from templates page "Customise" button)
  const initialPromptSent = useRef(false)
  useEffect(() => {
    if (initialPrompt && !initialPromptSent.current && messages.length === 0) {
      initialPromptSent.current = true
      sendMessage(initialPrompt)
    }
  }, [initialPrompt, sendMessage, messages.length])

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  function autoResize(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px'
  }

  function handleSendContext() {
    if (extraContext.trim()) {
      sendMessage(`Additional context: ${extraContext}`)
      setExtraContext('')
      setShowContextInput(false)
    }
  }

  const moduleLabel = module === 'recruit' ? 'HQ Recruit' : 'HQ People'
  const moduleDesc = module === 'recruit' ? 'Recruitment & talent acquisition' : 'HR compliance & advisory'
  const greeting = getGreeting()

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Topbar */}
      <div className="flex items-center gap-3 px-4 sm:px-6 py-3 sm:py-3.5 border-b border-border bg-white flex-shrink-0">
        <div className="min-w-0">
          <h1 className="font-display text-base sm:text-lg font-bold text-charcoal uppercase tracking-wider truncate">{moduleLabel}</h1>
          <p className="text-[10px] sm:text-xs text-muted hidden sm:block">{moduleDesc}</p>
        </div>
        <div className="ml-auto flex items-center gap-2 flex-shrink-0">
          <div className="bg-light rounded-full px-2.5 sm:px-3 py-1 text-[10px] sm:text-xs font-bold text-mid hidden sm:block">{bizName}</div>
          <button
            onClick={() => { stopGeneration(); setMessages([]); setConversationId(null); setSavedDocId(null) }}
            className="bg-light rounded-full px-2.5 sm:px-3 py-1.5 text-[10px] sm:text-xs font-bold text-mid hover:bg-border transition-colors whitespace-nowrap"
          >
            + New chat
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto scrollbar-thin px-3 sm:px-6 py-6 sm:py-10">
        {messages.length === 0 && (
          <div className="max-w-2xl mx-auto">
            {/* Centred greeting */}
            <div className="text-center pt-8 sm:pt-16 pb-8">
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-charcoal tracking-tight mb-2">
                {userName ? `${greeting}, ${userName}` : greeting}
              </h2>
              <p className="text-sm text-mid max-w-md mx-auto leading-relaxed">
                {module === 'recruit'
                  ? 'Ask me anything about hiring - I\'ll help you write ads, screen candidates, and shortlist faster.'
                  : 'Ask me anything about HR, Fair Work, awards, contracts, leave, or managing your team.'
                }
              </p>
            </div>

            {/* Pill-chip suggestions */}
            <div className="flex flex-wrap gap-2 justify-center">
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(s)}
                  className="bg-light hover:bg-border text-charcoal text-sm font-medium px-4 py-2 rounded-full transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="max-w-3xl mx-auto space-y-5">
          {messages.map((msg, i) => (
            <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} group`}>
              {/* User messages: contained bg-black bubble, right-aligned */}
              {msg.role === 'user' && (
                <div className="bg-black text-white text-sm leading-relaxed px-4 py-2.5 rounded-2xl rounded-tr-md max-w-[85%]">
                  <MessageContent content={msg.content} isUser />
                </div>
              )}

              {/* Assistant: flat prose full-width with small label */}
              {msg.role === 'assistant' && (
                <div className="w-full">
                  <p className="text-[11px] font-bold text-muted uppercase tracking-wider mb-1.5">
                    {moduleLabel}
                  </p>

                  {/* Form or flat prose */}
                  {msg.formType && !msg.formCompleted ? (
                    <DocumentFormCard
                      docType={msg.formType}
                      onSubmit={handleFormSubmit}
                      onSkip={() => {
                        setActiveForm(null)
                        setMessages(prev => prev.map(m =>
                          m.formType === msg.formType && !m.formCompleted
                            ? { ...m, formCompleted: true }
                            : m
                        ))
                        sendMessageDirect(`Please generate a ${msg.formType}. Use my business details from the profile and ask me for any details you need.`)
                      }}
                      bizName={bizName}
                    />
                  ) : msg.formType && msg.formCompleted ? (
                    <p className="text-sm text-mid">
                      <span className="text-charcoal font-semibold">{msg.formType}</span> details submitted - generating your document…
                    </p>
                  ) : msg.content ? (
                    (() => {
                      // If the route attached citations, trust them; otherwise
                      // try to parse a trailing ```citations``` block out of
                      // the content (streaming fallback / legacy messages).
                      const cites = msg.citations
                        ? { cleanText: msg.content, citations: msg.citations }
                        : parseCitations(msg.content)
                      const isStreamingThis = isLoading && i === messages.length - 1
                      return (
                        <>
                          <div className="text-sm text-charcoal leading-relaxed">
                            <MessageContent
                              content={cites.cleanText}
                              isUser={false}
                              citations={cites.citations}
                            />
                          </div>
                          {cites.citations.length > 0 && !isStreamingThis && (
                            <MessageCitations citations={cites.citations} />
                          )}
                          {module === 'people' && !isStreamingThis && (
                            <p className="text-[11px] text-muted italic mt-2">
                              General information, not legal advice. Confirm with your advisor before acting.
                            </p>
                          )}
                        </>
                      )
                    })()
                  ) : (
                    // Pre-stream: pulsing dot where tokens will land
                    <span className="inline-block w-2 h-2 rounded-full bg-charcoal animate-pulse" />
                  )}

                  {/* Hover action row (Copy) - only for non-form completed assistant messages with content */}
                  {!msg.formType && msg.content && !(isLoading && i === messages.length - 1) && (
                    <div className="mt-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => copyMessage(msg.content, i)}
                        title="Copy"
                        className="w-7 h-7 flex items-center justify-center rounded-full text-mid hover:bg-light hover:text-charcoal transition-colors"
                      >
                        {copiedIdx === i ? (
                          <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                          </svg>
                        ) : (
                          <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z"/>
                            <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z"/>
                          </svg>
                        )}
                      </button>
                      {copiedIdx === i && <span className="text-[10px] text-mid font-medium">Copied</span>}
                    </div>
                  )}

                  {/* Escalation card */}
                  {msg.escalate && (
                    <>
                      <div className="mt-3 bg-warning/5 border border-warning/20 rounded-xl p-3.5 flex gap-3">
                        <span className="text-lg flex-shrink-0">⚠️</span>
                        <div className="flex-1">
                          <p className="text-xs font-bold text-warning mb-1">Advisor recommended for this situation</p>
                          <p className="text-xs text-mid leading-relaxed mb-2.5">
                            This involves real legal exposure. A HQ Advisor can give you specific, protected advice before you act.
                          </p>
                          <div className="flex gap-2 flex-wrap">
                            <button onClick={() => setShowAdvisorModal(true)}
                              className="bg-black text-white text-xs font-bold px-3 py-1.5 rounded-full hover:bg-[#1a1a1a] transition-colors">
                              Book a call with an HQ Advisor
                            </button>
                            <button
                              onClick={() => {
                                setShowAdvisorModal(false)
                                setMessages(prev => prev.map((m, idx) =>
                                  idx === i ? { ...m, escalate: false } : m
                                ))
                              }}
                              className="bg-white text-mid text-xs font-bold px-3 py-1.5 rounded-full border border-border hover:bg-light transition-colors">
                              Continue talking with {advisorName}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Add more context */}
                      <div className="mt-2">
                        <button onClick={() => setShowContextInput(!showContextInput)}
                          className="text-xs text-mid font-bold hover:underline">
                          + Add more context
                        </button>
                        {showContextInput && (
                          <div className="mt-2 space-y-2">
                            <textarea
                              value={extraContext}
                              onChange={e => setExtraContext(e.target.value)}
                              placeholder="Add additional context about your situation..."
                              rows={3}
                              className="w-full px-3 py-2 bg-white border border-border rounded-lg text-sm text-charcoal placeholder-muted resize-none outline-none focus:border-black transition-colors"
                            />
                            <button onClick={handleSendContext}
                              disabled={!extraContext.trim()}
                              className="bg-black text-white text-xs font-bold px-4 py-1.5 rounded-full hover:bg-[#1a1a1a] disabled:opacity-40 transition-colors">
                              Send context
                            </button>
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  {/* Document saved indicator with download */}
                  {msg.docType && msg.content.length > 200 && (
                    <div className="mt-3 bg-light rounded-xl px-3.5 py-2.5">
                      <div className="flex items-center gap-2.5 mb-2">
                        <span className="text-sm">{savedDocId ? '✅' : '📄'}</span>
                        <p className="text-xs text-charcoal flex-1">
                          <strong>{msg.docType}</strong>{savedDocId ? ' saved to your documents library' : ' generated'}
                        </p>
                      </div>
                      <div className="flex gap-2 ml-6">
                        <DownloadDocxButton content={msg.content} title={msg.docType || 'Document'} docType={msg.docType || 'Document'} />
                        {savedDocId && (
                          <a href="/dashboard/documents" className="border border-border text-mid text-xs font-bold px-3 py-1.5 rounded-full hover:bg-white transition-colors">
                            View in library →
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {/* Pre-stream thinking indicator (only when no assistant placeholder is present yet) */}
          {isLoading && messages[messages.length - 1]?.role === 'user' && (
            <div className="flex flex-col items-start">
              <p className="text-[11px] font-bold text-muted uppercase tracking-wider mb-1.5">{moduleLabel}</p>
              <span className="inline-block w-2 h-2 rounded-full bg-charcoal animate-pulse" />
            </div>
          )}
        </div>
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 px-3 sm:px-6 pb-3 sm:pb-4 pt-2.5 sm:pt-3 bg-white pb-safe">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-end gap-2 bg-white border border-border rounded-3xl px-4 py-2.5 focus-within:border-black transition-colors shadow-sm">
            <textarea
              ref={inputRef}
              value={input}
              onChange={autoResize}
              onKeyDown={handleKey}
              placeholder={module === 'recruit'
                ? 'Ask HQ Recruit about ads, screening, candidates…'
                : 'Ask HQ People about HR, Fair Work, payroll…'
              }
              rows={1}
              className="flex-1 bg-transparent text-sm text-charcoal placeholder-muted resize-none outline-none leading-relaxed max-h-[160px] py-1.5"
            />
            {isLoading ? (
              <button
                onClick={stopGeneration}
                title="Stop generating"
                className="w-9 h-9 bg-black rounded-full flex items-center justify-center text-white flex-shrink-0 hover:bg-[#1a1a1a] transition-all"
              >
                <span className="w-3 h-3 bg-white rounded-sm" />
              </button>
            ) : (
              <button
                onClick={() => sendMessage()}
                disabled={!input.trim()}
                title="Send"
                className="w-9 h-9 bg-black rounded-full flex items-center justify-center text-white flex-shrink-0 hover:bg-[#1a1a1a] disabled:bg-muted disabled:cursor-not-allowed transition-all"
              >
                <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10 3a1 1 0 01.707.293l5 5a1 1 0 01-1.414 1.414L11 6.414V16a1 1 0 11-2 0V6.414L5.707 9.707a1 1 0 01-1.414-1.414l5-5A1 1 0 0110 3z"/>
                </svg>
              </button>
            )}
          </div>
          <p className="text-[10px] text-muted text-center mt-2 leading-relaxed px-4">
            {moduleLabel} provides general guidance grounded in Australian employment law - not legal advice. Verify critical decisions.{' '}
            <Link href="/dashboard/booking" className="text-mid font-semibold hover:text-charcoal underline underline-offset-2">
              Talk to an HQ Advisor
            </Link>
          </p>
        </div>
      </div>

      {/* Advisor modal */}
      {showAdvisorModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setShowAdvisorModal(false)}>
          <div className="bg-white rounded-2xl p-7 w-full max-w-md shadow-modal" onClick={e => e.stopPropagation()}>
            <h3 className="font-display text-xl font-bold text-charcoal uppercase tracking-wider mb-2">Talk to an HQ Advisor</h3>
            <p className="text-sm text-mid mb-4 leading-relaxed">
              HQ.ai has prepared a summary of your conversation. Your HQ Advisor will have full context before your call - no repeating yourself.
            </p>
            <div className="bg-light rounded-xl p-4 mb-4 text-sm text-mid leading-relaxed space-y-1">
              <p><strong className="font-bold text-charcoal">Business:</strong> {bizName}</p>
              <p><strong className="font-bold text-charcoal">Industry:</strong> {industry}</p>
              <p><strong className="font-bold text-charcoal">State:</strong> {state}</p>
              <p><strong className="font-bold text-charcoal">Award:</strong> {award || 'Not specified'}</p>
              {messages.length > 0 && (
                <p><strong className="font-bold text-charcoal">Last topic:</strong> {messages.filter(m => m.role === 'user').slice(-1)[0]?.content?.substring(0, 80)}…</p>
              )}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowAdvisorModal(false)}
                className="flex-1 py-2.5 bg-white hover:bg-light text-mid rounded-full text-sm font-bold border border-border transition-colors">
                Close
              </button>
              <Link href="/dashboard/booking" onClick={() => setShowAdvisorModal(false)}
                className="flex-1 py-2.5 bg-black hover:bg-[#1a1a1a] text-white rounded-full text-sm font-bold text-center transition-colors">
                Book a call with an HQ Advisor
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Render markdown-lite message content (with optional inline citation chips)
function MessageContent({
  content,
  isUser,
  citations,
}: {
  content: string
  isUser: boolean
  citations?: Citation[]
}) {
  if (!content) return null

  // Status pulses arrive marked with a __STATUS__ prefix so we can render
  // them as italic placeholder copy without leaking literal underscores.
  if (content.startsWith('__STATUS__')) {
    return <p className="text-sm text-mid italic">{content.slice('__STATUS__'.length)}</p>
  }

  // Build a lookup by citation number so we can render chips with label+url.
  const byN = new Map<number, Citation>()
  if (citations) {
    for (const c of citations) if (!byN.has(c.n)) byN.set(c.n, c)
  }

  // Split a line on [n] markers and return React nodes. Each non-marker
  // segment uses formatInline (markdown-lite) via dangerouslySetInnerHTML,
  // which is safe because we only produce a controlled whitelist of tags.
  const renderInline = (text: string, keyPrefix: string): React.ReactNode[] => {
    const re = /\[(\d+)\]/g
    const parts: React.ReactNode[] = []
    let last = 0
    let m: RegExpExecArray | null
    let idx = 0
    while ((m = re.exec(text)) !== null) {
      if (m.index > last) {
        const seg = text.slice(last, m.index)
        parts.push(
          <span
            key={`${keyPrefix}-t${idx++}`}
            dangerouslySetInnerHTML={{ __html: formatInline(seg, isUser) }}
          />
        )
      }
      const n = Number(m[1])
      const cite = byN.get(n)
      if (cite) {
        parts.push(
          <CitationChip key={`${keyPrefix}-c${idx++}`} n={cite.n} label={cite.label} url={cite.url} />
        )
      } else {
        // Unknown marker - render as plain [n] fallback
        parts.push(<span key={`${keyPrefix}-c${idx++}`}>{m[0]}</span>)
      }
      last = m.index + m[0].length
    }
    if (last < text.length) {
      const seg = text.slice(last)
      parts.push(
        <span
          key={`${keyPrefix}-t${idx++}`}
          dangerouslySetInnerHTML={{ __html: formatInline(seg, isUser) }}
        />
      )
    }
    return parts
  }

  const lines = content.split('\n')
  const elements: React.ReactNode[] = []
  let listItems: string[] = []

  const flushList = () => {
    if (listItems.length) {
      const items = listItems
      elements.push(
        <ul key={elements.length} className="list-disc pl-5 space-y-1 my-2">
          {items.map((item, i) => (
            <li key={i}>{renderInline(item, `l${elements.length}-${i}`)}</li>
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
    } else if (trimmed.startsWith('## ')) {
      flushList()
      const key = elements.length
      elements.push(
        <h3 key={key} className="font-bold text-[15px] mt-3 mb-1 first:mt-0">
          {renderInline(trimmed.slice(3), `h3-${key}`)}
        </h3>
      )
    } else if (trimmed.startsWith('# ')) {
      flushList()
      const key = elements.length
      elements.push(
        <h2 key={key} className="font-bold text-base mt-3 mb-1 first:mt-0">
          {renderInline(trimmed.slice(2), `h2-${key}`)}
        </h2>
      )
    } else {
      flushList()
      const key = elements.length
      elements.push(
        <p key={key} className="mb-2 last:mb-0">
          {renderInline(trimmed, `p-${key}`)}
        </p>
      )
    }
  }
  flushList()

  return <div>{elements}</div>
}

function formatInline(text: string, isUser: boolean): string {
  const codeCls = isUser ? 'bg-white/15 px-1 rounded text-xs font-mono' : 'bg-light px-1 rounded text-xs font-mono'
  return text
    .replace(/\*\*(.*?)\*\*/g, `<strong class="font-semibold">$1</strong>`)
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, `<code class="${codeCls}">$1</code>`)
}

function DocumentFormCard({
  docType,
  onSubmit,
  onSkip,
  bizName,
}: {
  docType: string
  onSubmit: (docType: string, data: Record<string, string>) => void
  onSkip: () => void
  bizName: string
}) {
  const formDef = DOC_FORMS[docType]
  const [formData, setFormData] = useState<Record<string, string>>({})

  if (!formDef) return null

  const updateField = (key: string, value: string) => {
    setFormData(prev => ({ ...prev, [key]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const missing = formDef.fields.filter(f => f.required && !formData[f.key]?.trim())
    if (missing.length > 0) return
    onSubmit(docType, formData)
  }

  const inputCls = "w-full px-3 py-2.5 bg-white border border-border rounded-lg text-sm text-charcoal placeholder-muted focus:outline-none focus:border-black transition-colors"

  return (
    <div className="bg-white shadow-card rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="bg-light border-b border-border px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-black/10 rounded-xl flex items-center justify-center">
            <svg className="w-4 h-4 text-black" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd"/>
            </svg>
          </div>
          <div>
            <h3 className="font-display text-base font-bold text-charcoal uppercase tracking-wider">{formDef.title}</h3>
            <p className="text-xs text-muted mt-0.5">{bizName}</p>
          </div>
        </div>
        <p className="text-xs text-mid mt-3 leading-relaxed">{formDef.description}</p>
      </div>

      {/* Form fields */}
      <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
        {formDef.fields.map(field => (
          <div key={field.key}>
            <label className="block text-xs font-bold text-mid mb-1.5">
              {field.label}
              {field.required && <span className="text-danger ml-0.5">*</span>}
            </label>
            {field.type === 'select' ? (
              <select
                className={inputCls + " appearance-none"}
                value={formData[field.key] || ''}
                onChange={e => updateField(field.key, e.target.value)}
                required={field.required}
              >
                <option value="">Select...</option>
                {field.options?.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            ) : field.type === 'textarea' ? (
              <textarea
                className={inputCls + " resize-none"}
                rows={3}
                value={formData[field.key] || ''}
                onChange={e => updateField(field.key, e.target.value)}
                placeholder={field.placeholder}
                required={field.required}
              />
            ) : field.type === 'date' ? (
              <input
                type="date"
                className={inputCls}
                value={formData[field.key] || ''}
                onChange={e => updateField(field.key, e.target.value)}
                required={field.required}
              />
            ) : (
              <input
                type={field.type === 'number' ? 'number' : 'text'}
                className={inputCls}
                value={formData[field.key] || ''}
                onChange={e => updateField(field.key, e.target.value)}
                placeholder={field.placeholder}
                required={field.required}
              />
            )}
          </div>
        ))}

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            className="flex-1 bg-black hover:bg-[#1a1a1a] text-white font-bold py-2.5 rounded-full text-sm transition-colors"
          >
            Generate {formDef.title}
          </button>
          <button
            type="button"
            onClick={onSkip}
            className="bg-white hover:bg-light text-mid font-bold py-2.5 px-4 rounded-full text-sm border border-border transition-colors"
          >
            Skip form
          </button>
        </div>
        <p className="text-[10px] text-muted text-center">
          HQ will use your business profile details for employer information, award, and state jurisdiction.
        </p>
      </form>
    </div>
  )
}

function DownloadDocxButton({ content, title, docType }: { content: string; title: string; docType: string }) {
  const [downloading, setDownloading] = useState(false)

  async function handleDownload() {
    setDownloading(true)
    try {
      const res = await fetch('/api/documents/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, title: `${title} - ${new Date().toLocaleDateString('en-AU')}`, docType }),
      })

      if (!res.ok) throw new Error('Generation failed')

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${title.replace(/[^a-zA-Z0-9 ]/g, '').replace(/\s+/g, '_')}.docx`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch {
      alert('Could not generate document. Please try again.')
    }
    setDownloading(false)
  }

  return (
    <button
      onClick={handleDownload}
      disabled={downloading}
      className="bg-black text-white text-xs font-bold px-3 py-1.5 rounded-full hover:bg-[#1a1a1a] transition-colors inline-flex items-center gap-1 disabled:opacity-60"
    >
      <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd"/>
      </svg>
      {downloading ? 'Generating…' : 'Download DOCX'}
    </button>
  )
}
