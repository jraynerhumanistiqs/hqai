import { getSupabaseAdmin } from '@/lib/supabase/admin'
import ComingSoon from '@/components/dashboard/ComingSoon'

export const dynamic = 'force-dynamic'

/**
 * Workplace Compliance Audit landing page.
 *
 * Pre-migration: shows a "Connecting your audit data" interstitial.
 * Post-migration: lists the tables visible under the `audit` schema as
 * a smoke test until we wire real audit views.
 *
 * Migration runbook: docs/AUDIT-MIGRATION-RUNBOOK.md
 */
export default async function Page() {
  let tables: string[] = []
  let migrationLanded = false
  let errorMsg: string | null = null

  try {
    const admin = getSupabaseAdmin()
    const { data, error } = await admin.rpc('audit_list_tables')
    if (error) {
      errorMsg = error.message
    } else if (Array.isArray(data) && data.length > 0) {
      migrationLanded = true
      tables = data.map((r: { table_name: string }) => r.table_name)
    }
  } catch (err) {
    errorMsg = err instanceof Error ? err.message : 'Unknown error'
  }

  if (!migrationLanded) {
    return (
      <ComingSoon
        title="Workplace Compliance Audit"
        blurb="Connecting your audit data. The humanistiqs-audits database is being migrated into HQ.ai - the page will light up automatically once the data lands."
      />
    )
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-h1 font-semibold text-charcoal mb-2">
        Workplace Compliance Audit
      </h1>
      <p className="text-mid mb-6">
        Audit data is connected. {tables.length} table
        {tables.length === 1 ? '' : 's'} visible under the audit schema.
      </p>

      <div className="bg-bg-elevated shadow-card rounded-2xl p-6">
        <h2 className="text-h3 font-semibold text-charcoal mb-3">
          Connected tables
        </h2>
        <ul className="text-mid font-mono text-small space-y-1">
          {tables.map((t) => (
            <li key={t}>audit.{t}</li>
          ))}
        </ul>
        <p className="text-muted text-small mt-4">
          Real audit views land here once the schema is confirmed - see
          docs/AUDIT-MIGRATION-RUNBOOK.md step 4.
        </p>
        {errorMsg && (
          <p className="text-danger text-small mt-2">Note: {errorMsg}</p>
        )}
      </div>
    </div>
  )
}
