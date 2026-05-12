import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { buildSystemPrompt, detectEscalation, detectDocumentRequest, detectHardTriage, buildTriageReply } from '@/lib/prompts'
import { tools, runTool, ToolRunResult } from '@/lib/chat-tools'
import { parseCitations } from '@/lib/parse-citations'
import { NextRequest, after } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 180

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const MODEL = 'claude-sonnet-4-20250514'
// 2 iterations: iter 0 forced search (model can emit multiple parallel
// search_knowledge calls in one turn via Promise.all dispatch), iter 1
// final stream (tool_choice='none'). Was 3 but Vercel Hobby caps at 60s
// silently regardless of maxDuration=180, and 3 iterations on complex
// multi-domain queries blew past that. 2 keeps complex queries under cap.
const MAX_TOOL_ITERATIONS = 2
const HEARTBEAT_MS = 8000
const SOFT_BUDGET_MS = 45000

type AnthropicMessage = { role: 'user' | 'assistant'; content: any }

export async function POST(req: NextRequest) {
  const started = Date.now()
  try {
    const supabase = await createClient()

    // Eval harness bypass: requests carrying a matching X-Eval-Token header
    // skip Supabase auth and use a stable placeholder business profile.
    // Token is only honoured when EVAL_BYPASS_TOKEN env var is set (production
    // can leave it unset to disable the bypass entirely).
    const evalHeader = req.headers.get('x-eval-token') ?? ''
    const evalToken = process.env.EVAL_BYPASS_TOKEN ?? ''
    const isEval = !!evalToken && evalHeader === evalToken

    let user: { id: string } | null = null
    let profile: any = null
    let business: any = null

    if (isEval) {
      user = { id: '00000000-0000-0000-0000-000000000000' }
      profile = { full_name: 'Eval Runner' }
      business = {
        name: 'Eval Co',
        industry: 'General',
        state: 'QLD',
        award: 'Not specified',
        headcount: '11-50',
        employment_types: 'Mixed',
        advisor_name: 'Sarah',
      }
    } else {
      const { data: authData } = await supabase.auth.getUser()
      user = authData.user
      if (!user) return new Response('Unauthorised', { status: 401 })

      const { data } = await supabase
        .from('profiles')
        .select('*, businesses(*)')
        .eq('id', user.id)
        .single()
      profile = data
      business = profile?.businesses
    }
    const { messages, conversationId, module } = await req.json()
    const mod: 'people' | 'recruit' = module === 'recruit' ? 'recruit' : 'people'

    const lastUserMsg = messages[messages.length - 1]?.content || ''
    const requestedDoc = detectDocumentRequest(lastUserMsg)
    const triage = detectHardTriage(lastUserMsg)

    // Pre-flight short-circuit: high-stakes incidents go straight to a triage
    // response without any LLM call. Returns a structured handoff payload
    // within ~50ms instead of risking a hallucinated answer at 30s. Frontend
    // renders this via the existing escalation card UX.
    if (triage) {
      const advisorName = business?.advisor_name || 'your advisor'
      const replyText = buildTriageReply(triage, advisorName)
      const encoder = new TextEncoder()
      const stream = new ReadableStream({
        async start(controller) {
          try {
            const size = 60
            for (let i = 0; i < replyText.length; i += size) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                text: replyText.slice(i, i + size),
              })}\n\n`))
            }
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              done: true,
              escalate: true,
              triage: { category: triage.category, summary: triage.summary },
            })}\n\n`))

            if (conversationId && user) {
              try {
                await supabase.from('messages').insert([
                  { conversation_id: conversationId, role: 'user', content: lastUserMsg },
                  {
                    conversation_id: conversationId,
                    role: 'assistant',
                    content: replyText,
                    has_escalation: true,
                    has_document: false,
                  },
                ])
                await supabase.from('conversations')
                  .update({
                    escalated: true,
                    escalation_summary: `[${triage.category}] ${lastUserMsg.substring(0, 200)}`,
                  })
                  .eq('id', conversationId)
              } catch (err) {
                console.warn('[chat] triage persist failed:', (err as Error).message)
              }
            }
            controller.close()
          } catch (err) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              error: 'Triage error', detail: (err as Error).message,
            })}\n\n`))
            controller.close()
          }
        },
      })
      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-cache, no-transform',
          Connection: 'keep-alive',
          'X-Accel-Buffering': 'no',
        },
      })
    }

    const systemPrompt = buildSystemPrompt(mod, {
      name: business?.name || 'Unknown',
      industry: business?.industry || 'General',
      state: business?.state || 'QLD',
      award: business?.award || 'Not specified',
      headcount: business?.headcount || 'Not specified',
      empTypes: business?.employment_types || 'Mixed',
      advisorName: business?.advisor_name || 'Sarah',
      userName: profile?.full_name || '',
    })

    // Save user message (fire-and-forget to avoid blocking the response)
    const userMessage = messages[messages.length - 1]
    if (conversationId && userMessage?.role === 'user') {
      supabase.from('messages').insert({
        conversation_id: conversationId,
        role: 'user',
        content: userMessage.content,
      }).then(({ error }) => {
        if (error) console.warn('[chat] user message insert failed:', error.message)
      })
    }

    const claudeMessages: AnthropicMessage[] = messages.slice(-10).map((m: any) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }))

    // --- Non-'people' modules: keep legacy streaming path (no tools) ------
    if (mod !== 'people') {
      return legacyStream({
        supabase,
        systemPrompt,
        claudeMessages,
        maxTokens: requestedDoc ? 4096 : 1500,
        conversationId,
        lastUserMsg,
      })
    }

    // --- HQ People: tool-use loop, then stream the final turn ------------
    // Tier-1 fast path: simple conversational queries (greetings, thanks,
    // follow-ups, clarifications) don't need RAG search. Skip the forced
    // tool_choice loop and go straight to streaming - cuts latency ~50%.
    const skipRag = isSimpleQuery(lastUserMsg, claudeMessages)

    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        const working: AnthropicMessage[] = [...claudeMessages]
        const accumulatedCitations: Array<{ n: number; label: string; url?: string; source?: string; chunkId?: number }> = []
        const accumulatedToolCalls: Array<{ name: string; input: unknown; output_summary: string }> = []
        let citationCursor = 0
        let fullResponse = ''

        // Emit an immediate status pulse so the UI can show activity within
        // ~100ms instead of waiting 30-60s for the first tool-discovery
        // round trip to Anthropic to come back. Conversational copy - what
        // an HR consultant would say while checking something rather than
        // formal "Searching the Fair Work Act…" framing.
        const SEARCH_PHRASES = [
          'One sec - let me grab the right reference for you.',
          'Just checking the awards on this one…',
          'Hang on - quickly looking this up.',
          'Pulling up the Fair Work guidance now.',
          'Give me a moment - checking the rules for this.',
        ]
        if (!skipRag) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            status: 'searching',
            message: SEARCH_PHRASES[Math.floor(Math.random() * SEARCH_PHRASES.length)],
          })}\n\n`))
        }

        try {
          // Fast path: simple queries skip the tool-use loop entirely.
          if (skipRag) {
            const streamAbort = new AbortController()
            const fastRes = await withTimeout(
              anthropic.messages.create(
                {
                  model: MODEL,
                  max_tokens: 1500,
                  system: systemPrompt,
                  tools,
                  tool_choice: { type: 'auto' },
                  messages: working,
                  stream: true,
                },
                { signal: streamAbort.signal },
              ),
              45_000,
              'Anthropic streaming (simple query)',
            )

            let lastChunkAt = Date.now()
            let stalled = false
            const streamStartedAt = Date.now()
            const watchdog = setInterval(() => {
              if (Date.now() - lastChunkAt > 20_000 || Date.now() - streamStartedAt > 40_000) {
                stalled = true
                clearInterval(watchdog)
                try { streamAbort.abort() } catch {}
              }
            }, 2_000)

            try {
              for await (const chunk of fastRes) {
                lastChunkAt = Date.now()
                if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
                  fullResponse += chunk.delta.text
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: chunk.delta.text })}\n\n`))
                }
              }
            } catch (err) {
              if (!stalled) throw err
            } finally {
              clearInterval(watchdog)
            }
            if (stalled && !fullResponse) {
              throw new Error('Streaming stalled before any text arrived')
            }
            const { cleanText, citations } = parseCitations(fullResponse)
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              replaceText: cleanText,
              citations: citations,
            })}\n\n`))
            await finalise({
              controller, encoder, supabase, conversationId,
              fullResponse: cleanText, lastUserMsg, module: mod,
              user, business, citations, toolCalls: [],
              latencyMs: Date.now() - started,
            })
            return
          }

          for (let iter = 0; iter < MAX_TOOL_ITERATIONS; iter++) {
            if (iter > 0) {
              const DRAFT_PHRASES = [
                'Got it - putting this together for you now.',
                'Cool, writing it up now.',
                'Right, let me pull this into an answer.',
                'Alright, drafting a response.',
              ]
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                status: 'drafting',
                message: DRAFT_PHRASES[Math.floor(Math.random() * DRAFT_PHRASES.length)],
              })}\n\n`))
            }
            const isFinalIter = iter === MAX_TOOL_ITERATIONS - 1

            // Non-streaming tool-discovery turn (or the final streaming turn).
            if (!isFinalIter) {
              // Force search_knowledge on the discovery turn so the model
              // grounds every HR / awards / NES / Fair Work answer in vetted
              // retrieval before producing prose.
              //
              // Note on history: this was briefly relaxed to tool_choice
              // 'any' so the model could choose request_clarification for
              // ambiguous questions. In practice that combined with the
              // system-prompt guidance made the model pick clarification on
              // almost every query and the chat appeared to "time out" on
              // anything HR. Reverted - clarification will return later as a
              // post-search refinement once retrieval signals low confidence.
              const toolChoice = { type: 'tool' as const, name: 'search_knowledge' }
              const res = await withHeartbeat(controller, encoder, () =>
                withTimeout(
                  anthropic.messages.create({
                    model: MODEL,
                    max_tokens: 768,
                    system: systemPrompt,
                    tools,
                    tool_choice: toolChoice,
                    messages: working,
                  }),
                  60_000,
                  'Anthropic tool-discovery turn',
                )
              )

              if (res.stop_reason !== 'tool_use') {
                // Model answered without calling a tool - stream the text out.
                const text = res.content
                  .filter(b => b.type === 'text')
                  .map(b => (b as { type: 'text'; text: string }).text)
                  .join('')
                fullResponse = text
                const { cleanText, citations } = parseCitations(text)
                // Merge any model-emitted citations with what the tools returned.
                const finalCitations = mergeCitations(accumulatedCitations, citations)
                await emitInChunks(controller, encoder, cleanText)
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                  citations: finalCitations,
                })}\n\n`))
                await finalise({
                  controller, encoder, supabase, conversationId,
                  fullResponse: cleanText, lastUserMsg, module: mod,
                  user, business, citations: finalCitations, toolCalls: accumulatedToolCalls,
                  latencyMs: Date.now() - started,
                })
                return
              }

              // Tool use requested - dispatch each tool_use block, append results.
              working.push({ role: 'assistant', content: res.content })
              const toolUseBlocks = res.content.filter(b => b.type === 'tool_use') as Array<{
                type: 'tool_use'; id: string; name: string; input: Record<string, unknown>
              }>

              // Run all tool calls in parallel - independent (no shared
              // state during dispatch), so a model emitting two search
              // queries in one turn doesn't pay 2× round-trip latency.
              // Use a placeholder citation offset so each tool gets a
              // disjoint range, then assemble accumulated citations in
              // input order to keep [n] markers stable.
              const startingOffsets = toolUseBlocks.map((_, i) =>
                citationCursor + (toolUseBlocks.slice(0, i).length === 0 ? 0 : i * 16)
              )
              const toolRuns = await withHeartbeat(controller, encoder, () =>
                withTimeout(
                  Promise.all(
                    toolUseBlocks.map((tu, i) =>
                      withTimeout(
                        runTool(tu.id, tu.name, tu.input, startingOffsets[i]),
                        15_000,
                        `runTool ${tu.name}`,
                      ).catch((err) => ({
                        toolUseId: tu.id,
                        name: tu.name,
                        output: `Tool failed or timed out: ${(err as Error).message}`,
                        citations: [] as ToolRunResult['citations'],
                        isError: true,
                      } as ToolRunResult))
                    ),
                  ),
                  30_000,
                  'parallel tool dispatch',
                ),
              )
              const toolResults: Array<{ type: 'tool_result'; tool_use_id: string; content: string; is_error?: boolean }> = []
              let clarifyPayload: ToolRunResult['clarify'] | null = null
              for (let i = 0; i < toolUseBlocks.length; i++) {
                const tu = toolUseBlocks[i]
                const r: ToolRunResult = toolRuns[i]
                citationCursor += r.citations.length
                accumulatedCitations.push(...r.citations)
                accumulatedToolCalls.push({
                  name: tu.name,
                  input: tu.input,
                  output_summary: r.output.slice(0, 500),
                })
                if (r.clarify && !clarifyPayload) clarifyPayload = r.clarify
                toolResults.push({
                  type: 'tool_result',
                  tool_use_id: tu.id,
                  content: r.output,
                  is_error: r.isError,
                })
              }

              // Short-circuit: the model asked the user a clarifying question.
              // Emit the chip card and finish - the user's pick will come back
              // as the next user message.
              if (clarifyPayload) {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                  clarify: clarifyPayload,
                })}\n\n`))
                await finalise({
                  controller, encoder, supabase, conversationId,
                  fullResponse: clarifyPayload.question,
                  lastUserMsg, module: mod,
                  user, business, citations: accumulatedCitations,
                  toolCalls: accumulatedToolCalls,
                  latencyMs: Date.now() - started,
                })
                return
              }

              working.push({ role: 'user', content: toolResults })
              continue
            }

            // Final iteration - stream the answer. Force no further tool use
            // so the model commits to text instead of attempting another
            // tool_use block that would never resolve in the streaming path.
            const elapsed = Date.now() - started
            if (elapsed > SOFT_BUDGET_MS) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                status: 'drafting',
                message: 'Quick answer coming - rest will follow if you ask me to expand.',
              })}\n\n`))
            }
            const streamAbort = new AbortController()
            // Drop tool_choice='none' and don't pass tools on the streaming
            // turn. The model has the tool_result from iter 0 in context and
            // doesn't need access to tools again. Some model versions stall
            // when handed a tools array with tool_choice='none' alongside a
            // tool_result message - removing both ambiguity sources lets the
            // model commit cleanly to text. The 'note from grounding' line
            // in the system prompt still constrains it to ground answers in
            // the search results.
            const streamPromise = anthropic.messages.create(
              {
                model: MODEL,
                max_tokens: requestedDoc ? 4096 : (elapsed > SOFT_BUDGET_MS ? 800 : 1500),
                system: systemPrompt + '\n\nYou now have search results above. Produce the final answer in prose with citations. Do not call tools.',
                messages: working,
                stream: true,
              },
              { signal: streamAbort.signal },
            )
            // Heartbeat covers the gap between the model returning the
            // stream object and the first text_delta arriving. Without
            // this the user sees a black bubble for up to ~30s on slow
            // streaming starts. Emits a status pulse every 6s.
            const startupHeartbeat = setInterval(() => {
              try {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                  status: 'drafting',
                  message: 'Pulling this together…',
                })}\n\n`))
              } catch {}
            }, 6_000)
            let finalRes
            try {
              finalRes = await withTimeout(streamPromise, 45_000, 'Anthropic streaming start')
            } finally {
              clearInterval(startupHeartbeat)
            }

            let lastChunkAt = Date.now()
            let stalled = false
            let sawTextDelta = false
            let lastStopReason: string | undefined
            const STREAM_GAP_LIMIT_MS = 35_000
            const STREAM_TOTAL_LIMIT_MS = 90_000
            const streamStartedAt = Date.now()
            const watchdog = setInterval(() => {
              const overGap = Date.now() - lastChunkAt > STREAM_GAP_LIMIT_MS
              const overTotal = Date.now() - streamStartedAt > STREAM_TOTAL_LIMIT_MS
              if (overGap || overTotal) {
                stalled = true
                clearInterval(watchdog)
                try { streamAbort.abort() } catch {}
              }
            }, 2_000)

            try {
              for await (const chunk of finalRes) {
                lastChunkAt = Date.now()
                if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
                  sawTextDelta = true
                  const text = chunk.delta.text
                  fullResponse += text
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`))
                } else if (chunk.type === 'message_delta' && 'delta' in chunk) {
                  const d = chunk.delta as { stop_reason?: string }
                  if (d.stop_reason) lastStopReason = d.stop_reason
                }
              }
            } catch (err) {
              if (!stalled) throw err
            } finally {
              clearInterval(watchdog)
            }
            if (stalled && !fullResponse) {
              throw new Error('Streaming stalled before any text arrived')
            }
            console.log(`[chat] iter 1 done sawTextDelta=${sawTextDelta} stop_reason=${lastStopReason ?? 'unknown'} fullResponse.length=${fullResponse.length}`)

            // Recovery: model produced no text on the streaming turn (can
            // happen when the deny-list constraint conflicts with the
            // retrieved passages or the model hit refusal mode). Retry once
            // with no tools at all and a forceful "answer now" addendum so
            // the user sees something useful instead of a stuck bubble.
            if (!fullResponse.trim()) {
              console.warn('[chat] iter 1 produced empty response, retrying without tool_use messages')
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                status: 'drafting',
                message: 'One more moment - rephrasing the answer.',
              })}\n\n`))

              // Build a flat conversation history that strips tool_use /
              // tool_result blocks. Some models get stuck producing text
              // when those blocks are in context with no tools available.
              const flatMessages = working
                .filter(m => typeof m.content === 'string' || Array.isArray(m.content))
                .map(m => {
                  if (typeof m.content === 'string') return { role: m.role, content: m.content }
                  // Extract text blocks and tool_result content; drop tool_use
                  const parts: string[] = []
                  for (const b of m.content as Array<any>) {
                    if (b.type === 'text' && b.text) parts.push(b.text)
                    if (b.type === 'tool_result' && typeof b.content === 'string') {
                      parts.push(`[Retrieved sources]\n${b.content}`)
                    }
                  }
                  return { role: m.role, content: parts.join('\n\n') }
                })
                .filter(m => m.content && (m.content as string).trim().length > 0)

              const retryAbort = new AbortController()
              try {
                const retry = await withTimeout(
                  anthropic.messages.create(
                    {
                      model: MODEL,
                      max_tokens: 1500,
                      system: systemPrompt + '\n\nIMPORTANT: Answer the user\'s question NOW using the retrieved sources in the conversation above. Produce prose only - do not refuse, do not stall. If the topic is on the deny-list, give the brief general orientation + advisor handoff per the standard escalation format. Do not return an empty response.',
                      messages: flatMessages as any,
                      stream: true,
                    },
                    { signal: retryAbort.signal },
                  ),
                  30_000,
                  'Anthropic recovery streaming start',
                )
                for await (const chunk of retry) {
                  if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
                    const text = chunk.delta.text
                    fullResponse += text
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`))
                  }
                }
              } catch (retryErr) {
                console.error('[chat] recovery stream failed:', retryErr)
              }
            }

            // If we STILL have no text after recovery, surface a clear
            // error rather than leave the UI on a pulsing dot forever.
            if (!fullResponse.trim()) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                error: 'No response generated',
                detail: 'The model returned an empty response after retrieval. This sometimes happens on dismissal / underpayment / discrimination queries where the deny-list constraints conflict with the retrieved passages. Please rephrase the question, or use the Book a call with an HQ Advisor option.',
              })}\n\n`))
              controller.close()
              return
            }

            const { cleanText, citations } = parseCitations(fullResponse)
            const finalCitations = mergeCitations(accumulatedCitations, citations)

            // Emit a cleanText overwrite so the UI can drop the raw fenced block
            // and render the structured citation chips instead.
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              replaceText: cleanText,
              citations: finalCitations,
            })}\n\n`))

            await finalise({
              controller, encoder, supabase, conversationId,
              fullResponse: cleanText, lastUserMsg, module: mod,
              user, business, citations: finalCitations, toolCalls: accumulatedToolCalls,
              latencyMs: Date.now() - started,
            })
            return
          }
        } catch (err) {
          console.error('[chat] error:', err)
          const detail = err instanceof Error ? err.message : String(err)
          // detail is minor info-leak but useful for end-user error reporting;
          // never include the stack in client output.
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'Stream error', detail })}\n\n`))
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        // Explicit utf-8 - without it, browsers default to ISO-8859-1 for
        // text/event-stream and Unicode characters (emoji, em dashes,
        // smart quotes, the registered-trademark symbol, etc.) render as
        // garbled Latin-1 bytes instead of their intended glyphs.
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    })
  } catch (err) {
    console.error('[chat] fatal:', err)
    return new Response('Server error', { status: 500 })
  }
}

// --- helpers -----------------------------------------------------------------

// Hard timeout wrapper - races a promise against a setTimeout so no awaited
// call can hang indefinitely. Pro plan has 300s ceiling but in practice we
// want each phase to fail fast so the user sees an error rather than a
// repeating heartbeat. ms applies to the whole work() resolution.
function withTimeout<T>(work: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timeout: ${label} exceeded ${ms}ms`)), ms)
    work.then(
      v => { clearTimeout(timer); resolve(v) },
      e => { clearTimeout(timer); reject(e) },
    )
  })
}

