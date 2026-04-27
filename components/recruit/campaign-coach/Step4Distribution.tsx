'use client'
import { useEffect } from 'react'
import { useWizard } from './wizard-state'
import type { DistributionPlan } from '@/lib/campaign-types'

const BOARD_LABELS: Record<string, string> = {
  seek: 'SEEK',
  indeed: 'Indeed',
  linkedin: 'LinkedIn',
  jora: 'Jora',
  careerone: 'CareerOne',
  ethicaljobs: 'EthicalJobs',
  hqai_careers: 'HQ.ai careers page',
}

const STUB_PLAN: DistributionPlan = {
  total_estimated_cost_aud: 340,
  boards: [
    {
      id: 'hqai_careers',
      method: 'internal',
      estimated_cost_aud: 0,
      rationale: 'Always publish to your HQ.ai careers microsite. Free, indexed by Google for Jobs and Jora.',
    },
    {
      id: 'seek',
      method: 'deep_link',
      estimated_cost_aud: 340,
      rationale: 'Non-negotiable for most Australian roles — strongest reach. Deep-link prefills title and location; paste the body on the next screen.',
    },
    {
      id: 'indeed',
      method: 'deep_link',
      estimated_cost_aud: 0,
      rationale: 'Useful free supplement to SEEK. Deep-link with limited prefill.',
    },
    {
      id: 'linkedin',
      method: 'deep_link',
      estimated_cost_aud: 0,
      rationale: 'Low ROI for trades and frontline roles; high signal for office and senior roles.',
    },
    {
      id: 'jora',
      method: 'api',
      estimated_cost_aud: 0,
      rationale: 'Crawls your careers microsite automatically — no extra step needed.',
    },
  ],
}

export default function Step4Distribution() {
  const { state, dispatch } = useWizard()

  useEffect(() => {
    if (!state.distribution_plan) {
      dispatch({ type: 'SET_DISTRIBUTION', plan: STUB_PLAN })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const plan = state.distribution_plan
  if (!plan) return null

  const total = plan.boards
    .filter(b => (b as any).include !== false)
    .reduce((sum, b) => sum + (b.estimated_cost_aud || 0), 0)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl sm:text-2xl font-bold text-charcoal mb-2">
          Step 4 — Where to post
        </h2>
        <p className="text-sm text-mid leading-relaxed max-w-xl">
          Toggle the boards you want to post to. We'll prefill what each board allows; you'll
          paste the body on the next screen.
        </p>
      </div>

      <div className="space-y-3">
        {plan.boards.map(b => {
          const include = (b as any).include !== false
          return (
            <div
              key={b.id}
              className="bg-white shadow-card rounded-3xl p-4 sm:p-5 flex items-start gap-4"
            >
              <div className="w-10 h-10 rounded-full bg-light flex items-center justify-center font-display text-xs font-bold text-charcoal flex-shrink-0">
                {(BOARD_LABELS[b.id] || b.id).slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h3 className="font-display text-sm font-bold text-charcoal uppercase tracking-wider">
                    {BOARD_LABELS[b.id] || b.id}
                  </h3>
                  <span className="bg-light text-mid text-[10px] font-bold uppercase tracking-wider rounded-full px-2 py-0.5">
                    {prettyMethod(b.method)}
                  </span>
                  <span className="text-xs text-mid">
                    {typeof b.estimated_cost_aud === 'number'
                      ? b.estimated_cost_aud === 0
                        ? 'Free'
                        : `~$${b.estimated_cost_aud} AUD`
                      : '—'}
                  </span>
                </div>
                <p className="text-xs text-mid leading-relaxed">{b.rationale}</p>
              </div>
              <ToggleSwitch
                checked={include}
                onChange={v => dispatch({ type: 'TOGGLE_BOARD', boardId: b.id, include: v })}
              />
            </div>
          )
        })}
      </div>

      <div className="bg-charcoal text-white rounded-3xl p-5 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider opacity-70">
            Total estimated cost
          </p>
          <p className="font-display text-2xl font-bold tabular-nums">
            ${total.toLocaleString()} <span className="text-sm font-normal opacity-70">AUD</span>
          </p>
        </div>
        <p className="text-xs opacity-70 max-w-[200px] text-right">
          Deep-link costs are billed by the boards directly under your account.
        </p>
      </div>
    </div>
  )
}

function prettyMethod(m: string) {
  if (m === 'deep_link') return 'Open & paste'
  if (m === 'internal') return 'Auto-publish'
  if (m === 'api') return 'Auto-indexed'
  if (m === 'copy_paste') return 'Copy & paste'
  return m
}

function ToggleSwitch({
  checked,
  onChange,
}: {
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`flex-shrink-0 w-12 h-7 rounded-full p-0.5 transition-colors ${
        checked ? 'bg-black' : 'bg-light'
      }`}
      aria-pressed={checked}
    >
      <span
        className={`block w-6 h-6 bg-white rounded-full shadow transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  )
}
