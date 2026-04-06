import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { buildSystemPrompt, detectEscalation, detectDocumentRequest } from '@/lib/prompts'
import { NextRequest } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 60

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return new Response('Unauthorised', { status: 401 })

    // Load business context
    const { data: profile } = await supabase
      .from('profiles')
      .select('*, businesses(*)')
      .eq('id', user.id)
      .single()

    const business = profile?.businesses as any
    const { messages, conversationId, module } = await req.json()

    const systemPrompt = buildSystemPrompt(module || 'people', {
      name: business?.name || 'Unknown',
      industry: business?.industry || 'General',
      state: business?.state || 'QLD',
      award: business?.award || 'Not specified',
      headcount: business?.headcount || 'Not specified',
      empTypes: business?.employment_types || 'Mixed',
      advisorName: business?.advisor_name || 'Sarah',
      userName: profile?.full_name || '',
    })

    // Save user message to DB
    const userMessage = messages[messages.length - 1]
    if (conversationId && userMessage?.role === 'user') {
      await supabase.from('messages').insert({
        conversation_id: conversationId,
        role: 'user',
        content: userMessage.content,
      })
    }

    // Build message array for Claude (last 10 turns)
    const claudeMessages = messages.slice(-10).map((m: any) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }))

    // Stream response
    const encoder = new TextEncoder()
    let fullResponse = ''

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const response = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 1500,
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

          // Detect escalation and document signals
          const lastUserMsg = messages.filter((m: any) => m.role === 'user').slice(-1)[0]?.content || ''
          const escalate = detectEscalation(lastUserMsg + ' ' + fullResponse)
          const docType = detectDocumentRequest(lastUserMsg)

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            done: true,
            escalate,
            docType,
          })}\n\n`))

          // Save assistant message to DB
          if (conversationId) {
            await supabase.from('messages').insert({
              conversation_id: conversationId,
              role: 'assistant',
              content: fullResponse,
              has_escalation: escalate,
              has_document: !!docType,
            })

            // Update conversation escalation status
            if (escalate) {
              const summary = lastUserMsg.substring(0, 200)
              await supabase.from('conversations')
                .update({ escalated: true, escalation_summary: summary })
                .eq('id', conversationId)
            }
          }

          controller.close()
        } catch (err) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'Stream error' })}\n\n`))
          controller.close()
        }
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      }
    })
  } catch (err) {
    return new Response('Server error', { status: 500 })
  }
}
