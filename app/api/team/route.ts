import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { normaliseRole, normaliseScope, type PendingInvite, type TeamMember } from '@/lib/team'

// Team overview for the owner: members (with role, scope, linked register
// entry) and pending invites. Owner-only - RLS on invites/scopes enforces the
// same, but a clear 403 beats an empty list.

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data: me } = await supabase
    .from('profiles').select('business_id, role').eq('id', user.id).single()
  if (!me?.business_id) return NextResponse.json({ error: 'No business' }, { status: 400 })
  if (me.role !== 'owner') return NextResponse.json({ error: 'Only the owner can manage the team' }, { status: 403 })

  const [{ data: profiles }, { data: invites }, { data: scopes }, { data: linked }] = await Promise.all([
    supabase.from('profiles')
      .select('id, full_name, email, role, admin_scope, created_at')
      .eq('business_id', me.business_id)
      .order('created_at', { ascending: true }),
    supabase.from('business_invites')
      .select('id, email, role, admin_scope, scope_employee_ids, expires_at, created_at')
      .eq('business_id', me.business_id)
      .is('accepted_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false }),
    supabase.from('admin_scopes')
      .select('profile_id, employee_id')
      .eq('business_id', me.business_id),
    supabase.from('employees')
      .select('id, profile_id')
      .eq('business_id', me.business_id)
      .not('profile_id', 'is', null),
  ])

  const scopeByProfile = new Map<string, string[]>()
  for (const s of scopes ?? []) {
    const list = scopeByProfile.get(s.profile_id) ?? []
    list.push(s.employee_id)
    scopeByProfile.set(s.profile_id, list)
  }
  const employeeByProfile = new Map<string, string>()
  for (const e of linked ?? []) if (e.profile_id) employeeByProfile.set(e.profile_id, e.id)

  const members: TeamMember[] = (profiles ?? []).map(p => ({
    id: p.id,
    full_name: p.full_name,
    email: p.email,
    role: normaliseRole(p.role),
    admin_scope: normaliseScope(p.admin_scope),
    created_at: p.created_at,
    employee_id: employeeByProfile.get(p.id) ?? null,
    scope_employee_ids: scopeByProfile.get(p.id) ?? [],
  }))

  const pending: PendingInvite[] = (invites ?? []).map(i => ({
    id: i.id,
    email: i.email,
    role: normaliseRole(i.role),
    admin_scope: normaliseScope(i.admin_scope),
    scope_employee_ids: i.scope_employee_ids ?? [],
    expires_at: i.expires_at,
    created_at: i.created_at,
  }))

  return NextResponse.json({ members, pending, me_id: user.id })
}
