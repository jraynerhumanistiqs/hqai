import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { EMPLOYMENT_TYPES, AU_STATES } from '@/lib/employees'

// Single employee - fetch, update, end employment.
// Deletion is deliberately not exposed: ending employment preserves the
// evidence trail, which is the whole point of the record. Hard erasure stays a
// service-role operation for privacy requests.

async function businessIdFor(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data } = await supabase
    .from('profiles').select('business_id').eq('id', userId).single()
  return data?.business_id as string | undefined
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const businessId = await businessIdFor(supabase, user.id)
  if (!businessId) return NextResponse.json({ error: 'No business' }, { status: 400 })

  const { data: employee, error } = await supabase
    .from('employees').select('*')
    .eq('id', id).eq('business_id', businessId).single()

  if (error || !employee) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: events } = await supabase
    .from('compliance_events').select('*')
    .eq('employee_id', id).eq('business_id', businessId)
    .order('occurred_at', { ascending: false })

  return NextResponse.json({ employee, events: events ?? [] })
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const businessId = await businessIdFor(supabase, user.id)
  if (!businessId) return NextResponse.json({ error: 'No business' }, { status: 400 })

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid body' }, { status: 400 })

  const patch: Record<string, unknown> = {}
  const text = (k: string) => {
    if (body[k] !== undefined) patch[k] = body[k] ? String(body[k]).trim() : null
  }
  ;['last_name', 'email', 'job_title', 'award', 'classification', 'notes'].forEach(text)

  if (body.first_name !== undefined) {
    const v = String(body.first_name).trim()
    if (!v) return NextResponse.json({ error: 'First name is required' }, { status: 400 })
    patch.first_name = v
  }
  if (body.start_date !== undefined) {
    const v = String(body.start_date)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v) || Number.isNaN(Date.parse(v))) {
      return NextResponse.json({ error: 'A valid start date is required' }, { status: 400 })
    }
    patch.start_date = v
  }
  if (body.employment_type !== undefined) {
    if (!EMPLOYMENT_TYPES.includes(String(body.employment_type) as never)) {
      return NextResponse.json({ error: 'Invalid employment type' }, { status: 400 })
    }
    patch.employment_type = body.employment_type
  }
  if (body.state !== undefined) {
    if (body.state && !AU_STATES.includes(String(body.state) as never)) {
      return NextResponse.json({ error: 'Invalid state' }, { status: 400 })
    }
    patch.state = body.state || null
  }
  if (body.award_confirmed !== undefined) patch.award_confirmed = Boolean(body.award_confirmed)
  if (body.fixed_term_end !== undefined) patch.fixed_term_end = body.fixed_term_end || null

  // Ending employment: set status + end date together so the register never
  // holds an "ended" person with no end date (which would break date logic).
  const ending = body.status === 'ended'
  if (ending) {
    patch.status = 'ended'
    patch.end_date = body.end_date || new Date().toISOString().slice(0, 10)
  } else if (body.status === 'active') {
    patch.status = 'active'
    patch.end_date = null
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('employees').update(patch)
    .eq('id', id).eq('business_id', businessId)
    .select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await supabase.from('compliance_events').insert({
    business_id: businessId,
    employee_id: id,
    event_type: ending ? 'employee_ended' : 'employee_updated',
    title: ending
      ? `Employment ended for ${data.first_name}`
      : `${data.first_name}'s details updated`,
    detail: ending ? null : `Updated: ${Object.keys(patch).join(', ')}`,
    occurred_at: new Date().toISOString(),
    recorded_by: user.id,
  })

  return NextResponse.json(data)
}
