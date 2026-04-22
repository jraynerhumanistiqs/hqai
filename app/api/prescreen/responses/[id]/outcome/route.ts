// GET /api/prescreen/responses/[id]/outcome
// Returns the most recent outcome event for a response, if any.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { id } = await params
  const { data } = await supabaseAdmin
    .from('prescreen_outcome_events')
    .select('id, response_id, outcome, email_sent, email_to, email_subject, email_body, triggered_by, created_at')
    .eq('response_id', id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return NextResponse.json({ event: data ?? null })
}
