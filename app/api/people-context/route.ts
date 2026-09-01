import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { detectTopic, signalsFor } from '@/lib/people-context'
import type { Employee } from '@/lib/employees'

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
  const signals = signalsFor(topic, employees as Employee[], headcount)

  return NextResponse.json({ signals, topic })
}
