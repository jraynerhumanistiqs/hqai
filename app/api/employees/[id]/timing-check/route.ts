import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { evaluateGate } from '@/lib/timing-gate'
import { employeeName, type ComplianceEvent } from '@/lib/employees'

// Timing check for a risky action on one person: how recently did a
// protected event happen? Called when the action is opened and again when it
// is confirmed. Reads only the caller's own records (RLS-scoped).

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('business_id').eq('id', user.id).single()
  const businessId = profile?.business_id as string | undefined
  if (!businessId) return NextResponse.json({ error: 'No business' }, { status: 400 })

  const [{ data: employee }, { data: events }] = await Promise.all([
    supabase.from('employees').select('id, first_name, last_name, status')
      .eq('id', id).eq('business_id', businessId).single(),
    supabase.from('compliance_events').select('event_type, metadata, occurred_at, title')
      .eq('employee_id', id).eq('business_id', businessId)
      .order('occurred_at', { ascending: false })
      .limit(200),
  ])
  if (!employee) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const gate = evaluateGate((events ?? []) as ComplianceEvent[])
  return NextResponse.json({
    ...gate,
    employee: { id: employee.id, name: employeeName(employee), status: employee.status },
    checked_at: new Date().toISOString(),
  })
}
