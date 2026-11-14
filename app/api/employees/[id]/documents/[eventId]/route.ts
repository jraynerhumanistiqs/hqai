import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { EMPLOYEE_DOCUMENTS_BUCKET } from '@/components/people/upload-rules'

// GET /api/employees/[id]/documents/[eventId] - open a file attached to a
// person's record. Authorised with the caller's own client (RLS decides who
// may see the employee and the trail row), then a 60-second signed URL is
// minted with the service role and the browser is redirected to it.
// No DELETE: the trail is append-only.

export const runtime = 'nodejs'

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string; eventId: string }> }) {
  const { id, eventId } = await ctx.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('business_id').eq('id', user.id).single()
  const businessId = profile?.business_id as string | undefined
  if (!businessId) return NextResponse.json({ error: 'No business' }, { status: 400 })

  const { data: employee } = await supabase
    .from('employees').select('id')
    .eq('id', id).eq('business_id', businessId).maybeSingle()
  if (!employee) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: event } = await supabase
    .from('compliance_events').select('id, business_id, employee_id, event_type, metadata')
    .eq('id', eventId).maybeSingle()
  if (
    !event ||
    event.business_id !== businessId ||
    event.employee_id !== employee.id ||
    event.event_type !== 'document_uploaded'
  ) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const path = String((event.metadata as Record<string, unknown> | null)?.storage_path ?? '')
  // The stored path must sit under this business and person - never trust a
  // metadata value to point elsewhere in the bucket.
  if (!path.startsWith(`${businessId}/${employee.id}/`) || path.includes('..')) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const { data: signed, error } = await supabaseAdmin.storage
    .from(EMPLOYEE_DOCUMENTS_BUCKET)
    .createSignedUrl(path, 60)
  if (error || !signed?.signedUrl) {
    return NextResponse.json({ error: 'The file could not be opened' }, { status: 404 })
  }

  return NextResponse.redirect(signed.signedUrl, 302)
}
