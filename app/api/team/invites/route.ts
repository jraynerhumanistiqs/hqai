import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendTeamInviteEmail } from '@/lib/team-email'
import { normaliseScope } from '@/lib/team'

// Invites - create (owner only) and revoke.
//
// The invite carries the role and admin scope the owner chose, so accepting
// it lands the new member with the right access immediately. The email is
// best-effort: if Resend is not configured the invite still exists and the
// link is returned so the owner can share it another way.

async function owner(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { status: 401 as const, error: 'Unauthorised' }
  const { data: me } = await supabase
    .from('profiles').select('id, business_id, role, full_name').eq('id', user.id).single()
  if (!me?.business_id) return { status: 400 as const, error: 'No business' }
  if (me.role !== 'owner') return { status: 403 as const, error: 'Only the owner can invite people' }
  return { status: 200 as const, user, me }
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const o = await owner(supabase)
  if (o.status !== 200) return NextResponse.json({ error: o.error }, { status: o.status })

  const body = await req.json().catch(() => null)
  const email = String(body?.email ?? '').trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Enter a valid email address' }, { status: 400 })
  }
  const role = body?.role === 'member' ? 'member' : 'admin'
  const adminScope = role === 'admin' ? normaliseScope(body?.admin_scope) : 'all'
  const scopeIds: string[] = adminScope === 'selected' && Array.isArray(body?.scope_employee_ids)
    ? body.scope_employee_ids.map(String)
    : []
  if (adminScope === 'selected' && scopeIds.length === 0) {
    return NextResponse.json({ error: 'Pick at least one team member for a selected scope' }, { status: 400 })
  }

  // Already a member? Do not invite twice.
  const { data: existing } = await supabase
    .from('profiles').select('id').eq('business_id', o.me.business_id).ilike('email', email).maybeSingle()
  if (existing) return NextResponse.json({ error: 'That person is already on your team' }, { status: 409 })

  const { data: invite, error } = await supabase
    .from('business_invites')
    .insert({
      business_id: o.me.business_id,
      email,
      role,
      admin_scope: adminScope,
      scope_employee_ids: scopeIds,
      invited_by: o.user.id,
    })
    .select('id, token, email, role, admin_scope, scope_employee_ids, expires_at, created_at')
    .single()
  if (error || !invite) return NextResponse.json({ error: error?.message ?? 'Could not create invite' }, { status: 500 })

  const base = process.env.NEXT_PUBLIC_BASE_URL || req.nextUrl.origin
  const inviteUrl = `${base}/invite/${invite.token}`

  const { data: biz } = await supabase.from('businesses').select('name').eq('id', o.me.business_id).single()
  const { sent } = await sendTeamInviteEmail({
    to: email,
    inviterName: o.me.full_name || 'Your colleague',
    businessName: biz?.name || 'the business',
    inviteUrl,
    role,
  })

  return NextResponse.json({ invite: { ...invite, token: undefined }, inviteUrl, emailSent: sent }, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const o = await owner(supabase)
  if (o.status !== 200) return NextResponse.json({ error: o.error }, { status: o.status })

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const { error } = await supabase
    .from('business_invites').delete()
    .eq('id', id).eq('business_id', o.me.business_id).is('accepted_at', null)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
