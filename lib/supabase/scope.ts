// Resolves the set of user ids that belong to the caller's business.
// Used to scope service-role reads/writes on prescreen_sessions and
// derivative tables (which gate on created_by, not business_id directly).
// Returns empty array if the caller has no business linked yet - the
// caller should treat that as 'no sessions visible'.

import { supabaseAdmin } from '@/lib/supabase/admin'

export interface BusinessScope {
  userId: string
  businessId: string | null
  memberIds: string[]   // all profile ids that share businessId; empty if businessId is null
}

export async function resolveBusinessScope(userId: string): Promise<BusinessScope> {
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('business_id')
    .eq('id', userId)
    .single()

  const businessId = profile?.business_id ?? null
  if (!businessId) {
    return { userId, businessId: null, memberIds: [] }
  }

  const { data: members } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('business_id', businessId)

  return {
    userId,
    businessId,
    memberIds: (members ?? []).map((m: { id: string }) => m.id),
  }
}

// Convenience: load session ids in scope (active or soft-deleted). Used
// by routes that filter derivative tables by session_id. Pass
// includeDeleted=true for the bin view; default excludes soft-deleted.
export async function listSessionIdsInScope(
  scope: BusinessScope,
  opts: { includeDeleted?: boolean } = {},
): Promise<string[]> {
  if (scope.memberIds.length === 0) return []
  let q = supabaseAdmin
    .from('prescreen_sessions')
    .select('id')
    .in('created_by', scope.memberIds)
  if (!opts.includeDeleted) q = q.is('deleted_at', null)
  const { data } = await q
  return (data ?? []).map((r: { id: string }) => r.id)
}

// Confirms a single session id belongs to the caller's business. Use
// for PATCH/DELETE on /sessions/[id] before applying the mutation.
export async function assertSessionInScope(
  scope: BusinessScope,
  sessionId: string,
): Promise<boolean> {
  if (scope.memberIds.length === 0) return false
  const { data } = await supabaseAdmin
    .from('prescreen_sessions')
    .select('id')
    .eq('id', sessionId)
    .in('created_by', scope.memberIds)
    .maybeSingle()
  return !!data
}

// Confirms a single response id belongs to a session in the caller's
// business. Use for routes keyed by response id before mutation.
export async function assertResponseInScope(
  scope: BusinessScope,
  responseId: string,
): Promise<boolean> {
  if (scope.memberIds.length === 0) return false
  const { data: resp } = await supabaseAdmin
    .from('prescreen_responses')
    .select('session_id')
    .eq('id', responseId)
    .maybeSingle()
  if (!resp) return false
  return assertSessionInScope(scope, resp.session_id)
}
