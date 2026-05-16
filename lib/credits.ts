// B10 - credit ledger writes.
//
// Source: docs/research/2026-05-16_ai-doc-creation-teardown.md
// section 7. Every model call that costs credits records a row in
// `credit_ledger` keyed by business + tool + intent, so unit
// economics are queryable per surface (advisor vs administrator vs
// recruit). The actual balance is read by the API gates before
// permitting the call; this file is the write side.
//
// Schema: supabase/migrations/credit_ledger.sql

import { supabaseAdmin } from '@/lib/supabase/admin'

export type CreditTool = 'advisor' | 'administrator' | 'recruit' | 'one_off'

export interface RecordCreditsInput {
  business_id: string | null
  user_id: string | null
  tool: CreditTool
  intent: string
  /** Positive for charges, negative for refunds. */
  cost: number
  /** Optional links - useful for invoice + dispute later. */
  document_id?: string | null
  response_id?: string | null
  stripe_event_id?: string | null
  notes?: string | null
}

export async function recordCredits(input: RecordCreditsInput): Promise<void> {
  const { error } = await supabaseAdmin.from('credit_ledger').insert({
    business_id:      input.business_id,
    user_id:          input.user_id,
    tool:             input.tool,
    intent:           input.intent,
    cost:             input.cost,
    document_id:      input.document_id ?? null,
    response_id:      input.response_id ?? null,
    stripe_event_id:  input.stripe_event_id ?? null,
    notes:            input.notes ?? null,
  })
  if (error) {
    // Don't throw - we never want a credit-ledger write failure to
    // break the user-facing flow. The route already received the
    // response from the model. Surface the error to logs instead.
    console.warn('[credits.recordCredits] insert failed:', error.message)
  }
}

export interface CreditBalance {
  allocated: number
  used: number
  remaining: number
}

/** Returns the running balance for a business across the current
 *  billing period. The `credit_allocations` table defines what the
 *  plan grants; the ledger sums consumed credits since the last
 *  reset. */
export async function getCreditBalance(business_id: string): Promise<CreditBalance> {
  const { data: alloc } = await supabaseAdmin
    .from('credit_allocations')
    .select('allocated, period_start')
    .eq('business_id', business_id)
    .order('period_start', { ascending: false })
    .limit(1)
    .maybeSingle()

  const allocated = alloc?.allocated ?? 0
  const periodStart = alloc?.period_start ?? new Date(Date.now() - 30 * 86400000).toISOString()

  const { data: ledger } = await supabaseAdmin
    .from('credit_ledger')
    .select('cost')
    .eq('business_id', business_id)
    .gte('created_at', periodStart)
  const used = (ledger ?? []).reduce((acc, row: { cost: number }) => acc + (row.cost ?? 0), 0)

  return {
    allocated,
    used,
    remaining: Math.max(0, allocated - used),
  }
}
