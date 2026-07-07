'use client'
import { useState } from 'react'
import { useWizard } from './wizard-state'
import type { RoleProfile, AU_State } from '@/lib/campaign-types'

const LEVEL_LABELS: Record<RoleProfile['level'], string> = {
  entry: 'Entry',
  mid: 'Mid',
  senior: 'Senior',
  lead: 'Lead',
  manager: 'Manager',
}

const CONTRACT_LABELS: Record<RoleProfile['contract_type'], string> = {
  permanent_ft: 'Permanent full-time',
  permanent_pt: 'Permanent part-time',
  fixed_term: 'Fixed term',
  casual: 'Casual',
  contract: 'Contract',
}

const REMOTE_LABELS: Record<'no' | 'hybrid' | 'full', string> = {
  no: 'On-site',
  hybrid: 'Hybrid',
  full: 'Fully remote',
}

const AU_STATES: AU_State[] = ['NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS', 'ACT', 'NT']

export default function Step2Extract() {
  const { state, dispatch } = useWizard()
  const profile = state.role_profile

  if (!profile) {
    return (
      <div className="text-sm text-mid">
        Waiting for the coach to extract role details. If nothing happens, head back to Step 1.
      </div>
    )
  }

  const patch = (p: Partial<RoleProfile>) => dispatch({ type: 'PATCH_ROLE_PROFILE', patch: p })
  const patchLocation = (p: Partial<RoleProfile['location']>) =>
    patch({ location: { ...profile.location, ...p } })
  const patchSalary = (p: Partial<RoleProfile['salary']>) =>
    patch({ salary: { ...profile.salary, ...p } })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl sm:text-2xl font-bold text-charcoal mb-2">
          Step 2 - Confirm the details
        </h2>
        <p className="text-sm text-mid leading-relaxed max-w-xl">
          Tap any chip to edit. Anything I got wrong, change it.
        </p>
      </div>

      <div className="bg-bg-elevated shadow-card rounded-3xl p-5 sm:p-6 space-y-4">
        <FieldRow label="Title">
          <InlineText value={profile.title} onChange={v => patch({ title: v })} />
        </FieldRow>
        <FieldRow label="Level">
          <InlineSelect
            value={profile.level}
            options={Object.entries(LEVEL_LABELS).map(([v, l]) => ({ value: v, label: l }))}
            onChange={v => patch({ level: v as RoleProfile['level'] })}
          />
        </FieldRow>
        <FieldRow label="Contract">
          <InlineSelect
            value={profile.contract_type}
            options={Object.entries(CONTRACT_LABELS).map(([v, l]) => ({ value: v, label: l }))}
            onChange={v => patch({ contract_type: v as RoleProfile['contract_type'] })}
          />
        </FieldRow>
        <FieldRow label="Hours / week">
          <InlineNumber
            value={profile.hours_per_week ?? ''}
            onChange={v => patch({ hours_per_week: v ? Number(v) : undefined })}
          />
        </FieldRow>

        <FieldRow label="Location">
          <div className="flex flex-wrap items-center gap-2">
            <InlineText
              value={profile.location.suburb}
              onChange={v => patchLocation({ suburb: v })}
              placeholder="Suburb"
            />
            <InlineSelect
              value={profile.location.state}
              options={AU_STATES.map(s => ({ value: s, label: s }))}
              onChange={v => patchLocation({ state: v as AU_State })}
            />
            <InlineSelect
              value={profile.location.remote}
              options={Object.entries(REMOTE_LABELS).map(([v, l]) => ({ value: v, label: l }))}
              onChange={v => patchLocation({ remote: v as 'no' | 'hybrid' | 'full' })}
            />
          </div>
        </FieldRow>

        <FieldRow label="Salary">
          {/* Pay basis is interchangeable for any contract type - set it to
              per year, per hour or per day so hourly contractor and casual
              rates read correctly through to the ad. */}
          <div className="flex flex-wrap items-center gap-2">
            <InlineSelect
              value={profile.salary.period ?? 'year'}
              options={[
                { value: 'year', label: 'Per year' },
                { value: 'hour', label: 'Per hour' },
                { value: 'day', label: 'Per day' },
              ]}
              onChange={v => patchSalary({ period: v as 'year' | 'hour' | 'day' })}
            />
            <span className="text-xs text-muted">Min $</span>
            <InlineNumber
              value={profile.salary.min}
              onChange={v => patchSalary({ min: Number(v) || 0 })}
              width="w-28"
            />
            <span className="text-xs text-muted">Max $</span>
            <InlineNumber
              value={profile.salary.max}
              onChange={v => patchSalary({ max: Number(v) || 0 })}
              width="w-28"
            />
            <InlineSelect
              value={profile.salary.super_inclusive ? 'incl' : 'plus'}
              options={[
                { value: 'plus', label: '+ super' },
                { value: 'incl', label: 'incl. super' },
              ]}
              onChange={v => patchSalary({ super_inclusive: v === 'incl' })}
            />
          </div>
        </FieldRow>

        <FieldRow label="Must-have skills">
          <ChipList
            items={profile.must_have_skills}
            onChange={v => patch({ must_have_skills: v })}
            placeholder="Add skill..."
          />
        </FieldRow>
        <FieldRow label="Nice-to-haves">
          <ChipList
            items={profile.nice_to_have_skills}
            onChange={v => patch({ nice_to_have_skills: v })}
            placeholder="Add skill..."
          />
        </FieldRow>
      </div>
    </div>
  )
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4 py-2 border-b border-border last:border-b-0">
      <p className="text-[11px] font-bold text-muted uppercase tracking-wider sm:w-40 flex-shrink-0 mb-1 sm:mb-0">
        {label}
      </p>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  )
}

