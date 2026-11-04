import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { Employee } from '@/lib/employees'
import { buildWorklist, type WorklistEvent } from '@/lib/worklist'

// GET /api/assistant/worklist - the AI Assistant's derived worklist.
//
// Zero model calls. Business-scoped exactly like GET /api/employees: the
// caller's profile gives the business_id, RLS enforces the same boundary at
// the database, and a scoped admin's queries come back already narrowed by
// can_access_employee(). Two reads plus the headcount RPC, then a pure
// derivation in lib/worklist.ts.
//
// What this route must never return: the business_headcount() value, or any
// count derived from it. The RPC is SECURITY DEFINER and reports the whole
// business, which is correct for the minimum-employment-period date maths and
// wrong to show a scoped admin who can only see four of thirty people. It is
// passed into the derivation and dropped. See the spec s6.6.

/** Plenty for an SME register, and a hard stop on an unbounded scan. */
const EVENT_LIMIT = 2000

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('business_id').eq('id', user.id).single()
  const businessId = profile?.business_id as string | undefined
  if (!businessId) return NextResponse.json({ error: 'No business' }, { status: 400 })

  const [{ data: employees, error: empError }, { data: events }, { data: hc }, { data: business }] =
    await Promise.all([
      supabase
        .from('employees')
        .select('*')
        .eq('business_id', businessId)
        .eq('status', 'active')
        .order('start_date', { ascending: false }),
      // One query for the whole trail. Only the four columns the derivation
      // reads, so no file-note detail text travels with it.
      supabase
        .from('compliance_events')
        .select('id, employee_id, event_type, occurred_at, metadata')
        .eq('business_id', businessId)
        .order('occurred_at', { ascending: false })
        .limit(EVENT_LIMIT),
      // Date maths only - see the header note.
      supabase.rpc('business_headcount'),
      // The free-text band from onboarding ("1-14"), for the first-run copy.
      supabase.from('businesses').select('headcount').eq('id', businessId).single(),
    ])

  // An empty register is a first-run state, not an error - it is the single
  // most likely real state today and the worklist has a first work item for
  // it. Only a genuine query failure is a 500.
  if (empError) return NextResponse.json({ error: empError.message }, { status: 500 })

  const rows = (employees ?? []) as Employee[]
  const worklist = buildWorklist({
    employees: rows,
    events: (events ?? []) as WorklistEvent[],
    headcount: Number(hc) || rows.length || 1,
    statedHeadcount: (business?.headcount as string | null) ?? null,
  })

  return NextResponse.json(worklist)
}
