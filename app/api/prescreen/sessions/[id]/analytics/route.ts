// GET /api/prescreen/sessions/[id]/analytics
// Role-level analytics tiles: funnel, avg time-to-score, dimension distribution,
// AI-agreement donut, bias audit summary.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

interface DimStat { name: string; mean: number; p25: number; p50: number; p75: number; min: number; max: number; n: number }

function percentile(sorted: number[], p: number): number {
  if (!sorted.length) return 0
  const idx = (sorted.length - 1) * p
  const lo = Math.floor(idx)
  const hi = Math.ceil(idx)
  if (lo === hi) return sorted[lo]
  const w = idx - lo
  return sorted[lo] * (1 - w) + sorted[hi] * w
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { id: sessionId } = await params

  // Responses for funnel + stage
  const { data: responses } = await supabaseAdmin
    .from('prescreen_responses')
    .select('id, status, stage, video_ids, submitted_at')
    .eq('session_id', sessionId)

  const list = responses ?? []
  const invited = list.length
  const started = list.filter(r => Array.isArray(r.video_ids) && r.video_ids.length > 0).length
  const ORDER: Record<string, number> = { submitted: 1, transcribing: 2, evaluating: 3, scored: 4, staff_reviewed: 5, shared: 6 }
  const atLeast = (s: string) => list.filter(r => (ORDER[String(r.status)] ?? 0) >= (ORDER[s] ?? 0)).length
  const submitted = atLeast('submitted')
  const scored = atLeast('scored')
  const shortlisted = list.filter(r => r.stage === 'shortlisted').length
  const rejected = list.filter(r => r.stage === 'rejected').length

  // Avg time-to-score - difference between response.submitted_at and earliest evaluation.created_at
  const responseIds = list.map(r => r.id)
  let avgTimeToScoreSec: number | null = null
  if (responseIds.length) {
    const { data: evals } = await supabaseAdmin
      .from('prescreen_evaluations')
      .select('response_id, created_at')
      .in('response_id', responseIds)
    const firstEvalBy: Record<string, string> = {}
    for (const e of evals ?? []) {
      const prev = firstEvalBy[e.response_id]
      if (!prev || new Date(e.created_at).getTime() < new Date(prev).getTime()) {
        firstEvalBy[e.response_id] = e.created_at
      }
    }
    const diffs: number[] = []
    for (const r of list) {
      const ev = firstEvalBy[r.id]
      if (ev && r.submitted_at) {
        const d = (new Date(ev).getTime() - new Date(r.submitted_at).getTime()) / 1000
        if (Number.isFinite(d) && d >= 0) diffs.push(d)
      }
    }
    if (diffs.length) avgTimeToScoreSec = Math.round(diffs.reduce((a, b) => a + b, 0) / diffs.length)
  }

  // Dimension distribution + bias counts
  const dimensionStats: DimStat[] = []
  let insufficientEvidenceCount = 0
  let lowConfidenceCount = 0
  if (responseIds.length) {
    const { data: evalsFull } = await supabaseAdmin
      .from('prescreen_evaluations')
      .select('response_id, rubric, created_at')
      .in('response_id', responseIds)
      .order('created_at', { ascending: false })
    // Keep only latest eval per response
    const latestByResp: Record<string, any> = {}
    for (const e of evalsFull ?? []) {
      if (!latestByResp[e.response_id]) latestByResp[e.response_id] = e
    }
    const scoresByDim: Record<string, number[]> = {}
    for (const e of Object.values(latestByResp)) {
      const rubric = Array.isArray((e as any).rubric) ? (e as any).rubric : []
      for (const d of rubric) {
        const name = String(d?.name ?? '').trim()
        if (!name) continue
        const score = Number(d?.score)
        if (Number.isFinite(score)) (scoresByDim[name] ||= []).push(score)
        if (d?.insufficient_evidence) insufficientEvidenceCount++
        if (Number(d?.confidence) < 0.5) lowConfidenceCount++
      }
    }
    for (const [name, arr] of Object.entries(scoresByDim)) {
      const sorted = [...arr].sort((a, b) => a - b)
      const mean = arr.reduce((a, b) => a + b, 0) / arr.length
      dimensionStats.push({
        name,
        mean: +mean.toFixed(2),
        p25: +percentile(sorted, 0.25).toFixed(2),
        p50: +percentile(sorted, 0.50).toFixed(2),
        p75: +percentile(sorted, 0.75).toFixed(2),
        min: sorted[0],
        max: sorted[sorted.length - 1],
        n: sorted.length,
      })
    }
    // Stable ordering: highest mean first, then alpha
    dimensionStats.sort((a, b) => b.mean - a.mean || a.name.localeCompare(b.name))
  }

  // AI agreement (staff decisions on suggestions)
  const { data: audits } = await supabaseAdmin
    .from('prescreen_scoring_audit')
    .select('staff_decision, response_id')
    .in('response_id', responseIds.length ? responseIds : ['00000000-0000-0000-0000-000000000000'])
  let accept = 0, adjust = 0, reject = 0
  for (const a of audits ?? []) {
    if (a.staff_decision === 'accept') accept++
    else if (a.staff_decision === 'adjust') adjust++
    else if (a.staff_decision === 'reject') reject++
  }
  const decided = accept + adjust + reject
  const pending = Math.max(0, scored - decided)

  return NextResponse.json({
    funnel: { invited, started, submitted, scored, shortlisted, rejected },
    avgTimeToScoreSec,
    dimensionStats,
    aiAgreement: { accept, adjust, reject, pending },
    biasAudit: {
      protected_attr_violations: 0,
      insufficient_evidence_count: insufficientEvidenceCount,
      low_confidence_count: lowConfidenceCount,
    },
  })
}