// Keeps the SSE channel alive while waiting on a non-streaming Anthropic call
// or a Promise.all of tool runs. Long quiet periods between turns make
// browsers/proxies treat the response as stalled. Pulse a status event every
// 8s during waits.
async function withHeartbeat<T>(
  controller: ReadableStreamDefaultController<any>,
  encoder: TextEncoder,
  work: () => Promise<T>,
): Promise<T> {
  const PULSES = [
    'Still on it - cross-checking the legislation.',
    'One sec - this one needs a couple of references.',
    'Almost there - just confirming the right section.',
    'Working on it - want to give you the right answer.',
  ]
  const interval = setInterval(() => {
    try {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({
        status: 'searching',
        message: PULSES[Math.floor(Math.random() * PULSES.length)],
      })}\n\n`))
    } catch {}
  }, HEARTBEAT_MS)
  try {
    return await work()
  } finally {
    clearInterval(interval)
  }
}

function mergeCitations<T extends { n: number; label: string; url?: string }>(
  primary: T[],
  fromModel: Array<{ n: number; label: string; url?: string }>,
): T[] {
  // Prefer tool-returned citations (they carry chunkId/source). Only add
  // model-emitted entries whose `n` isn't already covered.
  const seen = new Set(primary.map(c => c.n))
  const extras = fromModel.filter(c => !seen.has(c.n)) as unknown as T[]
  return [...primary, ...extras].sort((a, b) => a.n - b.n)
}

async function emitInChunks(controller: ReadableStreamDefaultController<any>, encoder: TextEncoder, text: string) {
  // Mimic streaming so the chat UI doesn't jump. 80-char chunks ~ a few ms each.
  const size = 80
  for (let i = 0; i < text.length; i += size) {
    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: text.slice(i, i + size) })}\n\n`))
  }
}

