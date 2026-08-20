'use client'
import { useState, useRef, useEffect, useCallback, useId } from 'react'
import Link from 'next/link'
import { Check, Clock, Copy, Pencil, Plus, RefreshCcw, ThumbsDown, ThumbsUp, Trash2, X } from 'lucide-react'
import { parseCitations, type Citation } from '@/lib/parse-citations'
import TopicPicker from './TopicPicker'
import TierNotice, { type Tier } from './TierNotice'
// Vercel AI Elements - the chat surface is rebuilt on these primitives,
// re-skinned to the Wattle Gold tokens. The proven /api/chat SSE transport
// (streaming + status + replaceText + citations + clarify + escalate/triage)
// is preserved as-is; only the presentation layer moves to AI Elements.
import { Conversation, ConversationContent, ConversationScrollButton } from '@/components/ai-elements/conversation'
import { Message as UiMessage, MessageContent } from '@/components/ai-elements/message'
import { Response } from '@/components/ai-elements/response'
import { Actions, Action } from '@/components/ai-elements/actions'
import { Suggestions, Suggestion } from '@/components/ai-elements/suggestion'
import { Sources, SourcesTrigger, SourcesContent, Source } from '@/components/ai-elements/sources'
import { Loader } from '@/components/ai-elements/loader'
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputToolbar,
  PromptInputTools,
  PromptInputSubmit,
} from '@/components/ai-elements/prompt-input'

interface ClarifyPayload {
  question: string
  options: Array<{ label: string; hint?: string }>
  followUpHint: string
}

interface TriagePayload {
  category: string
  summary: string
}

interface Message {
  role: 'user' | 'assistant'
  content: string
  // Three-tier safety surfacing (Safe / Caution / Escalate). Derived from the
  // backend `escalate` + `triage` signals today; forward-compatible with an
  // explicit `tier` field once the ML gate populates one (see deriveTier).
  tier?: Tier
  escalate?: boolean
  triage?: TriagePayload | null
  // NOTE: persisted client-side only for now. If the Supabase messages schema
  // later accepts a `citations` jsonb column, wire it in the chat route too.
  citations?: Citation[]
  clarify?: ClarifyPayload
  clarifyAnswered?: boolean
  // Lightweight helpful / not-helpful signal (feeds the quality loop via
  // /api/chat/feedback). Local UI state; the POST is best-effort.
  feedback?: 'up' | 'down'
}

