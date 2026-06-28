import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

// Fire-and-forget engagement telemetry for the Campaign Coach Tip Bot.
// Events: tip_viewed / tip_cycled / tip_dismissed / tip_source_clicked.
// Never blocks the UI; insert failures are swallowed (always returns ok).
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

    const body = (await req.json().catch(() => ({}))) as {
      event?: string
      tip_id?: string
      stage?: string
      region?: string
      category?: string
    }

    await getSupabaseAdmin().from('tip_events').insert({
      business_id: businessId,
      user_id: user.id,
      event: body.event ?? 'unknown',
      tip_id: body.tip_id ?? null,
      stage: body.stage ?? null,
      region: body.region ?? null,
      category: body.category ?? null,
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.warn('[telemetry/tip]', err)
    return NextResponse.json({ ok: true })
  }
}
