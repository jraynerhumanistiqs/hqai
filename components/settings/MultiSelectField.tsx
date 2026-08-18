'use client'

// Multi-select chip field. A row of toggle chips - click to add/remove.
// Value + onChange work in string[] terms; the parent converts to/from the
// comma-joined column value.

import { Field } from './SettingsField'

const ring = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40'

export function MultiSelectField({
  label,
  options,
  value,
  onChange,
  required,
  optional,
  hint,
}: {
  label: string
  options: readonly string[]
  value: string[]
  onChange: (v: string[]) => void
  required?: boolean
  optional?: boolean
  hint?: React.ReactNode
}) {
  const toggle = (opt: string) => {
    onChange(value.includes(opt) ? value.filter(v => v !== opt) : [...value, opt])
  }

  return (
    <Field label={label} required={required} optional={optional} hint={hint}>
      <div className="flex flex-wrap gap-2" role="group" aria-label={label}>
        {options.map(opt => {
          const selected = value.includes(opt)
          return (
            <button
              key={opt}
              type="button"
              aria-pressed={selected}
              onClick={() => toggle(opt)}
              className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${ring} ${
                selected
                  ? 'bg-ink text-bg-elevated border-ink font-medium'
                  : 'bg-bg-soft text-ink-soft border-border hover:text-ink hover:border-ink/30'
              }`}
            >
              {opt}
            </button>
          )
        })}
      </div>
    </Field>
  )
}
