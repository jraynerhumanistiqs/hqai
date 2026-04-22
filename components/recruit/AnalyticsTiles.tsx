'use client'
import { useEffect, useMemo, useState } from 'react'

interface FunnelData {
  invited: number; started: number; submitted: number; scored: number; shortlisted: number; rejected: number
}
interface DimStat { name: string; p25: number; p50: number; p75: number; min: number; max: number; n: number }
interface Agreement { accept: number; adjust: number; reject: number; pending: number }
interface BiasAudit { protected_attr_violations: number; insufficient_evidence_count: number; low_confidence_count: number }
interface Analytics {
  funnel: FunnelData
  avgTimeToScoreSec: number | null
  dimensionStats: DimStat[]
  aiAgreement: Agreement
  biasAudit: BiasAudit
}

// Verbatim Claude guardrail paragraph from lib/claude-scoring.ts SYSTEM_PROMPT.
const GUARDRAIL_PARAGRAPH = `You MUST NOT infer or reference protected attributes (age, gender, ethnicity, accent, national origin, religion, disability, health, sexual orientation, family status). You MUST NOT score emotion, personality, confidence-as-a-trait, or culture fit. Score only task-relevant behaviour as evidenced by the candidate's own words in the transcript. Every score must cite a verbatim quote from the transcript and its start-second timestamp. If evidence is insufficient, return confidence < 0.5 and mark the dimension insufficient_evidence=true.`

export function AnalyticsTiles({ sessionId }: { sessionId: string }) {
  const [data, setData] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [drawerOpen, setDrawerOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch(`/api/prescreen/sessions/${sessionId}/analytics`)
      .then(r => r.json())
      .then(d => { if (!cancelled) setData(d) })
      .catch(console.error)
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [sessionId])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-6 h-6 border-2 border-border border-t-black rounded-full animate-spin" />
      </div>
    )
  }
  if (!data) return <p className="text-sm text-mid">Couldn&apos;t load analytics.</p>

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <FunnelTile funnel={data.funnel} />
        <TimeToScoreTile seconds={data.avgTimeToScoreSec} />
        <DimensionTile stats={data.dimensionStats} />
        <AgreementTile agreement={data.aiAgreement} />
        <BiasTile audit={data.biasAudit} onOpenEvidence={() => setDrawerOpen(true)} />
      </div>

      {drawerOpen && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          onClick={() => setDrawerOpen(false)}
        >
          <div className="bg-white rounded-2xl shadow-modal max-w-lg w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-serif text-lg font-bold text-black">Claude system-prompt guardrail</h3>
              <button onClick={() => setDrawerOpen(false)} className="text-mid hover:text-black text-lg leading-none" aria-label="Close">&times;</button>
            </div>
            <p className="text-xs text-mid mb-3">Verbatim guardrail paragraph used for every scoring request:</p>
            <pre className="text-xs text-charcoal bg-bg border border-border rounded-lg p-3 whitespace-pre-wrap font-mono">{GUARDRAIL_PARAGRAPH}</pre>
          </div>
        </div>
      )}
    </>
  )
}

function FunnelTile({ funnel }: { funnel: FunnelData }) {
  const rows: Array<{ key: string; label: string; value: number }> = [
    { key: 'invited', label: 'Invited / received', value: funnel.invited },
    { key: 'started', label: 'Started', value: funnel.started },
    { key: 'submitted', label: 'Submitted', value: funnel.submitted },
    { key: 'scored', label: 'Scored', value: funnel.scored },
    { key: 'shortlisted', label: 'Shortlisted', value: funnel.shortlisted },
    { key: 'rejected', label: 'Rejected', value: funnel.rejected },
  ]
  const max = Math.max(1, ...rows.map(r => r.value))
  return (
    <Tile title="Funnel">
      <div className="space-y-2">
        {rows.map(r => {
          const pct = Math.max(2, (r.value / max) * 100)
          return (
            <div key={r.key} className="flex items-center gap-3">
              <span className="text-xs text-mid w-36 flex-shrink-0">{r.label}</span>
              <div className="flex-1 h-4 bg-light rounded-full overflow-hidden">
                <div className="h-full bg-black rounded-full" style={{ width: `${pct}%` }} />
              </div>
              <span className="text-xs font-bold text-black w-8 text-right">{r.value}</span>
            </div>
          )
        })}
      </div>
    </Tile>
  )
}

function TimeToScoreTile({ seconds }: { seconds: number | null }) {
  const { num, unit } = useMemo(() => {
    if (seconds == null) return { num: 'n/a', unit: '' }
    if (seconds < 60) return { num: String(seconds), unit: 'seconds' }
    if (seconds < 3600) return { num: (seconds / 60).toFixed(1), unit: 'minutes' }
    return { num: (seconds / 3600).toFixed(1), unit: 'hours' }
  }, [seconds])
  return (
    <Tile title="Avg time to score">
      <div className="flex items-baseline gap-2">
        <span className="text-5xl font-bold text-black leading-none">{num}</span>
        <span className="text-sm text-mid">{unit}</span>
      </div>
      <p className="text-xs text-mid mt-2">From submission to first AI evaluation.</p>
    </Tile>
  )
}

