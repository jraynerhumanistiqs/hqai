'use client'

// Scoped settings sub-nav. Replaces the SET-08 anchor/scroll-spy nav: the
// research convergent pattern is a left vertical sub-nav that shows ONE
// section at a time (not a single scrolling page), grouped by scope
// (Your account vs Workspace). This is a controlled switcher - the parent
// owns `active` and swaps the pane client-side, so the shared save-once
// form state (useSettingsForm) survives section changes.
//
// Only rooms with real content are listed. Members / Security /
// Notifications / Integrations / Consultant are in the rebuild spec but are
// deliberately NOT stubbed here until they have backing functionality.

export type SettingsSectionKey = 'profile' | 'appearance' | 'general' | 'advisor' | 'billing'

const GROUPS: Array<{ label: string; items: Array<{ id: SettingsSectionKey; label: string }> }> = [
  {
    label: 'Your account',
    items: [
      { id: 'profile', label: 'Profile' },
      { id: 'appearance', label: 'Appearance' },
    ],
  },
  {
    label: 'Workspace',
    items: [
      { id: 'general', label: 'General' },
      { id: 'advisor', label: 'AI Advisor' },
      { id: 'billing', label: 'Billing & plan' },
    ],
  },
]

export function SettingsNav({
  active,
  onSelect,
}: {
  active: SettingsSectionKey
  onSelect: (id: SettingsSectionKey) => void
}) {
  return (
    // Desktop: grouped vertical rail. Mobile: a single horizontal scroll row
    // (group headers hide) so the sub-nav never eats the screen.
    <nav aria-label="Settings" className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible scrollbar-thin -mx-1 px-1 lg:mx-0 lg:px-0">
      {GROUPS.map(g => (
        <div key={g.label} className="flex lg:flex-col gap-1 lg:mb-4">
          <p className="hidden lg:block text-[10px] font-bold uppercase tracking-[0.14em] text-ink-muted px-3 mb-1">
            {g.label}
          </p>
          {g.items.map(it => {
            const isActive = active === it.id
            return (
              <button
                key={it.id}
                type="button"
                onClick={() => onSelect(it.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`whitespace-nowrap text-left rounded-lg px-3 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 ${
                  isActive
                    ? 'bg-bg-soft text-ink font-semibold'
                    : 'text-ink-muted hover:text-ink hover:bg-bg-soft'
                }`}
              >
                {it.label}
              </button>
            )
          })}
        </div>
      ))}
    </nav>
  )
}