// Map the backend signals onto the three calm tiers. An explicit `tier` from
// the route (future ML gate) always wins; otherwise a hard-triage decline is
// Escalate, a softer keyword escalation is Caution, everything else is Safe.
function deriveTier(d: { tier?: unknown; triage?: unknown; escalate?: unknown }): Tier {
  if (d.tier === 'safe' || d.tier === 'caution' || d.tier === 'escalate') return d.tier
  if (d.triage) return 'escalate'
  if (d.escalate === true) return 'caution'
  return 'safe'
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

const TIMEOUT_COPY =
  "I'm taking longer than I should on this one. Rather than leave you waiting, let me hand it to your Humanistiqs advisor. Want me to send them a context summary, or book a call?"

export default function ChatInterface({ module, userName, bizName, advisorName, industry, state, award, initialPrompt }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [skipTopicPicker, setSkipTopicPicker] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [showAdvisorModal, setShowAdvisorModal] = useState(false)
  const [showContextInput, setShowContextInput] = useState(false)
  const [extraContext, setExtraContext] = useState('')
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [historyItems, setHistoryItems] = useState<Array<{ id: string; title: string; module: string; created_at: string; escalated: boolean }>>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameDraft, setRenameDraft] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const advisorModalHeadingId = useId()

  const suggestions = module === 'recruit' ? SUGGESTIONS_RECRUIT : SUGGESTIONS_PEOPLE

  async function loadHistory() {
    if (historyLoading) return
    setHistoryLoading(true)
    try {
      const res = await fetch('/api/conversations')
      if (res.ok) {
        const data = await res.json()
        setHistoryItems(Array.isArray(data) ? data : [])
      }
    } catch {}
    setHistoryLoading(false)
  }

  function toggleHistory() {
    const next = !historyOpen
    setHistoryOpen(next)
    if (next) loadHistory()
  }

  function startRename(id: string, current: string) {
    setRenamingId(id)
    setRenameDraft(current || '')
  }

  async function commitRename(id: string) {
    const title = renameDraft.trim()
    setRenamingId(null)
    if (!title) return
    // Optimistic update
    setHistoryItems(items => items.map(c => c.id === id ? { ...c, title } : c))
    try {
      await fetch(`/api/conversations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      })
    } catch {}
  }

  async function deleteConversation(id: string) {
    setConfirmDeleteId(null)
    // Optimistic remove
    setHistoryItems(items => items.filter(c => c.id !== id))
    // If we're deleting the active conversation, clear it
    if (id === conversationId) {
      setConversationId(null)
      setMessages([])
    }
    try {
      await fetch(`/api/conversations/${id}`, { method: 'DELETE' })
    } catch {
      // Reload to recover if the delete failed
      loadHistory()
    }
  }

  async function ensureConversation(firstMessage: string) {
    if (conversationId) return conversationId
    try {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: firstMessage.substring(0, 60),
          module,
        })
      })
      if (!res.ok) {
        console.warn('[chat] conversation creation failed:', res.status)
        return null
      }
      const data = await res.json()
      if (data?.id) {
        setConversationId(data.id)
        return data.id
      }
      return null
    } catch (err) {
      console.warn('[chat] conversation creation error:', err)
      return null
    }
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

  // Per-message thumbs. Best-effort POST to the quality-loop sink; UI never
  // waits on it. Clicking the same rating again clears it.
  const submitFeedback = useCallback((idx: number, rating: 'up' | 'down') => {
    const target = messages[idx]
    const userMsg = messages[idx - 1]
    const willSet = target?.feedback !== rating
    setMessages(prev => prev.map((m, i) => i === idx ? { ...m, feedback: willSet ? rating : undefined } : m))
    if (!willSet) return
    fetch('/api/chat/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversationId,
        module,
        rating,
        tier: target?.tier,
        userMessage: userMsg?.content,
        assistantText: target?.content,
      }),
    }).catch(() => {})
  }, [messages, conversationId, module])

  // Direct message send (no form interception). `base` lets regenerate resend
  // from a truncated history without racing the `messages` state.
  const sendMessageDirect = useCallback(async (content: string, base?: Message[]) => {
    if (!content || isLoading) return

    const controller = new AbortController()
    abortRef.current = controller
    let timedOut = false

    // Demo-safety guard: if the route hasn't completed in 60s, surface a
    // graceful escalation card instead of letting the user watch the spinner
    // forever. Pro plan tolerates 300s but the user experience suffers well
    // before that.
    const TIMEOUT_MS = 60_000
    const timeoutId = setTimeout(() => {
      timedOut = true
      try { controller.abort() } catch {}
      setMessages(prev => {
        const updated = [...prev]
        const last = updated[updated.length - 1]
        const timeoutMsg: Message = { role: 'assistant', content: TIMEOUT_COPY, tier: 'escalate', escalate: true }
        if (last && last.role === 'assistant') {
          updated[updated.length - 1] = timeoutMsg
        } else {
          updated.push(timeoutMsg)
        }
        return updated
      })
    }, TIMEOUT_MS)

    setIsLoading(true)
    const priorMessages = base ?? messages
    const newMessages: Message[] = [...priorMessages, { role: 'user', content }]
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
      // dashes, smart quotes) split across SSE chunks decode cleanly.
      const decoder = new TextDecoder('utf-8')
      let assistantContent = ''
      let statusMessage = ''
      let finalEscalate = false
      let finalTierExplicit: unknown = undefined
      let finalTriage: TriagePayload | null = null
      let finalCitations: Citation[] | undefined = undefined
      let finalClarify: ClarifyPayload | undefined = undefined
      // When the backend emits {error, detail}, surface it directly so an
      // API key / credit / Anthropic outage is visible instead of a blank reply.
      let serverError: { error: string; detail?: string } | null = null

      setMessages(prev => [...prev, { role: 'assistant', content: '' }])

      const renderCurrent = () => {
        // Status pulses use a sentinel prefix (stripped server-side before
        // hitting Anthropic) so they render as a calm Loader line, not prose.
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
            // replaceText overwrites the streamed prose with the server's
            // cleaned text (fenced ```citations``` block already stripped).
            if (typeof data.replaceText === 'string') {
              statusMessage = ''
              assistantContent = data.replaceText
              renderCurrent()
            }
            if (data.clarify && typeof data.clarify === 'object') {
              finalClarify = data.clarify as ClarifyPayload
              // Render the question immediately so the user sees it without
              // waiting for the final 'done' event.
              assistantContent = finalClarify.question
              renderCurrent()
            }
            if (Array.isArray(data.citations)) {
              finalCitations = data.citations as Citation[]
            }
            if (data.done) {
              finalEscalate = data.escalate
              finalTriage = (data.triage as TriagePayload) ?? null
              finalTierExplicit = data.tier
              if (Array.isArray(data.citations)) {
                finalCitations = data.citations as Citation[]
              }
            }
            if (data.error) {
              serverError = { error: String(data.error), detail: data.detail }
            }
          } catch {}
        }
      }

      setMessages(prev => {
        const updated = [...prev]
        // Explicit server error with no usable text -> diagnostic bubble.
        if (serverError && !assistantContent.trim()) {
          console.error('[chat] server error:', serverError.error, serverError.detail)
          updated[updated.length - 1] = { role: 'assistant', content: '__API_ERROR__' }
          return updated
        }
        // Fallback: if the route didn't send a separate citations array,
        // parse the trailing ```citations``` block out of the text.
        let citations = finalCitations
        let displayContent = assistantContent
        if (!citations) {
          const parsed = parseCitations(assistantContent)
          citations = parsed.citations
          displayContent = parsed.cleanText
        }
        const tier = deriveTier({ tier: finalTierExplicit, triage: finalTriage, escalate: finalEscalate })
        updated[updated.length - 1] = {
          role: 'assistant',
          content: displayContent,
          tier,
          escalate: finalEscalate,
          triage: finalTriage,
          citations: citations && citations.length > 0 ? citations : undefined,
          clarify: finalClarify,
        }
        return updated
      })
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        // User stop or timeout. The timeout handler already injected the
        // escalation card; user-stop keeps partial content with no error.
      } else {
        console.error('[chat] fetch error:', err)
        setMessages(prev => [...prev, { role: 'assistant', content: '__API_ERROR__' }])
      }
    }

    clearTimeout(timeoutId)
    abortRef.current = null
    setIsLoading(false)
    void timedOut
  }, [messages, isLoading, conversationId, module])

  // Regenerate an assistant answer: drop the answer + its user turn, then
  // resend the same user message on top of the truncated history.
  const regenerate = useCallback((assistantIdx: number) => {
    if (isLoading) return
    const userMsg = messages[assistantIdx - 1]
    if (!userMsg || userMsg.role !== 'user') return
    const base = messages.slice(0, assistantIdx - 1)
    setMessages(base)
    sendMessageDirect(userMsg.content, base)
  }, [messages, isLoading, sendMessageDirect])

  const sendMessage = useCallback(async (text?: string) => {
    const content = text || input.trim()
    if (!content || isLoading) return

    setInput('')
    if (inputRef.current) inputRef.current.style.height = 'auto'
    await sendMessageDirect(content)
  }, [input, isLoading, sendMessageDirect])

  // Auto-send initial prompt (e.g. from templates page "Customise" button)
  const initialPromptSent = useRef(false)
  useEffect(() => {
    if (initialPrompt && !initialPromptSent.current && messages.length === 0) {
      initialPromptSent.current = true
      sendMessage(initialPrompt)
    }
  }, [initialPrompt, sendMessage, messages.length])

  function handleSendContext() {
    if (extraContext.trim()) {
      sendMessage(`Additional context: ${extraContext}`)
      setExtraContext('')
      setShowContextInput(false)
    }
  }

  function onComposerSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (isLoading) { stopGeneration(); return }
    sendMessage()
  }

  const moduleLabel = module === 'recruit' ? 'HQ Recruit' : 'AI Advisor'
  const greeting = getGreeting()
  const composerStatus = isLoading ? 'streaming' : 'ready'

  return (
    <div className="flex h-full bg-bg-elevated">
      {/* Main chat column */}
      <div className={`flex flex-col flex-1 min-w-0 ${historyOpen ? 'hidden sm:flex' : ''}`}>
        {/* Topbar */}
        <div className="flex items-center gap-3 px-4 sm:px-6 py-3 sm:py-3.5 border-b border-border bg-bg-elevated flex-shrink-0">
          <div className="min-w-0">
            <h1 className="font-sans text-base sm:text-lg font-bold text-ink uppercase tracking-wider truncate">{moduleLabel}</h1>
          </div>
          <div className="ml-auto flex items-center gap-2 flex-shrink-0">
            <button
              onClick={toggleHistory}
              aria-label="Chat History"
              className="bg-bg-soft rounded-full min-h-touch min-w-touch sm:min-w-0 sm:px-3 sm:py-1.5 text-[10px] sm:text-xs font-bold text-ink-soft hover:bg-border transition-colors whitespace-nowrap flex items-center justify-center sm:gap-1.5"
            >
              <Clock className="w-3.5 h-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">Chat History</span>
            </button>
            <button
              onClick={() => { stopGeneration(); setMessages([]); setConversationId(null) }}
              className="bg-bg-soft rounded-full px-2.5 sm:px-3 py-1.5 text-[10px] sm:text-xs font-bold text-ink-soft hover:bg-border transition-colors whitespace-nowrap flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" aria-hidden="true" />
              New chat
            </button>
          </div>
        </div>

        {/* Messages - AI Elements Conversation (auto-sticks to bottom while streaming) */}
        <Conversation className="bg-bg-elevated">
          <ConversationContent className={`max-w-3xl mx-auto w-full ${messages.length === 0 ? 'py-4 sm:py-6' : 'py-6 sm:py-10'}`}>
            {messages.length === 0 && (
              module === 'people' && !skipTopicPicker ? (
                <TopicPicker
                  userName={userName}
                  greeting={greeting}
                  bizName={bizName}
                  onPick={(q) => { setSkipTopicPicker(true); sendMessage(q) }}
                  onSkip={() => setSkipTopicPicker(true)}
                />
              ) : (
                <div className="max-w-2xl mx-auto">
                  <div className="text-center pt-8 sm:pt-16 pb-8">
                    <h2 className="font-display text-2xl sm:text-3xl font-bold text-ink tracking-tight mb-2">
                      {userName ? `${greeting}, ${userName}` : greeting}
                    </h2>
                    <p className="text-sm text-ink-soft max-w-md mx-auto leading-relaxed">
                      {module === 'recruit'
                        ? "Ask me anything about hiring - I'll help you write ads, screen candidates, and shortlist faster."
                        : "Tell me the specific situation, who is involved, and what you have tried so far - I'll give you the right guidance."
                      }
                    </p>
                  </div>
                  <Suggestions className="justify-center">
                    {suggestions.map((s, i) => (
                      <Suggestion key={i} suggestion={s} onClick={(q) => sendMessage(q)} />
                    ))}
                  </Suggestions>
                </div>
              )
            )}

            <div className="space-y-5">
              {messages.map((msg, i) => {
                const isStreamingThis = isLoading && i === messages.length - 1
                if (msg.role === 'user') {
                  return (
                    <UiMessage key={i} from="user">
                      <MessageContent variant="contained">
                        <span className="whitespace-pre-wrap break-words">{msg.content}</span>
                      </MessageContent>
                    </UiMessage>
                  )
                }

                // Assistant turn
                const cites = msg.citations
                  ? { cleanText: msg.content, citations: msg.citations }
                  : parseCitations(msg.content)
                const isStatus = msg.content.startsWith('__STATUS__')
                const isError = msg.content === '__API_ERROR__'
                const hasBody = !!msg.content && !isStatus && !isError

                return (
                  <UiMessage key={i} from="assistant">
                    <MessageContent variant="flat">
                      {isError ? (
                        <div className="bg-danger/5 border border-danger/20 rounded-xl p-3.5 text-sm text-ink leading-relaxed">
                          Something went wrong. Please try again - if it keeps happening, contact support.
                        </div>
                      ) : isStatus ? (
                        <div className="flex items-center gap-2 text-sm text-ink-muted">
                          <Loader size={15} />
                          <span className="italic">{msg.content.slice('__STATUS__'.length)}</span>
                        </div>
                      ) : msg.content ? (
                        <>
                          <Response>{cites.cleanText}</Response>
                          {cites.citations.length > 0 && !isStreamingThis && (
                            <Sources>
                              <SourcesTrigger count={dedupeCitations(cites.citations).length} />
                              <SourcesContent>
                                {dedupeCitations(cites.citations).map(c => (
                                  <Source key={c.n} n={c.n} title={c.label} href={c.url} />
                                ))}
                                <p className="text-[10px] text-ink-muted leading-snug pt-1">
                                  General information only, not legal advice. For advice specific to your situation, speak with your Humanistiqs advisor.
                                </p>
                              </SourcesContent>
                            </Sources>
                          )}
                        </>
                      ) : (
                        // Pre-stream: quiet loader where tokens will land
                        <Loader size={16} />
                      )}

                      {/* Action row (copy / regenerate / feedback) */}
                      {hasBody && !isStreamingThis && (
                        <Actions className="mt-2 opacity-70 sm:opacity-0 sm:group-hover/message:opacity-100 focus-within:opacity-100 transition-opacity">
                          <Action tooltip="Copy" label="Copy answer" onClick={() => copyMessage(msg.content, i)}>
                            {copiedIdx === i
                              ? <Check className="w-3.5 h-3.5 text-success" />
                              : <Copy className="w-3.5 h-3.5" />}
                          </Action>
                          <Action tooltip="Regenerate" label="Regenerate answer" onClick={() => regenerate(i)}>
                            <RefreshCcw className="w-3.5 h-3.5" />
                          </Action>
                          <Action
                            tooltip="Helpful"
                            label="Mark helpful"
                            active={msg.feedback === 'up'}
                            onClick={() => submitFeedback(i, 'up')}
                          >
                            <ThumbsUp className="w-3.5 h-3.5" />
                          </Action>
                          <Action
                            tooltip="Not helpful"
                            label="Mark not helpful"
                            active={msg.feedback === 'down'}
                            onClick={() => submitFeedback(i, 'down')}
                          >
                            <ThumbsDown className="w-3.5 h-3.5" />
                          </Action>
                          {msg.feedback && (
                            <span className="ml-1 text-[10px] font-medium text-ink-muted">Thanks for the feedback</span>
                          )}
                        </Actions>
                      )}

                      {/* Clarify card - clickable disambiguation chips */}
                      {msg.clarify && !msg.clarifyAnswered && (
                        <div className="mt-3 bg-bg-elevated border border-border rounded-xl p-3.5">
                          <p className="text-xs font-bold text-ink mb-2.5">Pick the option that fits:</p>
                          <div className="flex flex-wrap gap-2">
                            {msg.clarify.options.map((opt, oi) => (
                              <button
                                key={oi}
                                onClick={() => {
                                  const followUp = msg.clarify!.followUpHint.replace('{option}', opt.label)
                                  setMessages(prev => prev.map((m, idx) => idx === i ? { ...m, clarifyAnswered: true } : m))
                                  sendMessage(followUp)
                                }}
                                className="bg-bg-soft hover:bg-border text-ink text-xs sm:text-sm font-medium px-3 py-2 rounded-full transition-colors text-left"
                              >
                                <span className="font-semibold">{opt.label}</span>
                                {opt.hint && <span className="block text-[10px] text-ink-muted mt-0.5">{opt.hint}</span>}
                              </button>
                            ))}
                          </div>
                          <ClarifyFreeText
                            followUpHint={msg.clarify.followUpHint}
                            onSubmit={(text) => {
                              setMessages(prev => prev.map((m, idx) => idx === i ? { ...m, clarifyAnswered: true } : m))
                              sendMessage(text)
                            }}
                          />
                        </div>
                      )}

                      {/* Three-tier safety surfacing (Safe = nothing) */}
                      {(msg.tier === 'caution' || msg.tier === 'escalate') && (
                        <TierNotice
                          tier={msg.tier}
                          onPrepare={() => setShowAdvisorModal(true)}
                          onContinue={() => setMessages(prev => prev.map((m, idx) => idx === i ? { ...m, tier: 'safe' } : m))}
                          onToggleContext={() => setShowContextInput(v => !v)}
                          showContextInput={showContextInput}
                          extraContext={extraContext}
                          onExtraContextChange={setExtraContext}
                          onSendContext={handleSendContext}
                        />
                      )}

                    </MessageContent>
                  </UiMessage>
                )
              })}

              {/* Pre-stream thinking indicator when no assistant placeholder yet */}
              {isLoading && messages[messages.length - 1]?.role === 'user' && (
                <UiMessage from="assistant">
                  <MessageContent variant="flat">
                    <Loader size={16} />
                  </MessageContent>
                </UiMessage>
              )}
            </div>
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>

        {/* Composer - AI Elements PromptInput */}
        <div className="flex-shrink-0 px-3 sm:px-6 pb-3 sm:pb-4 pt-2.5 sm:pt-3 bg-bg-elevated pb-safe">
          <div className="max-w-3xl mx-auto">
            <PromptInput onSubmit={onComposerSubmit}>
              <PromptInputTextarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder={module === 'recruit'
                  ? 'Ask HQ Recruit about ads, screening, candidates...'
                  : 'Describe the situation - who is involved and what you have tried so far...'
                }
              />
              <PromptInputToolbar>
                <PromptInputTools />
                <PromptInputSubmit status={composerStatus} disabled={!input.trim()} />
              </PromptInputToolbar>
            </PromptInput>
            {messages.length === 0 && (
              <p className="text-xs text-ink-muted text-center mt-2 leading-relaxed px-4">
                General guidance only - not legal advice.{' '}
                <Link href="/dashboard/booking" className="text-ink-soft font-semibold hover:text-ink underline underline-offset-2">
                  Talk to an HQ Advisor
                </Link>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Chat History sidebar */}
      {historyOpen && (
        <div className="w-full sm:w-[280px] md:w-[320px] border-l border-border bg-bg-elevated flex flex-col flex-shrink-0 h-full">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h2 className="font-sans text-sm font-bold text-ink uppercase tracking-wider">Chat History</h2>
            <button
              onClick={() => setHistoryOpen(false)}
              aria-label="Close history"
              className="min-h-touch min-w-touch rounded-full hover:bg-bg-soft flex items-center justify-center text-ink-soft hover:text-ink transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto scrollbar-thin">
            {historyLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader size={16} />
              </div>
            ) : historyItems.length === 0 ? (
              <div className="text-center py-10 px-4">
                <p className="text-sm text-ink-muted">No conversations yet</p>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {historyItems.map(c => (
                  <li key={c.id} className="hover:bg-bg-soft transition-colors group">
                    <div className="flex items-start gap-2 px-4 py-3">
                      <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5 ${c.escalated ? 'bg-warning' : 'bg-ink'}`} />
                      <div className="min-w-0 flex-1">
                        {renamingId === c.id ? (
                          <input
                            autoFocus
                            value={renameDraft}
                            onChange={e => setRenameDraft(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') commitRename(c.id)
                              if (e.key === 'Escape') setRenamingId(null)
                            }}
                            onBlur={() => commitRename(c.id)}
                            className="w-full text-sm font-medium text-ink bg-bg-elevated border border-ink rounded-md px-2 py-1 outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
                            maxLength={120}
                          />
                        ) : (
                          <button
                            className="w-full text-left text-sm font-medium text-ink truncate hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 rounded"
                            onClick={() => {
                              setConversationId(c.id)
                              setHistoryOpen(false)
                            }}
                          >
                            {(c.title || 'Untitled').replace(/[—–]/g, '-')}
                          </button>
                        )}
                        <p className="text-xs text-ink-muted mt-0.5">
                          {c.module === 'recruit' ? 'HQ Recruit' : 'AI Advisor'}
                          {' - '}
                          {formatHistoryDate(c.created_at)}
                        </p>
                      </div>
                      {c.escalated && renamingId !== c.id && confirmDeleteId !== c.id && (
                        <span className="text-xs bg-warning/10 text-warning px-1.5 py-0.5 rounded-full font-medium flex-shrink-0">Escalated</span>
                      )}
                      {renamingId !== c.id && confirmDeleteId !== c.id && (
                        <div className="flex items-center gap-0.5 opacity-60 sm:opacity-0 sm:group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                          <button
                            onClick={() => startRename(c.id, c.title)}
                            title="Rename"
                            aria-label="Rename conversation"
                            className="min-h-touch min-w-touch flex items-center justify-center rounded-full text-ink-soft hover:bg-border hover:text-ink transition-colors focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
                          >
                            <Pencil className="w-3 h-3" aria-hidden="true" />
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(c.id)}
                            title="Delete"
                            aria-label="Delete conversation"
                            className="min-h-touch min-w-touch flex items-center justify-center rounded-full text-ink-soft hover:bg-danger/10 hover:text-danger transition-colors focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
                          >
                            <Trash2 className="w-3 h-3" aria-hidden="true" />
                          </button>
                        </div>
                      )}
                    </div>
                    {confirmDeleteId === c.id && (
                      <div className="flex items-center gap-2 px-4 pb-3 pl-7">
                        <span className="text-xs text-ink-soft">Delete this chat?</span>
                        <button
                          onClick={() => deleteConversation(c.id)}
                          className="text-xs font-bold text-danger hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger/30 rounded"
                        >
                          Delete
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="text-xs font-bold text-ink-soft hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 rounded"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Advisor modal (doubles as the Escalate prep pack) */}
      {showAdvisorModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={advisorModalHeadingId}
          className="fixed inset-0 bg-[color-mix(in_srgb,var(--ink)_55%,transparent)] flex items-center justify-center z-50 p-4"
          onClick={() => setShowAdvisorModal(false)}
          onKeyDown={e => { if (e.key === 'Escape') setShowAdvisorModal(false) }}
        >
          <AdvisorModalContent
            headingId={advisorModalHeadingId}
            bizName={bizName}
            industry={industry}
            state={state}
            award={award}
            messages={messages}
            onClose={() => setShowAdvisorModal(false)}
          />
        </div>
      )}
    </div>
  )
}

