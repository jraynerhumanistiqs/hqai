import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { buildSystemPrompt, detectEscalation, detectDocumentRequest } from '@/lib/prompts'
import { tools, runTool, ToolRunResult } from '@/lib/chat-tools'
import { parseCitations } from '@/lib/parse-citations'
import { NextRequest, after } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 90

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const MODEL = 'claude-sonnet-4-20250514'
const MAX_TOOL_ITERATIONS = 3

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

        try {
          for (let iter = 0; iter < MAX_TOOL_ITERATIONS; iter++) {
            const isFinalIter = iter === MAX_TOOL_ITERATIONS - 1

            // Non-streaming tool-discovery turn (or the final streaming turn).
            if (!isFinalIter) {
              // Force search_knowledge on the first iteration so the model
              // can't sidestep grounding by claiming "I can't verify" without
              // ever consulting the corpus. Subsequent iterations are auto.
              const toolChoice = iter === 0
                ? { type: 'tool' as const, name: 'search_knowledge' }
                : { type: 'auto' as const }
              const res = await anthropic.messages.create({
                model: MODEL,
                max_tokens: 2048,
                system: systemPrompt,
                tools,
                tool_choice: toolChoice,
                messages: working,
              })

              if (res.stop_reason !== 'tool_use') {
                // Model answered without calling a tool — stream the text out.
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

              // Tool use requested — dispatch each tool_use block, append results.
              working.push({ role: 'assistant', content: res.content })
              const toolUseBlocks = res.content.filter(b => b.type === 'tool_use') as Array<{
                type: 'tool_use'; id: string; name: string; input: Record<string, unknown>
              }>

              const toolResults: Array<{ type: 'tool_result'; tool_use_id: string; content: string; is_error?: boolean }> = []
              for (const tu of toolUseBlocks) {
                const r: ToolRunResult = await runTool(tu.id, tu.name, tu.input, citationCursor)
                // Debug breadcrumb (eval-smoke branch only) — surfaces what the
                // model searched for and how many chunks came back. Remove
                // before merging to main.
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                  debug: {
                    tool: tu.name,
                    input: tu.input,
                    hits: r.citations.length,
                    output_preview: r.output.slice(0, 400),
                  },
                })}\n\n`))
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

            // Final iteration — stream the answer. Force no further tool use
            // so the model commits to text instead of attempting another
            // tool_use block that would never resolve in the streaming path.
            const finalRes = await anthropic.messages.create({
              model: MODEL,
              max_tokens: requestedDoc ? 4096 : 1500,
              system: systemPrompt,
              tools, // still declared so the model can still cite [n]
              tool_choice: { type: 'none' },
              messages: working,
              stream: true,
            })

            for await (const chunk of finalRes) {
              if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
                const text = chunk.delta.text
                fullResponse += text
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`))
              }
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
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch (err) {
    console.error('[chat] fatal:', err)
    return new Response('Server error', { status: 500 })
  }
}

// --- helpers -----------------------------------------------------------------

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

  // Audit log — fire-and-forget through `after()` so Vercel doesn't freeze
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
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
