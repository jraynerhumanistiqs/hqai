// Create a new version of an existing custom rubric. Existing screenings
// retain their old rubric_id (pointing at the previous version row) so they
// stay bucketed under the version they were originally scored against.

import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import type { Rubric } from '@/lib/cv-screening-types'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

interface Body {
  rubric: Rubric
  label?: string
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('businesses(id)')
      .eq('id', user.id)
      .single()
    const businessId = (profile?.businesses as unknown as { id: string } | null)?.id ?? null
    if (!businessId) return NextResponse.json({ error: 'No business profile' }, { status: 400 })

    const body = await req.json() as Body
    if (!body.rubric || typeof body.rubric !== 'object') {
      return NextResponse.json({ error: 'rubric required' }, { status: 400 })
    }

    // Load the source row so we can copy family + source_jd through.
    const { data: source, error: sErr } = await supabaseAdmin
      .from('cv_custom_rubrics')
      .select('id, label, label_family, parent_rubric_id, source_jd, source_campaign_id, version_number')
      .eq('id', id)
      .eq('business_id', businessId)
      .single()
    if (sErr || !source) return NextResponse.json({ error: 'Source rubric not found' }, { status: 404 })

    const familyId = source.parent_rubric_id ?? source.id
    const familyLabel = source.label_family ?? source.label

    // Find current max version in this family so we can increment.
    const { data: latest } = await supabaseAdmin
      .from('cv_custom_rubrics')
      .select('version_number')
      .eq('parent_rubric_id', familyId)
      .order('version_number', { ascending: false })
      .limit(1)
      .single()
    const nextVersion = (latest?.version_number ?? source.version_number ?? 1) + 1

    // The new rubric snapshot stores the edited criteria. We also stamp the
    // rubric_id inside the JSONB so downstream scoring carries it through.
    const newRubric: Rubric = {
      ...body.rubric,
      rubric_id: body.rubric.rubric_id ?? `custom_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      version: nextVersion,
    }

    const { data: inserted, error: insErr } = await supabaseAdmin
      .from('cv_custom_rubrics')
      .insert({
        business_id: businessId,
        user_id: user.id,
        label: body.label?.trim() || `${familyLabel} (v${nextVersion})`,
        label_family: familyLabel,
        parent_rubric_id: familyId,
        version_number: nextVersion,
        rubric: newRubric,
        source_jd: source.source_jd,
        source_campaign_id: source.source_campaign_id,
      })
      .select('id, label, label_family, parent_rubric_id, version_number, rubric, created_at')
      .single()
    if (insErr) {
      console.error('[rubrics/version] insert', insErr)
      return NextResponse.json({ error: insErr.message }, { status: 500 })
    }

    return NextResponse.json({ rubric: inserted })
  } catch (err) {
    console.error('[rubrics/version POST]', err)
    const detail = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: 'Version create failed', detail }, { status: 500 })
  }
}
