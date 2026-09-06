import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { EMPLOYMENT_TYPES, AU_STATES, type Employee } from '@/lib/employees'
import { computeGaps } from '@/lib/record-gaps'

// Employee register - list and create.
// Business-scoped via the caller's profile; RLS enforces the same boundary at
// the database, so a mistake here cannot leak another business's records.

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

  const includeEnded = req.nextUrl.searchParams.get('includeEnded') === 'true'

  let q = supabase
    .from('employees')
    .select('*')
    .eq('business_id', businessId)
    .order('start_date', { ascending: false })

  if (!includeEnded) q = q.eq('status', 'active')

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const rows = (data ?? []) as Employee[]
  if (rows.length === 0) return NextResponse.json([])

  // Evidence-gap summary per person - one extra query for the whole business
  // rather than one per employee. Only event_type + metadata are needed.
  const { data: evs } = await supabase
    .from('compliance_events')
    .select('employee_id, event_type, metadata')
    .eq('business_id', businessId)
    .not('employee_id', 'is', null)

  type SlimEvent = { employee_id: string; event_type: string; metadata: Record<string, unknown> | null }
  const byEmployee = new Map<string, SlimEvent[]>()
  for (const ev of (evs ?? []) as SlimEvent[]) {
    const list = byEmployee.get(ev.employee_id) ?? []
    list.push(ev)
    byEmployee.set(ev.employee_id, list)
  }

  // Headcount drives the minimum employment period for the probation gap.
  const headcount = rows.filter(r => r.status === 'active').length || 1

  const withGaps = rows.map(r => {
    const list = byEmployee.get(r.id) ?? []
    const docTypes = list
      .filter(e => e.event_type === 'document_linked')
      .map(e => String(e.metadata?.doc_type ?? ''))
    const g = computeGaps(r, list, docTypes, headcount)
    return { ...r, gaps: { satisfied: g.satisfied, total: g.total, missing: g.missing.length } }
  })

  return NextResponse.json(withGaps)
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const businessId = await businessIdFor(supabase, user.id)
  if (!businessId) return NextResponse.json({ error: 'No business' }, { status: 400 })

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid body' }, { status: 400 })

  // Validate at the boundary - the register drives date calculations, so a bad
  // start_date is not a cosmetic problem.
  const firstName = String(body.first_name ?? '').trim()
  if (!firstName) return NextResponse.json({ error: 'First name is required' }, { status: 400 })

  const startDate = String(body.start_date ?? '').trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || Number.isNaN(Date.parse(startDate))) {
    return NextResponse.json({ error: 'A valid start date is required' }, { status: 400 })
  }

  const employmentType = String(body.employment_type ?? 'full_time')
  if (!EMPLOYMENT_TYPES.includes(employmentType as never)) {
    return NextResponse.json({ error: 'Invalid employment type' }, { status: 400 })
  }

  const state = body.state ? String(body.state) : null
  if (state && !AU_STATES.includes(state as never)) {
    return NextResponse.json({ error: 'Invalid state' }, { status: 400 })
  }

  const row = {
    business_id: businessId,
    first_name: firstName,
    last_name: body.last_name ? String(body.last_name).trim() : null,
    email: body.email ? String(body.email).trim() : null,
    job_title: body.job_title ? String(body.job_title).trim() : null,
    start_date: startDate,
    employment_type: employmentType,
    fixed_term_end: body.fixed_term_end || null,
    award: body.award ? String(body.award).trim() : null,
    classification: body.classification ? String(body.classification).trim() : null,
    // "not sure" is a first-class answer - never block the user on identifying
    // their award, which is one of the things they came here confused about.
    award_confirmed: Boolean(body.award_confirmed),
    state,
    notes: body.notes ? String(body.notes) : null,
  }

  const { data, error } = await supabase.from('employees').insert(row).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Evidence trail: adding someone to the register is itself a recorded event.
  // Best-effort - a trail failure must never block the register write.
  await supabase.from('compliance_events').insert({
    business_id: businessId,
    employee_id: data.id,
    event_type: 'employee_added',
    title: `${firstName} added to the employee register`,
    occurred_at: new Date().toISOString(),
    recorded_by: user.id,
  })

  return NextResponse.json(data, { status: 201 })
}
