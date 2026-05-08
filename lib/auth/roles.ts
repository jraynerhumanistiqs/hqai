import { createClient } from '@/lib/supabase/server'

export type AppRole = 'owner' | 'test_admin' | 'member'

export interface AuthIdentity {
  userId: string
  email: string
  role: AppRole
  businessId: string | null
}

// Returns the signed-in user's identity + role from profiles, or null if not
// signed in. Cached per-request via the Supabase server client.
export async function currentIdentity(): Promise<AuthIdentity | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, email, role, business_id')
    .eq('id', user.id)
    .single()
  if (!profile) return null

  const role: AppRole = (profile.role === 'owner' || profile.role === 'test_admin') ? profile.role : 'member'

  return {
    userId: profile.id as string,
    email: (profile.email as string) ?? user.email ?? '',
    role,
    businessId: (profile.business_id as string | null) ?? null,
  }
}

// True for owner-only mutation endpoints. test_admin is read-only by design.
export function canEdit(role: AppRole): boolean {
  return role === 'owner'
}

// True for any internal Humanistiqs surface (Coming-Soon modules, debug
// panels, telemetry dashboards). owner + test_admin both qualify.
export function isInternal(role: AppRole): boolean {
  return role === 'owner' || role === 'test_admin'
}

// Hard guard for mutation routes. Throws a 403 if the caller is not the owner.
export async function requireOwner(): Promise<AuthIdentity> {
  const id = await currentIdentity()
  if (!id) {
    throw new RoleError('Unauthorised', 401)
  }
  if (!canEdit(id.role)) {
    throw new RoleError(
      'Read-only mode. Owner approval required to perform this action.',
      403,
    )
  }
  return id
}

// Soft guard for read endpoints that should be visible to internal-only users.
export async function requireInternal(): Promise<AuthIdentity> {
  const id = await currentIdentity()
  if (!id) throw new RoleError('Unauthorised', 401)
  if (!isInternal(id.role)) {
    throw new RoleError('Internal-only surface', 403)
  }
  return id
}

export class RoleError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}
