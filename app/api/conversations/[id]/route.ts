import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET    /api/conversations/[id]  -> { id, title, module, escalated, messages[] }
// PATCH  /api/conversations/[id]  body: { title }
// DELETE /api/conversations/[id]
// All scoped to the caller's user_id so a member can only reach their own
// conversations even when business_id is shared. Cascading delete on the
// messages FK takes care of the children.

// Opening a conversation from the history sidebar needs its messages back.
// Without this the sidebar set conversationId and closed itself while the
// transcript stayed on screen unchanged - the chat looked like it had
// ignored the click, and the next message you sent was appended to a
// conversation whose history you could not see.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  // Ownership is checked on the conversation row, not inferred from the
  // messages, so a guessed id cannot leak a transcript.
  const { data: convo, error: convoError } = await supabase
    .from('conversations')
    .select('id, title, module, escalated, created_at')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (convoError || !convo) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const { data: messages, error: msgError } = await supabase
    .from('messages')
    .select('role, content, has_escalation, created_at')
    .eq('conversation_id', id)
    .order('created_at', { ascending: true })

  if (msgError) return NextResponse.json({ error: msgError.message }, { status: 500 })

  return NextResponse.json({
    ...convo,
    messages: (messages ?? []).map(m => ({
      role: m.role,
      content: m.content,
      escalate: m.has_escalation ?? false,
    })),
  })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const title = typeof body.title === 'string' ? body.title.trim() : ''
  if (!title) return NextResponse.json({ error: 'Title required' }, { status: 400 })
  if (title.length > 120) return NextResponse.json({ error: 'Title too long' }, { status: 400 })

  const { data, error } = await supabase
    .from('conversations')
    .update({ title })
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  // Delete messages first (no ON DELETE CASCADE guarantee in legacy schemas)
  await supabase.from('messages').delete().eq('conversation_id', id)

  const { error } = await supabase
    .from('conversations')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
