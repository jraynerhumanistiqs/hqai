import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

interface Body {
  conversationId?: string | null
  module?: 'people' | 'recruit'
  rating?: 'up' | 'down'
  tier?: 'safe' | 'caution' | 'escalate'
  userMessage?: string
  assistantText?: string
}

// Fire-and-forget capture endpoint for the AI Advisor quality loop.
//
// The per-message thumbs (Actions in ChatInterface) POST here. This feeds the
// same eval/quality loop as chat_audit_log / chat_telemetry - it is a
// telemetry sink only and never influences a live response. Following the
// project convention (see /api/telemetry/field-edit), the caller never waits
// on success: any failure (including the chat_feedback table not yet being
// migrated) is swallowed and returns { ok: true } so the UI never breaks.
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ ok: true })

    const { data: profile } = await supabase
      .from('profiles')
      .select('businesses(id)')
      .eq('id', user.id)
      .single()
    const businessId = (profile?.businesses as unknown as { id: string } | null)?.id ?? null

    const body = (await req.json()) as Body
    if (body.rating !== 'up' && body.rating !== 'down') {
      return NextResponse.json({ ok: true })
    }

    await supabase.from('chat_feedback').insert({
      user_id: user.id,
      business_id: businessId,
      conversation_id: body.conversationId ?? null,
      module: body.module ?? 'people',
      rating: body.rating,
      tier: body.tier ?? null,
      user_message: (body.userMessage ?? '').slice(0, 2000),
      assistant_text: (body.assistantText ?? '').slice(0, 8000),
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.warn('[chat/feedback]', err)
    return NextResponse.json({ ok: true })
  }
}
