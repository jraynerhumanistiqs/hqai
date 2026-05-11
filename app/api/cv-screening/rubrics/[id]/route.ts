import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import type { Rubric } from '@/lib/cv-screening-types'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

// PATCH and DELETE for custom rubrics. Scoped to the user's business.
// Standard rubrics (rubric_id starting with anything other than UUID format)
// are read-only - this endpoint only operates on cv_custom_rubrics rows.

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    const body = await req.json() as { label?: string; rubric?: Rubric }
    const patch: Record<string, unknown> = {}
    if (typeof body.label === 'string' && body.label.trim()) patch.label = body.label.trim()
    if (body.rubric && typeof body.rubric === 'object') patch.rubric = body.rubric
    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('cv_custom_rubrics')
      .update(patch)
      .eq('id', id)
      .eq('business_id', businessId)
      .select('id, label, rubric, created_at')
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ rubric: data })
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: 'Update failed', detail }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    const { error } = await supabaseAdmin
      .from('cv_custom_rubrics')
      .delete()
      .eq('id', id)
      .eq('business_id', businessId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: 'Delete failed', detail }, { status: 500 })
  }
}
