'use client'
import { useState } from 'react'
import { useWizard } from './wizard-state'
import type { RoleProfile } from '@/lib/campaign-types'

export default function Step2Extract() {
  const { state, dispatch } = useWizard()
  const profile = state.role_profile
  const [showAwardDrawer, setShowAwardDrawer] = useState(false)

  if (!profile) {
    return (
      <div className="text-sm text-mid">
        Waiting for the coach to extract role details… If nothing happens, head back to Step 1.
      </div>
    )
  }

  const patch = (p: Partial<RoleProfile>) => dispatch({ type: 'PATCH_ROLE_PROFILE', patch: p })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl sm:text-2xl font-bold text-charcoal mb-2">
          Step 2 — Confirm the details
        </h2>
        <p className="text-sm text-mid leading-relaxed max-w-xl">
          Here's what I extracted. Tap any chip to edit. The Award classification grounds your
          minimum pay — open the info icon for the FWA citation.
        </p>
      </div>

      <div className="bg-white shadow-card rounded-3xl p-5 sm:p-6 space-y-4">
        <FieldRow label="Title">
          <InlineText value={profile.title} onChange={v => patch({ title: v })} />
        </FieldRow>
        <FieldRow label="Level">
          <InlineSelect
            value={profile.level}
            options={['entry', 'mid', 'senior', 'lead', 'manager']}
            onChange={v => patch({ level: v as RoleProfile['level'] })}
          />
        </FieldRow>
        <FieldRow label="Contract">
          <InlineSelect
            value={profile.contract_type}
            options={['permanent_ft', 'permanent_pt', 'fixed_term', 'casual', 'contract']}
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
          <span className="text-sm text-charcoal">
            {profile.location.suburb}, {profile.location.state}
            {profile.location.remote !== 'no' ? ` · ${profile.location.remote} remote` : ''}
          </span>
        </FieldRow>
        <FieldRow label="Salary">
          <span className="text-sm text-charcoal">
            ${profile.salary.min.toLocaleString()}–{profile.salary.max.toLocaleString()}{' '}
            {profile.salary.currency}
            {profile.salary.super_inclusive ? ' (incl. super)' : ' + super'}
          </span>
        </FieldRow>

        <FieldRow label="Award">
          {profile.award ? (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="bg-light text-charcoal text-xs font-bold rounded-full px-3 py-1.5">
                {profile.award.code} · {profile.award.classification} · ${profile.award.min_weekly_rate}/wk
              </span>
              <button
                onClick={() => setShowAwardDrawer(true)}
                title="View FWA citation"
                className="w-6 h-6 rounded-full bg-light hover:bg-border flex items-center justify-center text-mid text-xs font-bold"
              >
                i
              </button>
            </div>
          ) : (
            <span className="text-sm text-muted">No award matched</span>
          )}
        </FieldRow>

        <FieldRow label="Must-have skills">
          <ChipList
            items={profile.must_have_skills}
            onChange={v => patch({ must_have_skills: v })}
            placeholder="Add skill…"
          />
        </FieldRow>
        <FieldRow label="Nice-to-haves">
          <ChipList
            items={profile.nice_to_have_skills}
            onChange={v => patch({ nice_to_have_skills: v })}
            placeholder="Add skill…"
          />
        </FieldRow>
      </div>

      {showAwardDrawer && profile.award && (
        <div
          className="fixed inset-0 bg-black/40 z-40 flex justify-end"
          onClick={() => setShowAwardDrawer(false)}
        >
          <div
            className="bg-white w-full max-w-md h-full overflow-y-auto p-6 shadow-card"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-base font-bold text-charcoal uppercase tracking-wider">
                {profile.award.code}
              </h3>
              <button
                onClick={() => setShowAwardDrawer(false)}
                className="w-8 h-8 rounded-full hover:bg-light flex items-center justify-center text-mid"
              >
                ×
              </button>
            </div>
            <p className="text-sm text-charcoal font-bold mb-1">{profile.award.name}</p>
            <p className="text-sm text-mid mb-4">
              Classification: <strong className="text-charcoal">{profile.award.classification}</strong>
              <br />
              Minimum weekly rate: <strong className="text-charcoal">${profile.award.min_weekly_rate}</strong>
            </p>
            <a
              href={profile.award.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-charcoal underline underline-offset-2 break-all"
            >
              {profile.award.source_url}
            </a>
            <p className="text-xs text-muted mt-4 leading-relaxed">
              Source: Fair Work Commission. Always confirm classification with your advisor for
              ambiguous roles.
            </p>
          </div>
        </div>
      )}
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

function InlineText({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      value={value}
      onChange={e => onChange(e.target.value)}
      className="bg-light text-sm text-charcoal rounded-full px-3 py-1.5 outline-none focus:bg-white focus:ring-1 focus:ring-charcoal w-full sm:w-auto"
    />
  )
}

function InlineNumber({ value, onChange }: { value: string | number; onChange: (v: string) => void }) {
  return (
    <input
      type="number"
      value={value}
      onChange={e => onChange(e.target.value)}
      className="bg-light text-sm text-charcoal rounded-full px-3 py-1.5 outline-none focus:bg-white focus:ring-1 focus:ring-charcoal w-32"
    />
  )
}

function InlineSelect({
  value,
  options,
  onChange,
}: {
  value: string
  options: string[]
  onChange: (v: string) => void
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="bg-light text-sm text-charcoal rounded-full px-3 py-1.5 outline-none focus:bg-white focus:ring-1 focus:ring-charcoal"
    >
      {options.map(o => (
        <option key={o} value={o}>
          {o.replace(/_/g, ' ')}
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