function InlineText({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <input
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="bg-light text-sm text-charcoal rounded-full px-3 py-1.5 outline-none focus:bg-bg-elevated focus:ring-1 focus:ring-charcoal w-full sm:w-auto"
    />
  )
}

function InlineNumber({
  value,
  onChange,
  width = 'w-32',
}: {
  value: string | number
  onChange: (v: string) => void
  width?: string
}) {
  return (
    <input
      type="number"
      value={value}
      onChange={e => onChange(e.target.value)}
      className={`bg-light text-sm text-charcoal rounded-full px-3 py-1.5 outline-none focus:bg-bg-elevated focus:ring-1 focus:ring-charcoal ${width}`}
    />
  )
}

function InlineSelect({
  value,
  options,
  onChange,
}: {
  value: string
  options: { value: string; label: string }[]
  onChange: (v: string) => void
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="bg-light text-sm text-charcoal rounded-full px-3 py-1.5 outline-none focus:bg-bg-elevated focus:ring-1 focus:ring-charcoal"
    >
      {options.map(o => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}

function ChipList({
  items,
  onChange,
  placeholder,
}: {
  items: string[]
  onChange: (v: string[]) => void
  placeholder?: string
}) {
  const [draft, setDraft] = useState('')
  const add = () => {
    if (!draft.trim()) return
    onChange([...items, draft.trim()])
    setDraft('')
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((s, i) => (
        <span
          key={i}
          className="bg-light text-charcoal text-xs font-medium rounded-full pl-3 pr-1.5 py-1 inline-flex items-center gap-1.5"
        >
          {s}
          <button
            onClick={() => onChange(items.filter((_, idx) => idx !== i))}
            className="w-4 h-4 rounded-full hover:bg-border flex items-center justify-center text-mid"
            aria-label="Remove"
          >
            ×
          </button>
        </span>
      ))}
      <input
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') {
            e.preventDefault()
            add()
          }
        }}
        onBlur={add}
        placeholder={placeholder}
        className="bg-transparent border border-dashed border-border rounded-full px-3 py-1 text-xs text-charcoal placeholder-muted outline-none focus:border-charcoal min-w-[120px]"
      />
    </div>
  )
}
