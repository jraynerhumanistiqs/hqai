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

    // Save user message
    const userMessage = messages[messages.length - 1]
    if (conversationId && userMessage?.role === 'user') {
      await supabase.from('messages').insert({
        conversation_id: conversationId,
        role: 'user',
        content: userMessage.content,
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
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          status: 'searching',
          message: SEARCH_PHRASES[Math.floor(Math.random() * SEARCH_PHRASES.length)],
        })}\n\n`))

        try {
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
                toolResults.push({
                  type: 'tool_result',
                  tool_use_id: tu.id,
                  content: r.output,
                  is_error: r.isError,
                })
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
            const finalRes = await withTimeout(
              anthropic.messages.create({
                model: MODEL,
                max_tokens: requestedDoc ? 4096 : (elapsed > SOFT_BUDGET_MS ? 800 : 1500),
                system: systemPrompt,
                tools,
                tool_choice: { type: 'none' },
                messages: working,
                stream: true,
              }),
              30_000,
              'Anthropic streaming start',
            )

            let lastChunkAt = Date.now()
            let stalled = false
            const STREAM_GAP_LIMIT_MS = 25_000
            const STREAM_TOTAL_LIMIT_MS = 50_000
            const streamStartedAt = Date.now()
            const watchdog = setInterval(() => {
              const overGap = Date.now() - lastChunkAt > STREAM_GAP_LIMIT_MS
              const overTotal = Date.now() - streamStartedAt > STREAM_TOTAL_LIMIT_MS
              if (overGap || overTotal) {
                stalled = true
                clearInterval(watchdog)
              }
            }, 2_000)

            try {
              for await (const chunk of finalRes) {
                if (stalled) break
                lastChunkAt = Date.now()
                if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
                  const text = chunk.delta.text
                  fullResponse += text
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`))
                }
              }
            } finally {
              clearInterval(watchdog)
            }
            if (stalled && !fullResponse) {
              throw new Error('Streaming stalled before any text arrived')
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

  // Audit log - fire-and-forget through `after()` so Vercel doesn't freeze
  // the lambda before the insert completes (same fix as the transcribe pipeline).
  // Skip auditing for eval-bypass requests (placeholder UUID would FK-violate).
  if (user.id === '00000000-0000-0000-0000-000000000000') return
  after(async () => {
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
      // chat_audit_log may not exist yet (pre-migration). Swallow quietly.
      console.warn('[chat] audit log insert failed:', (err as Error).message)
    }
  })

  controller.close()
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
