import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

interface Body {
  surface: 'coach' | 'cv_screening'
  step?: string
  campaign_id?: string
  screening_id?: string
  rubric_id?: string
  field_name?: string
  ai_value?: unknown
  final_value?: unknown
  staff_edits_count?: number
}

// Fire-and-forget capture endpoint for the AI accuracy feedback loop (D4).
// Caller never waits on success - logging failure is non-blocking.
// Accepts either Campaign Coach Step 2 field edits or CV Screening rubric edits.
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ ok: true })

    const { data: profile } = await supabase
      .from('profiles')
      .select('businesses(id)')
      .eq('id', user.id)
      .single()
    const businessId = (profile?.businesses as unknown as { id: string } | null)?.id ?? null

    const body = await req.json() as Body

    if (body.surface === 'coach') {
      const aiStr = JSON.stringify(body.ai_value ?? null)
      const finalStr = JSON.stringify(body.final_value ?? null)
      const editDistance = aiStr === finalStr ? 0 : Math.abs(aiStr.length - finalStr.length)
      await supabase.from('coach_field_edits').insert({
        business_id: businessId,
        user_id: user.id,
        campaign_id: body.campaign_id ?? null,
        step: body.step ?? null,
        field_name: body.field_name ?? 'unknown',
        ai_value: body.ai_value ?? null,
        final_value: body.final_value ?? null,
        edited: aiStr !== finalStr,
        edit_distance: editDistance,
      })
    } else if (body.surface === 'cv_screening') {
      await supabase.from('cv_screening_outputs').insert({
        business_id: businessId,
        user_id: user.id,
        screening_id: body.screening_id ?? null,
        rubric_id: body.rubric_id ?? null,
        ai_scores: body.ai_value ?? null,
        ai_evidence: null,
        final_scores: body.final_value ?? null,
        staff_edits_count: body.staff_edits_count ?? 0,
      })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.warn('[telemetry/field-edit]', err)
    return NextResponse.json({ ok: true })
  }
}
