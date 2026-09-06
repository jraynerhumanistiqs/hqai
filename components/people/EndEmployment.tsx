'use client'

// End employment - the risky action, gated on timing.
//
//   1. Open  -> run the timing check (form-open).
//   2. Tier:
//        safe      -> a small confirm (end date), then go.
//        caution   -> amber "worth a professional's eyes" - still allowed.
//        escalate  -> red-but-reassuring: the action is held, and the user is
//                     pointed at their advisor with the situation packaged.
//                     Never a dead end; an explicit override exists but is
//                     recorded on the trail.
//   3. Confirm -> re-check (generate). If the tier has moved up since the
//      form opened (a note was added meanwhile), show the new state instead.
//
// Copy states the date and distance from their own record. It never says
// whether the decision is fair, lawful or reasonable.

import { useState } from 'react'
import { RiAlertLine, RiLifebuoyLine } from '@remixicon/react'
import { PROTECTED_KINDS, type GateResult } from '@/lib/timing-gate'

interface Props {
  employeeId: string
  employeeName: string
  onEnded: () => void
}

type Step = 'idle' | 'checking' | 'gate' | 'confirm' | 'saving'

const today = () => new Date().toISOString().slice(0, 10)
const fmt = (iso: string) =>
  new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })

export default function EndEmployment({ employeeId, employeeName, onEnded }: Props) {
  const [step, setStep] = useState<Step>('idle')
  const [gate, setGate] = useState<GateResult | null>(null)
  const [endDate, setEndDate] = useState(today())
  const [override, setOverride] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function check(): Promise<GateResult | null> {
    const res = await fetch(`/api/employees/${employeeId}/timing-check`)
    if (!res.ok) throw new Error((await res.json()).error ?? 'Could not run the timing check')
    return (await res.json()) as GateResult
  }

  async function open() {
    setStep('checking'); setError(null); setOverride(false)
    try {
      const g = await check()
      setGate(g)
      setStep(g?.tier === 'safe' ? 'confirm' : 'gate')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not run the timing check')
      setStep('idle')
    }
  }

  async function confirm() {
    setStep('saving'); setError(null)
    try {
      // Re-check at the moment of action - the record may have changed.
      const g = await check()
      if (g && g.tier !== 'safe' && !(override && g.tier === (gate?.tier ?? g.tier))) {
        setGate(g); setStep('gate'); return
      }
      const res = await fetch(`/api/employees/${employeeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'ended', end_date: endDate }),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Could not end employment')

      // If they proceeded past a caution/escalate, that choice is itself part
      // of the record - written at the time, like everything else.
      if (g && g.tier !== 'safe') {
        await fetch('/api/compliance-events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            employee_id: employeeId,
            event_type: 'other',
            title: `Employment ended with a timing ${g.tier === 'escalate' ? 'hold' : 'caution'} acknowledged`,
            detail: g.event
              ? `${PROTECTED_KINDS[g.event.kind].label} recorded ${fmt(g.event.occurred_at)} (${g.days} days before). User chose to proceed.`
              : 'User chose to proceed.',
            metadata: { timing_tier: g.tier, timing_days: g.days, timing_kind: g.event?.kind ?? null },
          }),
        })
      }
      onEnded()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not end employment')
      setStep('confirm')
    }
  }

  if (step === 'idle') {
    return (
      <div className="mt-5">
        <button
          onClick={() => void open()}
          className="rounded-full border border-border px-3 py-1.5 text-xs font-bold text-ink-soft transition-colors hover:bg-bg-soft hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          End employment
        </button>
        {error && <p className="mt-2 text-xs text-ink-soft">{error}</p>}
      </div>
    )
  }

  if (step === 'checking') {
    return <p className="mt-5 text-xs text-ink-muted">Checking {employeeName}&apos;s record for recent timing risk...</p>
  }

  const ev = gate?.event
  const kindLabel = ev ? PROTECTED_KINDS[ev.kind].label.toLowerCase() : ''

  return (
    <div className="mt-5 space-y-3">
      {/* Caution */}
      {gate?.tier === 'caution' && (
        <div className="rounded-2xl border border-[color-mix(in_srgb,var(--warning)_32%,transparent)] bg-[color-mix(in_srgb,var(--warning)_8%,transparent)] p-3.5">
          <div className="flex gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--warning)_16%,transparent)] text-warning">
              <RiAlertLine className="h-4 w-4" aria-hidden="true" />
            </span>
            <div className="flex-1 text-xs">
              <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-warning">Worth a professional&apos;s eyes</p>
              <p className="mt-1 text-ink">
                {employeeName}&apos;s record shows {kindLabel} on {ev ? fmt(ev.occurred_at) : ''} - {gate?.days} days ago.
              </p>
              <p className="mt-1 text-ink-soft">
                You can go ahead. Given how recent that is, it is worth having your Humanistiqs advisor look over the timing first - just so you are covered.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Escalate */}
      {gate?.tier === 'escalate' && (
        <div className="rounded-2xl border border-[color-mix(in_srgb,var(--danger)_32%,transparent)] bg-[color-mix(in_srgb,var(--danger)_7%,transparent)] p-3.5">
          <div className="flex gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--danger)_13%,transparent)] text-danger">
              <RiLifebuoyLine className="h-4 w-4" aria-hidden="true" />
            </span>
            <div className="flex-1 text-xs">
              <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-danger">Let us get your advisor on this first</p>
              <p className="mt-1 text-ink">
                {employeeName}&apos;s record shows {kindLabel} on {ev ? fmt(ev.occurred_at) : ''} - only {gate?.days} days ago.
              </p>
              <p className="mt-1 text-ink-soft">
                Acting this soon after that carries real risk, so HQ has held this step. The safe move is to bring in your Humanistiqs advisor - HQ can package what is on the record so they are ready, no repeating yourself.
              </p>
              <div className="mt-2.5 flex flex-wrap gap-2">
                <a
                  href={`/dashboard/people/advisor?prompt=${encodeURIComponent(`I want to end ${employeeName}'s employment, but their record shows ${kindLabel} ${gate?.days} days ago. Help me prepare for a conversation with my advisor.`)}`}
                  className="rounded-full bg-accent px-3 py-1.5 text-xs font-bold text-ink-on-accent hover:bg-accent-hover"
                >
                  Get me ready for my advisor
                </a>
                <button onClick={() => setStep('idle')} className="rounded-full border border-border px-3 py-1.5 text-xs font-bold text-ink-soft hover:bg-bg-soft hover:text-ink">
                  Not now
                </button>
              </div>
              {!override ? (
                <button onClick={() => setOverride(true)} className="mt-3 block text-[11px] text-ink-muted underline underline-offset-2 hover:text-ink">
                  I have taken advice and still need to proceed
                </button>
              ) : (
                <p className="mt-3 text-[11px] text-ink-muted">Proceeding will be noted on the record, with today&apos;s date.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirm - safe, caution, or an acknowledged escalate */}
      {(gate?.tier === 'safe' || gate?.tier === 'caution' || (gate?.tier === 'escalate' && override)) && (
        <div className="rounded-2xl border border-border p-3.5 space-y-2">
          <label className="block">
            <span className="text-xs font-medium text-ink-soft">Last day of employment</span>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="mt-1.5 w-full rounded-lg border border-border bg-bg-elevated px-3 py-2 text-sm text-ink outline-none focus:border-ink" />
          </label>
          <p className="text-[11px] text-ink-muted">
            This marks {employeeName} as no longer employed and keeps their record. It does not send anything to them.
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => void confirm()}
              disabled={step === 'saving'}
              className="rounded-full bg-accent px-4 py-2 text-xs font-bold text-ink-on-accent hover:bg-accent-hover disabled:opacity-40"
            >
              {step === 'saving' ? 'Ending...' : 'End employment'}
            </button>
            <button onClick={() => setStep('idle')} className="rounded-full px-3 py-2 text-xs font-bold text-ink-soft hover:bg-bg-soft hover:text-ink">
              Cancel
            </button>
          </div>
        </div>
      )}

      {error && <p className="text-xs text-ink-soft">{error}</p>}
    </div>
  )
}