async function finalise(opts: {
  controller: ReadableStreamDefaultController<any>
  encoder: TextEncoder
  supabase: Awaited<ReturnType<typeof createClient>>
  conversationId?: string
  fullResponse: string
  lastUserMsg: string
  module: 'people' | 'recruit'
  user: { id: string }
  business: { id?: string } | null | undefined
  citations: Array<{ n: number; label: string; url?: string; source?: string; chunkId?: number }>
  toolCalls: Array<{ name: string; input: unknown; output_summary: string }>
  latencyMs: number
}) {
  const {
    controller, encoder, supabase, conversationId, fullResponse, lastUserMsg,
    module, user, business, citations, toolCalls, latencyMs,
  } = opts
  const escalate = detectEscalation(lastUserMsg + ' ' + fullResponse)
  const docType = detectDocumentRequest(lastUserMsg)

  controller.enqueue(encoder.encode(`data: ${JSON.stringify({
    done: true, escalate, docType,
  })}\n\n`))

  if (conversationId) {
    try {
      await supabase.from('messages').insert({
        conversation_id: conversationId,
        role: 'assistant',
        content: fullResponse,
        has_escalation: escalate,
        has_document: !!docType,
      })
      if (escalate) {
        await supabase.from('conversations')
          .update({ escalated: true, escalation_summary: lastUserMsg.substring(0, 200) })
          .eq('id', conversationId)
      }
    } catch (err) {
      console.warn('[chat] messages insert failed:', (err as Error).message)
    }
  }

  // Audit log + telemetry - fire-and-forget through `after()` so Vercel
  // doesn't freeze the lambda before the inserts complete. Eval bypass
  // requests use a placeholder UUID that would FK-violate the audit log,
  // so skip there. Telemetry is allowed because chat_telemetry has no FK.
  after(async () => {
    if (user.id !== '00000000-0000-0000-0000-000000000000') {
      try {
        await supabase.from('chat_audit_log').insert({
          user_id: user.id,
          business_id: business?.id ?? null,
          conversation_id: conversationId ?? null,
          module,
          user_message: lastUserMsg,
          assistant_text: fullResponse,
          citations,
          tool_calls: toolCalls,
          escalated: escalate,
          doc_type: docType,
          latency_ms: latencyMs,
          model: MODEL,
        })
      } catch (err) {
        console.warn('[chat] audit log insert failed:', (err as Error).message)
      }
    }
    try {
      const inputTokens = toolCalls.reduce((acc, t) => acc + (t.output_summary?.length ?? 0), 0)
      await supabase.from('chat_telemetry').insert({
        conversation_id: conversationId ?? null,
        user_id: user.id === '00000000-0000-0000-0000-000000000000' ? null : user.id,
        business_id: business?.id ?? null,
        module,
        query_chars: lastUserMsg.length,
        tools_called: toolCalls.map(t => t.name),
        retrieval_chunks: inputTokens > 0 ? Math.ceil(inputTokens / 1500) : 0,
        total_ms: latencyMs,
        model: MODEL,
        triage_category: null,
        errored: false,
      })
    } catch (err) {
      console.warn('[chat] telemetry insert failed:', (err as Error).message)
    }
  })

  controller.close()
}

