import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

// Accept an invite. The sibling of /api/onboarding: instead of creating a new
// business for a fresh signup, it attaches the signed-in user to the inviting
// business with the role and scope the owner chose.
//
// Service-role is required here - the accepting user has no business_id yet
// (or a different one), so RLS would hide the invite and block the profile
// update. Every check is done explicitly before writing.

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sign in first' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const token = String(body?.token ?? '').trim()
  if (!/^[a-f0-9]{48}$/.test(token)) return NextResponse.json({ error: 'Invalid invite' }, { status: 400 })

  const { data: invite } = await supabaseAdmin
    .from('business_invites')
    .select('id, business_id, email, role, admin_scope, scope_employee_ids, expires_at, accepted_at')
    .eq('token', token)
    .maybeSingle()

  if (!invite) return NextResponse.json({ error: 'This invite does not exist' }, { status: 404 })
  if (invite.accepted_at) return NextResponse.json({ error: 'This invite has already been used' }, { status: 410 })
  if (new Date(invite.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ error: 'This invite has expired - ask for a new one' }, { status: 410 })
  }
  // The invite is addressed to a specific person.
  if ((user.email ?? '').toLowerCase() !== invite.email.toLowerCase()) {
    return NextResponse.json(
      { error: `This invite was sent to ${invite.email}. Sign in with that address to accept it.` },
      { status: 403 },
    )
  }

  // Do not silently move someone who already belongs to another business.
  const { data: profile } = await supabaseAdmin
    .from('profiles').select('business_id, role').eq('id', user.id).maybeSingle()
  if (profile?.business_id && profile.business_id !== invite.business_id) {
    return NextResponse.json(
      { error: 'This account already belongs to another business' },
      { status: 409 },
    )
  }

  const { error: upErr } = await supabaseAdmin
    .from('profiles')
    .upsert({
      id: user.id,
      email: user.email,
      full_name: (user.user_metadata?.full_name as string | undefined) ?? profile?.role ?? null,
      business_id: invite.business_id,
      role: invite.role,
      admin_scope: invite.admin_scope,
    }, { onConflict: 'id' })
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 })

  // Selected scope: materialise the list the owner chose.
  if (invite.role === 'admin' && invite.admin_scope === 'selected') {
    const ids: string[] = invite.scope_employee_ids ?? []
    if (ids.length > 0) {
      await supabaseAdmin.from('admin_scopes').delete().eq('profile_id', user.id)
      await supabaseAdmin.from('admin_scopes').insert(
        ids.map(employee_id => ({ profile_id: user.id, employee_id, business_id: invite.business_id })),
      )
    }
  }

  await supabaseAdmin
    .from('business_invites')
    .update({ accepted_at: new Date().toISOString(), accepted_by: user.id })
    .eq('id', invite.id)

  return NextResponse.json({ ok: true, role: invite.role })
}
