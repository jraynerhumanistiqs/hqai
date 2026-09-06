import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { normaliseScope } from '@/lib/team'

// Change a member's role or admin scope. Owner only. The owner cannot demote
// themselves here (there must always be one accountable person).

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data: me } = await supabase
    .from('profiles').select('business_id, role').eq('id', user.id).single()
  if (!me?.business_id) return NextResponse.json({ error: 'No business' }, { status: 400 })
  if (me.role !== 'owner') return NextResponse.json({ error: 'Only the owner can change roles' }, { status: 403 })
  if (id === user.id) return NextResponse.json({ error: 'You cannot change your own role' }, { status: 400 })

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid body' }, { status: 400 })

  // Target must be in the same business.
  const { data: target } = await supabaseAdmin
    .from('profiles').select('id, business_id, role').eq('id', id).maybeSingle()
  if (!target || target.business_id !== me.business_id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  if (target.role === 'owner') return NextResponse.json({ error: 'The owner role cannot be changed here' }, { status: 400 })

  const role = body.role === 'member' ? 'member' : 'admin'
  const adminScope = role === 'admin' ? normaliseScope(body.admin_scope) : 'all'
  const scopeIds: string[] = adminScope === 'selected' && Array.isArray(body.scope_employee_ids)
    ? body.scope_employee_ids.map(String)
    : []
  if (adminScope === 'selected' && scopeIds.length === 0) {
    return NextResponse.json({ error: 'Pick at least one team member for a selected scope' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('profiles').update({ role, admin_scope: adminScope }).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Re-materialise the selected list (or clear it for other scopes).
  await supabaseAdmin.from('admin_scopes').delete().eq('profile_id', id)
  if (adminScope === 'selected') {
    // Only employees in this business can be scoped.
    const { data: valid } = await supabaseAdmin
      .from('employees').select('id').eq('business_id', me.business_id).in('id', scopeIds)
    const ok = (valid ?? []).map(v => v.id)
    if (ok.length > 0) {
      await supabaseAdmin.from('admin_scopes').insert(
        ok.map(employee_id => ({ profile_id: id, employee_id, business_id: me.business_id })),
      )
    }
  }

  return NextResponse.json({ ok: true, role, admin_scope: adminScope, scope_employee_ids: scopeIds })
}
