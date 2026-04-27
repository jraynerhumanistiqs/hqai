// GET /api/prescreen/responses/[id]/transcript
// Returns the latest transcript for a response. Uses the service-role admin
// client because prescreen_transcripts has RLS enabled and the dashboard's
// browser-side anon-key client can't read it. Auth gate: requires a logged-in
// Supabase user (any user — staff dashboard).

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  // Auth gate: must be logged in. Anyone authed can read transcripts; if
  // we want per-business scoping later, join through prescreen_responses
  // -> prescreen_sessions -> businesses to check ownership.
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data, error } = await supabaseAdmin
    .from('prescreen_transcripts')
    .select('id, response_id, provider, text, utterances, created_at')
    .eq('response_id', id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('[GET /api/prescreen/responses/:id/transcript]', error)
    return NextResponse.json({ error: 'Could not load transcript' }, { status: 500 })
  }
  return NextResponse.json({ transcript: data ?? null })
}
