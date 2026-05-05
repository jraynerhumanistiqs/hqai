import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30

/**
 * GET /api/chat/health
 *
 * Tiny end-to-end ping that proves:
 *  1. The Vercel deployment is reachable.
 *  2. ANTHROPIC_API_KEY is set.
 *  3. The Anthropic API itself accepts the key and returns a token.
 *
 * If chat is "not delivering responses", hit this URL first - the JSON
 * response tells you exactly which step failed without dev tools.
 */
export async function GET() {
  const apiKeyPresent = !!process.env.ANTHROPIC_API_KEY
  if (!apiKeyPresent) {
    return NextResponse.json(
      {
        ok: false,
        stage: 'env',
        reason: 'ANTHROPIC_API_KEY is not set on this deployment.',
      },
      { status: 503 },
    )
  }

  const started = Date.now()
  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const res = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 16,
      messages: [{ role: 'user', content: 'reply with the word OK.' }],
    })
    const text = res.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as { type: 'text'; text: string }).text)
      .join('')
      .trim()
    return NextResponse.json({
      ok: true,
      stage: 'anthropic',
      latency_ms: Date.now() - started,
      model: 'claude-sonnet-4-20250514',
      reply: text,
      stop_reason: res.stop_reason,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json(
      {
        ok: false,
        stage: 'anthropic',
        latency_ms: Date.now() - started,
        reason: msg,
      },
      { status: 502 },
    )
  }
}