// De-duplicate citations by n (first occurrence wins), sorted numerically.
function dedupeCitations(citations: Citation[]): Citation[] {
  const seen = new Set<number>()
  return citations
    .filter(c => {
      if (seen.has(c.n)) return false
      seen.add(c.n)
      return true
    })
    .sort((a, b) => a.n - b.n)
}

function ClarifyFreeText({ followUpHint, onSubmit }: { followUpHint: string; onSubmit: (text: string) => void }) {
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState('')
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-2 text-[11px] font-bold text-ink-soft hover:text-ink hover:underline"
      >
        + Type a different answer
      </button>
    )
  }
  const handleSend = () => {
    const text = value.trim()
    if (!text) return
    onSubmit(followUpHint.replace('{option}', text))
  }
  return (
    <div className="mt-2 flex items-center gap-2">
      <input
        autoFocus
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') handleSend() }}
        placeholder="Type your answer..."
        className="flex-1 text-xs px-3 py-2 bg-bg-elevated border border-border rounded-full outline-none focus:border-ink"
      />
      <button
        onClick={handleSend}
        disabled={!value.trim()}
        className="bg-accent text-ink-on-accent text-xs font-bold px-3 py-2 rounded-full hover:bg-accent-hover disabled:opacity-40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
      >
        Send
      </button>
    </div>
  )
}

