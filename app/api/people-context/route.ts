import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { detectTopic, signalsFor } from '@/lib/people-context'
import { evaluateGate, type GateResult } from '@/lib/timing-gate'
import type { ComplianceEvent, Employee } from '@/lib/employees'

// Reactive hook endpoint.
//
// Given what the user just typed, return facts from their OWN employee register
// that are relevant right now. Returns an empty list rather than erroring when
// there is nothing to say - a silent no-op is the correct behaviour for a hint.

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ signals: [] })

  const body = await req.json().catch(() => null)
  const text = String(body?.text ?? '')
  if (!text.trim()) return NextResponse.json({ signals: [] })

  const topic = detectTopic(text)
  if (!topic) return NextResponse.json({ signals: [], topic: null })

  const { data: profile } = await supabase
    .from('profiles').select('business_id').eq('id', user.id).single()
  if (!profile?.business_id) return NextResponse.json({ signals: [], topic })

  const { data: employees, error } = await supabase
    .from('employees').select('*')
    .eq('business_id', profile.business_id)
    .eq('status', 'active')

  // If the register does not exist yet or is empty, stay quiet. The hint is a
  // bonus on top of the answer, never a prerequisite for it.
  if (error || !employees || employees.length === 0) {
    return NextResponse.json({ signals: [], topic })
  }

  // Headcount drives the minimum employment period (12 months under 15 staff,
  // otherwise 6), so it is derived from the register itself.
  const headcount = employees.length

  // Phase 3: timing risk per person, from the trail. Only fetched for the
  // topics where it matters, and only the event types the gate reads.
  let timing: Map<string, GateResult> | undefined
  if (topic === 'termination' || topic === 'performance') {
    const ids = (employees as Employee[]).map(e => e.id)
    const { data: evs } = await supabase
      .from('compliance_events')
      .select('employee_id, event_type, metadata, occurred_at, title')
      .eq('business_id', profile.business_id)
      .in('employee_id', ids)
      .in('event_type', ['file_note', 'flexible_request', 'casual_conversion'])
      .order('occurred_at', { ascending: false })
      .limit(500)
    const byEmployee = new Map<string, ComplianceEvent[]>()
    for (const ev of (evs ?? []) as Array<ComplianceEvent & { employee_id: string }>) {
      const list = byEmployee.get(ev.employee_id) ?? []
      list.push(ev)
      byEmployee.set(ev.employee_id, list)
    }
    timing = new Map()
    for (const [id, list] of byEmployee) timing.set(id, evaluateGate(list))
  }

  const signals = signalsFor(topic, employees as Employee[], headcount, new Date(), 3, timing)

  return NextResponse.json({ signals, topic })
}