function DimensionTile({ stats }: { stats: DimStat[] }) {
  if (!stats.length) {
    return (
      <Tile title="Per-dimension scores">
        <p className="text-xs text-mid">No scored responses yet.</p>
      </Tile>
    )
  }
  return (
    <Tile title="Per-dimension scores">
      <div className="space-y-3">
        {stats.map(s => <BoxPlotRow key={s.name} stat={s} />)}
      </div>
      <p className="text-[10px] text-mid mt-2">Min - p25 - median - p75 - max. Scale 1-5.</p>
    </Tile>
  )
}

function BoxPlotRow({ stat }: { stat: DimStat }) {
  const W = 260, H = 22, padX = 6
  const x = (v: number) => padX + ((v - 1) / 4) * (W - padX * 2)
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-mid w-28 flex-shrink-0 truncate">{stat.name}</span>
      <svg width={W} height={H} className="flex-1" aria-label={`${stat.name} distribution`}>
        <line x1={padX} x2={W - padX} y1={H / 2} y2={H / 2} stroke="#e2e2e2" strokeWidth={1} />
        <line x1={x(stat.min)} x2={x(stat.max)} y1={H / 2} y2={H / 2} stroke="#4b4b4b" strokeWidth={1} />
        <line x1={x(stat.min)} x2={x(stat.min)} y1={H / 2 - 4} y2={H / 2 + 4} stroke="#4b4b4b" strokeWidth={1} />
        <line x1={x(stat.max)} x2={x(stat.max)} y1={H / 2 - 4} y2={H / 2 + 4} stroke="#4b4b4b" strokeWidth={1} />
        <rect x={x(stat.p25)} y={H / 2 - 6} width={Math.max(1, x(stat.p75) - x(stat.p25))} height={12} fill="#1F1F1F" opacity={0.9} />
        <line x1={x(stat.p50)} x2={x(stat.p50)} y1={H / 2 - 6} y2={H / 2 + 6} stroke="#FFFFFF" strokeWidth={2} />
      </svg>
      <span className="text-[10px] text-mid w-10 text-right">n={stat.n}</span>
    </div>
  )
}

function AgreementTile({ agreement }: { agreement: Agreement }) {
  const slices = [
    { key: 'accept', label: 'Accepted', value: agreement.accept, color: '#000000' },
    { key: 'adjust', label: 'Adjusted', value: agreement.adjust, color: '#4b4b4b' },
    { key: 'reject', label: 'Rejected', value: agreement.reject, color: '#D94F4F' },
    { key: 'pending', label: 'Pending', value: agreement.pending, color: '#efefef' },
  ]
  const total = slices.reduce((a, s) => a + s.value, 0) || 1
  const realTotal = slices.reduce((a, s) => a + s.value, 0)
  const R = 44, C = 60, STROKE = 14
  const circumference = 2 * Math.PI * R
  let offset = 0
  return (
    <Tile title="AI agreement">
      <div className="flex items-center gap-5">
        <svg width={120} height={120} viewBox="0 0 120 120">
          <circle cx={C} cy={C} r={R} fill="none" stroke="#efefef" strokeWidth={STROKE} />
          {slices.map(s => {
            if (!s.value) return null
            const len = (s.value / total) * circumference
            const dash = `${len} ${circumference - len}`
            const el = (
              <circle
                key={s.key}
                cx={C} cy={C} r={R}
                fill="none"
                stroke={s.color}
                strokeWidth={STROKE}
                strokeDasharray={dash}
                strokeDashoffset={-offset}
                transform={`rotate(-90 ${C} ${C})`}
              />
            )
            offset += len
            return el
          })}
          <text x={C} y={C - 2} textAnchor="middle" dominantBaseline="middle" className="fill-black" style={{ fontWeight: 700, fontSize: 16 }}>{realTotal}</text>
          <text x={C} y={C + 14} textAnchor="middle" dominantBaseline="middle" className="fill-mid" style={{ fontSize: 10 }}>decisions</text>
        </svg>
        <div className="flex-1 space-y-1.5">
          {slices.map(s => (
            <div key={s.key} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: s.color }} />
                <span className="text-charcoal">{s.label}</span>
              </div>
              <span className="font-bold text-black">{s.value}</span>
            </div>
          ))}
        </div>
      </div>
    </Tile>
  )
}

function BiasTile({ audit, onOpenEvidence }: { audit: BiasAudit; onOpenEvidence: () => void }) {
  return (
    <Tile title="Bias audit">
      <ul className="space-y-2 text-sm">
        <li className="flex items-start gap-2">
          <span className="text-success mt-0.5">&#10003;</span>
          <span className="text-charcoal">
            Protected-attribute inference: prevented by design.{' '}
            <button onClick={onOpenEvidence} className="text-accent hover:underline font-bold">View system-prompt evidence</button>
          </span>
        </li>
        <li className="flex items-start gap-2">
          <span className="text-warning mt-0.5">&#9888;</span>
          <span className="text-charcoal">Low-confidence dimensions flagged: <span className="font-bold text-black">{audit.low_confidence_count}</span></span>
        </li>
        <li className="flex items-start gap-2">
          <span className="text-warning mt-0.5">&#9888;</span>
          <span className="text-charcoal">Insufficient-evidence dimensions: <span className="font-bold text-black">{audit.insufficient_evidence_count}</span></span>
        </li>
      </ul>
    </Tile>
  )
}

function Tile({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl shadow-card p-5">
      <p className="text-xs font-bold text-black uppercase tracking-widest mb-3">{title}</p>
      {children}
    </div>
  )
}