function formatHistoryDate(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHrs = Math.floor(diffMins / 60)
  if (diffHrs < 24) return `${diffHrs}h ago`
  const diffDays = Math.floor(diffHrs / 24)
  if (diffDays < 7) return `${diffDays}d ago`
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
}

function AdvisorModalContent({
  headingId,
  bizName,
  industry,
  state,
  award,
  messages,
  onClose,
}: {
  headingId: string
  bizName: string
  industry: string
  state: string
  award: string
  messages: Message[]
  onClose: () => void
}) {
  const firstFocusRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    firstFocusRef.current?.focus()
  }, [])

  return (
    <div
      className="bg-bg-elevated rounded-2xl p-7 w-full max-w-md shadow-modal"
      onClick={e => e.stopPropagation()}
    >
      <h3 id={headingId} className="font-display text-xl font-bold text-ink uppercase tracking-wider mb-2">Talk to an HQ Advisor</h3>
      <p className="text-sm text-ink-soft mb-4 leading-relaxed">
        HQ.ai has prepared a summary of your conversation. Your HQ Advisor will have full context before your call - no repeating yourself.
      </p>
      <div className="bg-bg-soft rounded-xl p-4 mb-4 text-sm text-ink-soft leading-relaxed space-y-1">
        <p><strong className="font-bold text-ink">Business:</strong> {bizName}</p>
        <p><strong className="font-bold text-ink">Industry:</strong> {industry}</p>
        <p><strong className="font-bold text-ink">State:</strong> {state}</p>
        <p><strong className="font-bold text-ink">Award:</strong> {award || 'Not specified'}</p>
        {messages.length > 0 && (
          <p><strong className="font-bold text-ink">Last topic:</strong> {messages.filter(m => m.role === 'user').slice(-1)[0]?.content?.substring(0, 80)}...</p>
        )}
      </div>
      <div className="flex gap-3">
        <button
          ref={firstFocusRef}
          onClick={onClose}
          className="flex-1 py-2.5 bg-bg-elevated hover:bg-bg-soft text-ink-soft rounded-full text-sm font-bold border border-border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
        >
          Close
        </button>
        <Link href="/dashboard/booking" onClick={onClose}
          className="flex-1 py-2.5 bg-accent hover:bg-accent-hover text-ink-on-accent rounded-full text-sm font-bold text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30">
          Book a call with an HQ Advisor
        </Link>
      </div>
    </div>
  )
}