// Tier-1 classifier: detect queries that don't need RAG search.
// Greetings, thanks, clarifications, and short follow-ups can go straight
// to streaming. Anything that looks like an HR/compliance question (keywords
// from awards, legislation, leave types, pay, etc.) must go through RAG.
function isSimpleQuery(text: string, history: AnthropicMessage[]): boolean {
  const trimmed = text.trim()
  const lower = trimmed.toLowerCase()
  const wordCount = trimmed.split(/\s+/).length

  // Very short messages that are clearly conversational
  if (wordCount <= 3) {
    const conversational = /^(hi|hey|hello|thanks|thank you|cheers|ta|ok|okay|sure|yes|no|yep|nope|cool|great|got it|noted|perfect|good|fine|right|awesome|appreciate it|much appreciated|will do|understood|makes sense)/i
    if (conversational.test(trimmed)) return true
  }

  // Short follow-ups that reference the prior answer
  if (wordCount <= 8) {
    const followUp = /^(can you (explain|clarify|expand|elaborate)|what do you mean|tell me more|go on|keep going|and |but what about|what about|how so|why is that|is that right|are you sure|sorry|pardon)/i
    if (followUp.test(trimmed)) return true
  }

  // HR/compliance keywords that MUST go through RAG
  const ragRequired = /\b(award|nts|nes|fair work|leave|annual leave|personal leave|sick leave|parental|redundancy|termination|dismiss|unfair|notice period|pay rate|minimum wage|casual conversion|overtime|penalty rate|allowance|super(annuation)?|long service|public holiday|contract|probation|classification|entitlement|right to disconnect|flexible work|stand ?down|wage|underpay|overpay|deduction|shift work|roster|hours of work|modern award|enterprise agreement|sham contract|contractor|payslip|record[- ]keeping|work health|whs|ohs|discrimination|harassment|bullying|worker.?s? comp|pip|performance improvement|warning letter|show cause|section \d|s\.\d|act \d{4}|fwc|ombudsman)\b/i
  if (ragRequired.test(lower)) return false

  // Document generation requests always need full processing
  if (/\b(draft|write|generate|create|make) (a |an |me |the )?(contract|letter|pip|template|document|policy|warning|offer|termination|redundancy|variation|reference)/i.test(lower)) return false

  // If the conversation already has context (follow-up to an HR question),
  // let short messages through without RAG
  if (wordCount <= 6 && history.length >= 2) return true

  return false
}

