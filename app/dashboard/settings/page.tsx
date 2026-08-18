'use client'

// Settings - scoped left sub-nav + single pane (rebuild slice 2).
//
// Replaces the SET-08 single-scroll page: the convergent settings pattern is
// a left vertical sub-nav grouped by scope (Your account vs Workspace) that
// shows ONE section at a time. The switch is client-side, so the shared
// save-once form (useSettingsForm) survives moving between sections and a
// single sticky SaveBar keeps saving the whole form.
//
// Sections reuse the existing components; only rooms with real content are
// listed (Members / Security / Notifications / Integrations / Consultant are
// in the rebuild spec but not stubbed until they have backing functionality).

import { useState } from 'react'
import { PageHeader } from '@/components/dashboard/PageHeader'
import { useSettingsForm } from '@/components/settings/useSettingsForm'
import { SettingsNav, type SettingsSectionKey } from '@/components/settings/SettingsNav'
import { SettingsSkeleton } from '@/components/settings/SettingsSkeleton'
import { LogoSection } from '@/components/settings/LogoSection'
import { ProfileSection } from '@/components/settings/ProfileSection'
import { BusinessSection } from '@/components/settings/BusinessSection'
import { AdvisorSection } from '@/components/settings/AdvisorSection'
import { BillingSection } from '@/components/settings/BillingSection'
import { AppearanceSection } from '@/components/settings/AppearanceSection'
import { SaveBar } from '@/components/settings/SaveBar'

// Sections that own editable form fields tied to the shared save. On these
// the SaveBar always shows; elsewhere it shows only when there are unsaved
// edits (so a change made on one pane is never stranded when you navigate).
const FORM_SECTIONS = new Set<SettingsSectionKey>(['profile', 'general', 'advisor'])

export default function SettingsPage() {
  const s = useSettingsForm()
  const [active, setActive] = useState<SettingsSectionKey>('profile')

  const showSaveBar = FORM_SECTIONS.has(active) || s.dirty

  return (
    <div className="h-full overflow-y-auto scrollbar-thin bg-bg">
      <div className="max-w-5xl mx-auto px-4 sm:px-8 pt-8 pb-24">
        {s.loading ? (
          <SettingsSkeleton />
        ) : (
          <>
            <PageHeader
              eyebrow="Settings"
              title="Your HQ.ai workspace."
              subtitle="Update your business profile, advisor handoff details and billing plan."
            />

            <div className="lg:grid lg:grid-cols-[200px_minmax(0,1fr)] lg:gap-10">
              <aside className="mb-4 lg:mb-0">
                <div className="lg:sticky lg:top-8">
                  <SettingsNav active={active} onSelect={setActive} />
                </div>
              </aside>

              <div className="w-full max-w-2xl">
                {active === 'profile' && (
                  <ProfileSection userName={s.userName} setUserName={s.setUserName} />
                )}
                {active === 'appearance' && <AppearanceSection />}
                {active === 'general' && (
                  <>
                    <LogoSection bizId={s.bizId} logoUrl={s.logoUrl} setLogoUrl={s.setLogoUrl} />
                    <BusinessSection form={s.form} setForm={s.setForm} />
                  </>
                )}
                {active === 'advisor' && (
                  <AdvisorSection form={s.form} setForm={s.setForm} plan={s.plan} />
                )}
                {active === 'billing' && (
                  <BillingSection plan={s.plan} subscriptionStatus={s.subscriptionStatus} hasStripe={s.hasStripe} />
                )}

                {showSaveBar && (
                  <SaveBar
                    saving={s.saving}
                    saved={s.saved}
                    dirty={s.dirty}
                    saveError={s.saveError}
                    onSave={s.save}
                  />
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
