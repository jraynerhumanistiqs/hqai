import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { EVENT_TYPES } from '@/lib/employees'

// The evidence trail.
//
// Append-only by design (the table has no UPDATE policy). The value of this
// record is that it was written at the time rather than reconstructed later -
// which is exactly what the reverse onus of proof turns on in a wage dispute.

async function businessIdFor(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data } = await supabase
    .from('profiles').select('business_id').eq('id', userId).single()
  return data?.business_id as string | undefined
}

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const businessId = await businessIdFor(supabase, user.id)
  if (!businessId) return NextResponse.json({ error: 'No business' }, { status: 400 })

  const employeeId = req.nextUrl.searchParams.get('employeeId')
  const limit = Math.min(Number(req.nextUrl.searchParams.get('limit') ?? 50), 200)

  let q = supabase
    .from('compliance_events')
    .select('*')
    .eq('business_id', businessId)
    .order('occurred_at', { ascending: false })
    .limit(limit)

  if (employeeId) q = q.eq('employee_id', employeeId)

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const businessId = await businessIdFor(supabase, user.id)
  if (!businessId) return NextResponse.json({ error: 'No business' }, { status: 400 })

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid body' }, { status: 400 })

  const eventType = String(body.event_type ?? 'other')
  const title = String(body.title ?? '').trim() || EVENT_TYPES[eventType]?.label
  if (!title) return NextResponse.json({ error: 'A title is required' }, { status: 400 })

  // occurred_at may be backdated (the conversation happened last Tuesday), but
  // created_at always records when it was actually entered - so the gap between
  // the two is itself visible rather than hidden.
  let occurredAt = new Date().toISOString()
  if (body.occurred_at) {
    const parsed = Date.parse(String(body.occurred_at))
    if (Number.isNaN(parsed)) {
      return NextResponse.json({ error: 'Invalid date' }, { status: 400 })
    }
    if (parsed > Date.now() + 86_400_000) {
      return NextResponse.json({ error: 'Date cannot be in the future' }, { status: 400 })
    }
    occurredAt = new Date(parsed).toISOString()
  }

  // If an employee is named, confirm they belong to this business before
  // writing - RLS would catch it, but a clear 404 beats a policy error.
  if (body.employee_id) {
    const { data: emp } = await supabase
      .from('employees').select('id')
      .eq('id', body.employee_id).eq('business_id', businessId).single()
    if (!emp) return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
  }

  const { data, error } = await supabase.from('compliance_events').insert({
    business_id: businessId,
    employee_id: body.employee_id || null,
    event_type: eventType,
    title,
    detail: body.detail ? String(body.detail) : null,
    occurred_at: occurredAt,
    recorded_by: user.id,
    document_id: body.document_id || null,
    bmp_code: body.bmp_code || EVENT_TYPES[eventType]?.bmp || null,
    metadata: body.metadata ?? {},
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
