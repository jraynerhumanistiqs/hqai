import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

/**
 * Smoke-test endpoint for the Workplace Compliance Audit migration.
 *
 * Returns the list of tables visible under the `audit` schema. Used by
 * `/dashboard/compliance/audit` to decide whether the migration has
 * landed and to surface a useful error if it hasn't.
 *
 * Migration runbook: docs/AUDIT-MIGRATION-RUNBOOK.md
 */
export async function GET() {
  try {
    // Use the standard admin client (default `public` schema) to query the
    // information_schema - we don't need the audit-scoped client here.
    const admin = getSupabaseAdmin()

    const { data, error } = await admin
      .rpc('audit_list_tables')
      .select()
      .returns<{ table_name: string }[]>()

    if (error) {
      // RPC missing is expected pre-migration; fall back to a raw query
      // via the REST API by hitting a known information_schema view.
      // Supabase doesn't expose information_schema by default, so the
      // simplest pre-migration signal is "audit schema not reachable".
      return NextResponse.json({
        ok: false,
        tables: [],
        error: error.message,
      })
    }

    return NextResponse.json({
      ok: true,
      tables: (data ?? []).map((r) => r.table_name),
    })
  } catch (err) {
    return NextResponse.json({
      ok: false,
      tables: [],
      error: err instanceof Error ? err.message : 'Unknown error',
    })
  }
}
