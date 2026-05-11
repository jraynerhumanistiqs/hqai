import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// PATCH /api/conversations/[id]  body: { title }
// DELETE /api/conversations/[id]
// Both scoped to the caller's user_id so a member can only modify their own
// conversations even when business_id is shared. Cascading delete on the
// messages FK takes care of the children.

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
