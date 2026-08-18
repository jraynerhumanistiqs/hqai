'use client'

// Structured Modern Awards editor. A business often sits across several awards
// (e.g. Clerks for office staff, an industry award for site staff), so this is
// multi-select with per-award structure: one Primary award, the rest
// Secondary, and an optional note of which roles each award covers. That
// mapping helps HQ tailor advice and documents to the right classification.

import { Field, inputCls, selectCls } from './SettingsField'
import { AWARDS, type AwardEntry } from './options'

const ring = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40'

export function AwardsEditor({
  value,
  onChange,
  required,
}: {
  value: AwardEntry[]
  onChange: (v: AwardEntry[]) => void
  required?: boolean
}) {
  const chosen = new Set(value.map(a => a.name))
  const available = AWARDS.filter(a => !chosen.has(a))

  function add(name: string) {
    if (!name || chosen.has(name)) return
    // First award added becomes Primary automatically.
    const tier: AwardEntry['tier'] = value.length === 0 ? 'primary' : 'secondary'
    onChange([...value, { name, tier, roles: '' }])
  }

  function remove(name: string) {
    let next = value.filter(a => a.name !== name)
    // If we removed the Primary, promote the first remaining award.
    if (!next.some(a => a.tier === 'primary') && next.length > 0) {
      next = next.map((a, i) => (i === 0 ? { ...a, tier: 'primary' } : a))
    }
    onChange(next)
  }

  function setPrimary(name: string) {
    onChange(value.map(a => ({ ...a, tier: a.name === name ? 'primary' : 'secondary' })))
  }

  function setRoles(name: string, roles: string) {
    onChange(value.map(a => (a.name === name ? { ...a, roles } : a)))
  }

  return (
    <Field
      label="Modern Awards"
      required={required}
      hint="Add every award that applies. Mark one Primary, and note which roles each award covers."
    >
      <div className="space-y-3">
        {value.length > 0 && (
          <div className="space-y-2">
            {value.map(entry => (
              <div key={entry.name} className="rounded-2xl border border-border bg-bg-soft p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-bold text-ink leading-snug flex-1">{entry.name}</p>
                  <button
                    type="button"
                    onClick={() => remove(entry.name)}
                    aria-label={`Remove ${entry.name}`}
                    className={`text-ink-muted hover:text-danger rounded-full px-1 ${ring}`}
                  >
                    ✕
                  </button>
                </div>

                <div className="mt-2 flex items-center gap-1 bg-bg-elevated border border-border rounded-full p-0.5 w-fit">
                  {(['primary', 'secondary'] as const).map(t => (
                    <button
                      key={t}
                      type="button"
                      aria-pressed={entry.tier === t}
                      onClick={() => t === 'primary' ? setPrimary(entry.name) : onChange(value.map(a => a.name === entry.name ? { ...a, tier: 'secondary' } : a))}
                      className={`text-[11px] font-bold capitalize px-3 py-1 rounded-full transition-colors ${ring} ${
                        entry.tier === t ? 'bg-ink text-bg-elevated' : 'text-ink-soft hover:text-ink'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>

                <input
                  className={`${inputCls} mt-2`}
                  value={entry.roles}
                  onChange={e => setRoles(entry.name, e.target.value)}
                  placeholder="Roles covered (e.g. Office admin, reception)"
                  aria-label={`Roles covered by ${entry.name}`}
                />
              </div>
            ))}
          </div>
        )}

        {available.length > 0 && (
          <select
            className={selectCls}
            value=""
            onChange={e => { add(e.target.value); e.target.value = '' }}
            aria-label="Add an award"
          >
            <option value="">{value.length === 0 ? 'Select an award...' : 'Add another award...'}</option>
            {available.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        )}
      </div>
    </Field>
  )
}
