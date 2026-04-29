import { createClient, SupabaseClient } from '@supabase/supabase-js'

/**
 * Service-role Supabase client scoped to the `audit` schema.
 *
 * Migration runbook: docs/AUDIT-MIGRATION-RUNBOOK.md
 *
 * Lives in the same HQ.ai Supabase project (Option A from the integration
 * decision) but reads/writes against the `audit` schema rather than `public`,
 * so audit tables are namespaced and obvious.
 *
 * Server-only - bypasses RLS. Never import into a client component.
 */
let _audit: SupabaseClient | null = null

export function getAuditAdmin(): SupabaseClient {
  if (!_audit) {
    _audit = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: { persistSession: false },
        db: { schema: 'audit' },
      }
    )
  }
  return _audit
}

/**
 * Lazy proxy alias - mirrors the supabaseAdmin pattern in lib/supabase/admin.ts
 * so callsites read like `auditAdmin.from('assessments').select(...)`.
 */
export const auditAdmin = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return (getAuditAdmin() as any)[prop]
  },
})
