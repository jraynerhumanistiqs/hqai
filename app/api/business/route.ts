// PATCH /api/business - update current user's business workspace fields.
// Phase 4: supports { calendly_url } with https://calendly.com validation.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

const CALENDLY_URL_REGEX = /^https:\/\/(www\.)?calendly\.com\/[A-Za-z0-9_\-\/?=&.%]+$/

export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data: profile } = await supabaseAdmin
    .from('profiles').select('business_id').eq('id', user.id).single()
  const bizId = profile?.business_id
  if (!bizId) return NextResponse.json({ error: 'No business' }, { status: 404 })

  let body: any = {}
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const patch: Record<string, unknown> = {}
  if (typeof body.calendly_url === 'string' || body.calendly_url === null) {
    const raw = typeof body.calendly_url === 'string' ? body.calendly_url.trim() : ''
    if (raw === '' || body.calendly_url === null) {
      patch.calendly_url = null
    } else if (!CALENDLY_URL_REGEX.test(raw)) {
      return NextResponse.json({ error: 'Calendly URL must start with https://calendly.com/' }, { status: 400 })
    } else {
      patch.calendly_url = raw
    }
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'No valid fields' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('businesses').update(patch).eq('id', bizId).select('id, calendly_url').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ business: data })
}
