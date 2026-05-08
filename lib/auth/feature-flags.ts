import type { AppRole } from './roles'

// Feature flags. The default state for any client-tier (member) account is
// false. owner + test_admin always see everything regardless of the flag.
// Flags can be overridden by the NEXT_PUBLIC_FEATURE_FLAGS env var (comma-
// separated list of flag names that are globally on for everyone).

export type FeatureFlag =
  | 'strategy_coach'
  | 'team_development'
  | 'awards_interpreter'
  | 'compliance_audit'
  | 'compliance_assessment'
  | 'recruitment_templates'

const DEFAULT_FLAGS: Record<FeatureFlag, boolean> = {
  strategy_coach: false,
  team_development: false,
  awards_interpreter: false,
  compliance_audit: false,
  compliance_assessment: false,
  recruitment_templates: true,
}

function envOverrides(): Set<FeatureFlag> {
  const raw = process.env.NEXT_PUBLIC_FEATURE_FLAGS ?? ''
  return new Set(raw.split(',').map(s => s.trim()).filter(Boolean) as FeatureFlag[])
}

export function isEnabled(flag: FeatureFlag, role: AppRole | null): boolean {
  if (role === 'owner' || role === 'test_admin') return true
  if (envOverrides().has(flag)) return true
  return DEFAULT_FLAGS[flag] ?? false
}

// Compact map for client-side use - the layout passes this to the sidebar
// so the dropdowns render correctly without fetching per-link.
export function flagMap(role: AppRole | null): Record<FeatureFlag, boolean> {
  return Object.fromEntries(
    (Object.keys(DEFAULT_FLAGS) as FeatureFlag[]).map(f => [f, isEnabled(f, role)]),
  ) as Record<FeatureFlag, boolean>
}
