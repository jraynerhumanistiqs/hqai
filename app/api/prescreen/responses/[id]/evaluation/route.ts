// GET /api/prescreen/responses/[id]/evaluation
// Returns the latest evaluation row for a response. Same pattern as
// /transcript: prescreen_evaluations has RLS, so the browser anon-key
// client can't read it. Service-role admin client behind a logged-in
// staff user gate.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data, error } = await supabaseAdmin
    .from('prescreen_evaluations')
    .select('id, response_id, rubric, overall_summary, model, created_at')
    .eq('response_id', id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('[GET /api/prescreen/responses/:id/evaluation]', error)
    return NextResponse.json({ error: 'Could not load evaluation' }, { status: 500 })
  }
  return NextResponse.json({ evaluation: data ?? null })
}