async function legacyStream(opts: {
  supabase: Awaited<ReturnType<typeof createClient>>
  systemPrompt: string
  claudeMessages: AnthropicMessage[]
  maxTokens: number
  conversationId?: string
  lastUserMsg: string
}) {
  const { supabase, systemPrompt, claudeMessages, maxTokens, conversationId, lastUserMsg } = opts
  const encoder = new TextEncoder()
  let fullResponse = ''
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const response = await anthropic.messages.create({
          model: MODEL,
          max_tokens: maxTokens,
          system: systemPrompt,
          messages: claudeMessages,
          stream: true,
        })
        for await (const chunk of response) {
          if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
            const text = chunk.delta.text
            fullResponse += text
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`))
          }
        }
        const escalate = detectEscalation(lastUserMsg + ' ' + fullResponse)
        const docType = detectDocumentRequest(lastUserMsg)
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, escalate, docType })}\n\n`))
        if (conversationId) {
          await supabase.from('messages').insert({
            conversation_id: conversationId,
            role: 'assistant',
            content: fullResponse,
            has_escalation: escalate,
            has_document: !!docType,
          })
          if (escalate) {
            await supabase.from('conversations')
              .update({ escalated: true, escalation_summary: lastUserMsg.substring(0, 200) })
              .eq('id', conversationId)
          }
        }
        controller.close()
      } catch (err) {
        const detail = err instanceof Error ? err.message : String(err)
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'Stream error', detail })}\n\n`))
        controller.close()
      }
    },
  })
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
