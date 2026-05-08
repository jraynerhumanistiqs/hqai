import { supabaseAdmin } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Cron runs at 20:00 UTC = 06:00 AEST. See vercel.json.
// Computes yesterday's chat telemetry summary + Campaign Coach edit rates +
// CV Screening criterion edit rates and emails it to James and Rav.

const RECIPIENTS = ['jrayner@humanistiqs.com.au', 'rprasad@humanistiqs.com.au']

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const summary = await buildSummary(since)
    if (process.env.RESEND_API_KEY) {
      const resend = new Resend(process.env.RESEND_API_KEY)
      await resend.emails.send({
        from: 'HQ.ai <hq.ai@humanistiqs.com.au>',
        to: RECIPIENTS,
        subject: `HQ.ai daily digest - ${new Date().toLocaleDateString('en-AU')}`,
        text: summary,
      })
    }
    return NextResponse.json({ ok: true, preview: summary })
  } catch (err) {
    console.error('[daily-digest]', err)
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 })
  }
}

async function buildSummary(since: string): Promise<string> {
  const { data: turns } = await supabaseAdmin
    .from('chat_telemetry')
    .select('total_ms, query_chars, errored, model, business_id')
    .gte('created_at', since)
  const turnsArr = turns ?? []
  const turnCount = turnsArr.length
  const erroredCount = turnsArr.filter(t => t.errored).length
  const latencies = turnsArr.map(t => t.total_ms ?? 0).filter(v => v > 0).sort((a, b) => a - b)
  const p50 = pickPercentile(latencies, 0.5)
  const p95 = pickPercentile(latencies, 0.95)
  const max = latencies.length > 0 ? latencies[latencies.length - 1] : 0

  const { data: edits } = await supabaseAdmin
    .from('coach_field_edits')
    .select('field_name, edited')
    .gte('created_at', since)
  const editsByField = (edits ?? []).reduce((acc, e) => {
    const f = e.field_name as string
    if (!acc[f]) acc[f] = { total: 0, edited: 0 }
    acc[f].total++
    if (e.edited) acc[f].edited++
    return acc
  }, {} as Record<string, { total: number; edited: number }>)

  const { data: cvOuts } = await supabaseAdmin
    .from('cv_screening_outputs')
    .select('rubric_id, staff_edits_count')
    .gte('created_at', since)

  const lines: string[] = []
  lines.push(`HQ.ai - daily telemetry digest`)
  lines.push(`Window: last 24h (since ${since})`)
  lines.push('')
  lines.push(`# Chat`)
  lines.push(`turns: ${turnCount}`)
  lines.push(`errored: ${erroredCount}`)
  lines.push(`latency p50/p95/max ms: ${p50} / ${p95} / ${max}`)
  lines.push('')
  lines.push(`# Campaign Coach field edits`)
  if (Object.keys(editsByField).length === 0) {
    lines.push('(no field edits captured)')
  } else {
    for (const [field, stats] of Object.entries(editsByField)) {
      const pct = stats.total > 0 ? Math.round((stats.edited / stats.total) * 100) : 0
      const flag = pct >= 40 ? ' [over 40% threshold - review prompt]' : ''
      lines.push(`${field}: ${stats.edited}/${stats.total} edited (${pct}%)${flag}`)
    }
  }
  lines.push('')
  lines.push(`# CV Screening`)
  lines.push(`screening completions: ${(cvOuts ?? []).length}`)
  lines.push('')
  lines.push(`Notion log: https://www.notion.so/`)
  return lines.join('\n')
}

function pickPercentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0
  const idx = Math.min(sorted.length - 1, Math.floor(sorted.length * p))
  return sorted[idx]
}
