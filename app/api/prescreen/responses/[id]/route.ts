// PATCH /api/prescreen/responses/[id] - update rating, status, notes

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  try {
    const body = await req.json()
    const { data, error } = await supabaseAdmin
      .from('candidate_responses')
      .update(body)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ response: data })
  } catch (err) {
    console.error('[PATCH /api/prescreen/responses/:id]', err)
    return NextResponse.json({ error: 'Failed to update response' }, { status: 500 })
  }
}
