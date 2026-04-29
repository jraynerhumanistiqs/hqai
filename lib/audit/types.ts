/**
 * Audit schema types.
 *
 * PLACEHOLDER - real shapes get filled in once Step 4 of
 * docs/AUDIT-MIGRATION-RUNBOOK.md lands and we know the actual columns.
 *
 * The fields below are best-guess defaults so the page scaffold compiles;
 * expect to rewrite this file once the migration is verified.
 */

export interface AuditAssessment {
  id: string
  business_id: string | null
  created_at: string
  updated_at?: string | null
  status?: string | null
  // ... fill in once schema lands
}

export interface AuditFinding {
  id: string
  assessment_id: string
  severity: 'low' | 'medium' | 'high' | 'critical' | string
  title: string
  detail?: string | null
  remediation?: string | null
  // ... fill in once schema lands
}

export interface AuditHealthResponse {
  ok: boolean
  tables: string[]
  error?: string
}
