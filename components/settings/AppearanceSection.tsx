'use client'

// Personal appearance settings. Surfaces the light/dark toggle inside
// Settings (where users expect it) in addition to the sidebar control. The
// theme choice is per-device (next-themes, storageKey "hqai-theme"), so it
// lives under "Your account", not the workspace.

import { SettingsSection } from './SettingsSection'
import ThemeToggle from '@/components/theme/ThemeToggle'

export function AppearanceSection() {
  return (
    <SettingsSection id="appearance" title="Appearance" description="Choose how HQ.ai looks on this device.">
      <div className="rounded-xl border border-border bg-bg-soft p-1 max-w-xs">
        <ThemeToggle variant="row" />
      </div>
      <p className="text-[11px] text-ink-muted mt-2">Saved to this browser. Other devices keep their own choice.</p>
    </SettingsSection>
  )
}

export default AppearanceSection
