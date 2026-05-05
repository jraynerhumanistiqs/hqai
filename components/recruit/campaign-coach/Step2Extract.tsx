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

// Alphabetised by name. AWARD_FREE pinned to the bottom so users see all real
// awards first when scanning. Source URLs use FWO's library (library.fairwork
// .gov.au/award/?krn=...) which lands directly on the award page, unlike the
// FWC search-results redirect which often shows a 404-like search interstitial.
const COMMON_AWARDS = [
  { code: 'MA000018', name: 'Aged Care Award' },
  { code: 'MA000118', name: 'Animal Care and Veterinary Services Award' },
  { code: 'MA000079', name: 'Architects Award' },
  { code: 'MA000019', name: 'Banking, Finance and Insurance Award' },
  { code: 'MA000020', name: 'Building and Construction General On-site Award' },
  { code: 'MA000120', name: "Children's Services Award" },
  { code: 'MA000022', name: 'Cleaning Services Award' },
  { code: 'MA000002', name: 'Clerks - Private Sector Award' },
  { code: 'MA000076', name: 'Educational Services (Schools) General Staff Award' },
  { code: 'MA000077', name: 'Educational Services (Teachers) Award' },
  { code: 'MA000025', name: 'Electrical, Electronic and Communications Contracting Award' },
  { code: 'MA000003', name: 'Fast Food Industry Award' },
  { code: 'MA000004', name: 'General Retail Industry Award' },
  { code: 'MA000005', name: 'Hair and Beauty Industry Award' },
  { code: 'MA000027', name: 'Health Professionals and Support Services Award' },
  { code: 'MA000009', name: 'Hospitality Industry (General) Award' },
  { code: 'MA000116', name: 'Legal Services Award' },
  { code: 'MA000010', name: 'Manufacturing and Associated Industries and Occupations Award' },
  { code: 'MA000093', name: 'Marine Tourism and Charter Vessels Award' },
  { code: 'MA000031', name: 'Medical Practitioners Award' },
  { code: 'MA000104', name: 'Miscellaneous Award' },
  { code: 'MA000034', name: 'Nurses Award' },
  { code: 'MA000012', name: 'Pharmacy Industry Award' },
  { code: 'MA000036', name: 'Plumbing and Fire Sprinklers Award' },
  { code: 'MA000119', name: 'Restaurant Industry Award' },
  { code: 'MA000038', name: 'Road Transport and Distribution Award' },
  { code: 'MA000016', name: 'Security Services Industry Award' },
  { code: 'MA000100', name: 'Social, Community, Home Care and Disability Services Industry Award' },
  { code: 'MA000043', name: 'Waste Management Award' },
  { code: 'AWARD_FREE', name: 'Award-free / Enterprise agreement' },
]

// Standard NES full-time week (38 hrs). Hourly = weekly / 38.
const FT_WEEKLY_HOURS = 38
const fwoAwardUrl = (code: string) =>
  code === 'AWARD_FREE'
    ? 'https://www.fairwork.gov.au/employment-conditions/awards'
    : `https://library.fairwork.gov.au/award/?krn=${code}`

export default function Step2Extract() {
  const { state, dispatch } = useWizard()
  const profile = state.role_profile
  const [showAwardDrawer, setShowAwardDrawer] = useState(false)
  const [editingAward, setEditingAward] = useState(false)

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

      <div className="bg-white shadow-card rounded-3xl p-5 sm:p-6 space-y-4">
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
          <div className="flex flex-wrap items-center gap-2">
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

        <FieldRow label="Award">
          {editingAward ? (
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={profile.award?.code || ''}
                onChange={e => {
                  const found = COMMON_AWARDS.find(a => a.code === e.target.value)
                  if (found) {
                    patch({
                      award: {
                        code: found.code,
                        name: found.name,
                        classification: profile.award?.classification || '',
                        min_weekly_rate: profile.award?.min_weekly_rate || 0,
                        source_url: fwoAwardUrl(found.code),
                        confidence: 1,
                      },
                    })
                  }
                }}
                className="bg-light text-sm text-charcoal rounded-full px-3 py-1.5 outline-none focus:bg-white focus:ring-1 focus:ring-charcoal max-w-full"
              >
                <option value="">Select an award...</option>
                {COMMON_AWARDS.map(a => (
                  <option key={a.code} value={a.code}>
                    {a.code} - {a.name}
                  </option>
                ))}
              </select>
              <InlineText
                value={profile.award?.classification || ''}
                onChange={v =>
                  patch({
                    award: profile.award
                      ? { ...profile.award, classification: v }
                      : undefined,
                  })
                }
                placeholder="Classification (e.g. Level 4)"
              />
              <button
                onClick={() => setEditingAward(false)}
                className="text-xs font-bold text-charcoal hover:underline"
              >
                Done
              </button>
            </div>
          ) : profile.award ? (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="bg-light text-charcoal text-xs font-bold rounded-full px-3 py-1.5">
                {profile.award.code} - {profile.award.classification} - $
                {(profile.award.min_weekly_rate / FT_WEEKLY_HOURS).toFixed(2)}/hr
              </span>
              <button
                onClick={() => setShowAwardDrawer(true)}
                title="View FWA citation"
                className="w-6 h-6 rounded-full bg-light hover:bg-border flex items-center justify-center text-mid text-xs font-bold"
              >
                i
              </button>
              <button
                onClick={() => setEditingAward(true)}
                className="text-xs font-bold text-mid hover:text-charcoal hover:underline"
              >
                Change award
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted">No award matched</span>
              <button
                onClick={() => setEditingAward(true)}
                className="text-xs font-bold text-mid hover:text-charcoal hover:underline"
              >
                Pick award
              </button>
            </div>
          )}
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
              Minimum hourly rate:{' '}
              <strong className="text-charcoal">
                ${(profile.award.min_weekly_rate / FT_WEEKLY_HOURS).toFixed(2)}/hr
              </strong>{' '}
              <span className="text-muted">
                (based on ${profile.award.min_weekly_rate}/wk over {FT_WEEKLY_HOURS}h)
              </span>
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
      className="bg-light text-sm text-charcoal rounded-full px-3 py-1.5 outline-none focus:bg-white focus:ring-1 focus:ring-charcoal w-full sm:w-auto"
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
      className={`bg-light text-sm text-charcoal rounded-full px-3 py-1.5 outline-none focus:bg-white focus:ring-1 focus:ring-charcoal ${width}`}
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
      className="bg-light text-sm text-charcoal rounded-full px-3 py-1.5 outline-none focus:bg-white focus:ring-1 focus:ring-charcoal"
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
