import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

/**
 * Invites someone into the caller's PPAD organisation.
 *
 * WHY A SERVER ROUTE. Creating an auth user needs the service role, which
 * must never reach the browser. The admin check runs first and uses the
 * CALLER's session, so the service role is only ever used after the request
 * has proved it came from an admin of that business.
 *
 * WHAT IT DOES NOT DO. It cannot move someone between businesses. An email
 * that already belongs to an HQ.ai account in another business is refused,
 * not reassigned - that would silently hand one customer's staff member to
 * another customer's org.
 *
 * Public sign-up stays on for the rest of the site. Invite-only for PPAD is
 * enforced here and at the membership layer, not by the project's auth
 * settings, because the paid self-serve funnel depends on open sign-up.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  const makeAdmin = body.isAdmin === true
  const makeHr = body.isHrReporting === true
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: 'Enter a valid email address' }, { status: 400 })
  }

  // Caller's business.
  const { data: profile } = await supabase
    .from('profiles').select('business_id').eq('id', user.id).single()
  const businessId = profile?.business_id
  if (!businessId) return NextResponse.json({ error: 'You are not in a business' }, { status: 403 })

  // Caller must be a PPAD admin OF THAT BUSINESS. Read through the caller's
  // own session, so RLS is doing the work rather than our own filtering.
  const { data: me } = await supabase
    .from('ppad_members').select('is_admin')
    .eq('business_id', businessId).eq('user_id', user.id).maybeSingle()
  if (!me?.is_admin) {
    return NextResponse.json({ error: 'Only an HQ Performance admin can invite' }, { status: 403 })
  }

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )

  // Does the account already exist? listUsers is paginated and has no exact
  // email filter, so scan - these are org-sized lists, not internet-sized.
  let existing: { id: string } | null = null
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    // Annotated because listUsers' data/error union narrows `users` to
    // never[] after the error guard above, so `u` has no inferred shape.
    const users = data.users as Array<{ id: string; email?: string | null }>
    const hit = users.find(u => (u.email || '').toLowerCase() === email)
    if (hit) { existing = { id: hit.id }; break }
    if (data.users.length < 1000) break
  }

  let userId: string
  let invited = false

  if (existing) {
    // Already an HQ.ai account. Only safe to add if they are already in this
    // business - otherwise we would be moving a person between customers.
    const { data: theirProfile } = await admin
      .from('profiles').select('business_id').eq('id', existing.id).maybeSingle()

    if (theirProfile?.business_id && theirProfile.business_id !== businessId) {
      return NextResponse.json(
        { error: 'That email already belongs to an account in another business.' },
        { status: 409 },
      )
    }
    if (!theirProfile?.business_id) {
      const { error } = await admin.from('profiles')
        .upsert({ id: existing.id, business_id: businessId, email }, { onConflict: 'id' })
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    }
    userId = existing.id
  } else {
    const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_BASE_URL || ''}/dashboard/tools/ppad`,
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    userId = data.user.id
    invited = true
    const { error: pErr } = await admin.from('profiles')
      .upsert({ id: userId, business_id: businessId, email, role: 'member' }, { onConflict: 'id' })
    if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 })
  }

  const { error: mErr } = await admin.from('ppad_members').upsert(
    { business_id: businessId, user_id: userId, is_admin: makeAdmin, is_hr_reporting: makeHr, created_by: user.id },
    { onConflict: 'business_id,user_id' },
  )
  if (mErr) return NextResponse.json({ error: mErr.message }, { status: 500 })

  // Audited like every other membership change. Written with the service
  // role because the RPCs that normally audit are not involved here.
  await admin.from('ppad_audit_log').insert({
    business_id: businessId, actor_user_id: user.id,
    action: invited ? 'member.invite' : 'member.add_existing',
    target_type: 'member', target_id: userId,
    detail: { email, is_admin: makeAdmin, is_hr_reporting: makeHr },
  })

  return NextResponse.json({ ok: true, userId, invited })
}
