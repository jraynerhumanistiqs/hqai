// Team roles and admin scope - shared types + helpers.
//
// owner  - the account holder. Everything, including billing and roles.
// admin  - everything except billing and role management, limited to the
//          employees in their scope.
// member - signed in to the business, no access to people records.
//
// Scope only applies to admins:
//   all      - every employee in the business
//   selected - an explicit list (admin_scopes rows)
//   team     - the admin's own register entry plus everyone who reports to it

export type Role = 'owner' | 'admin' | 'member'
export type AdminScope = 'all' | 'selected' | 'team'

export const ROLE_LABELS: Record<Role, string> = {
  owner: 'Owner',
  admin: 'Admin',
  member: 'Member',
}

export const SCOPE_LABELS: Record<AdminScope, { label: string; hint: string }> = {
  all:      { label: 'Everyone',            hint: 'All team members, now and in future.' },
  selected: { label: 'Selected people',     hint: 'Only the people you tick.' },
  team:     { label: "User's team only",    hint: 'Themselves and everyone who reports to them. Updates automatically as the team changes.' },
}

export interface TeamMember {
  id: string
  full_name: string | null
  email: string | null
  role: Role
  admin_scope: AdminScope
  created_at: string
  /** Register entry linked to this login, if any. */
  employee_id: string | null
  /** For 'selected' admins: the employee ids in scope. */
  scope_employee_ids: string[]
}

export interface PendingInvite {
  id: string
  email: string
  role: Role
  admin_scope: AdminScope
  scope_employee_ids: string[]
  expires_at: string
  created_at: string
}

export function normaliseRole(v: unknown): Role {
  return v === 'admin' || v === 'member' ? v : 'owner'
}
export function normaliseScope(v: unknown): AdminScope {
  return v === 'selected' || v === 'team' ? v : 'all'
}

export const isOwner = (role: unknown) => role === 'owner'
export const canManageRecords = (role: unknown) => role === 'owner' || role === 'admin'
