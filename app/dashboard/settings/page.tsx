'use client'

// SET-08 - Settings is now a thin orchestrator over components/settings/*.
// The former 454-line monolith (form state, logo upload, Stripe checkout,
// portal, plan picker, upgrade modal in one file) has been split into a
// shared useSettingsForm() hook plus one component per section, with a
// section anchor-nav and a persistent save bar.
//
// Tickets landed here: SET-08 (componentise + anchor nav), SET-03 (paywall
// inert + correct CTA, in AdvisorSection), SET-04 (honest save + dirty +
// sticky bar, in useSettingsForm + SaveBar), SET-05 (loading skeleton),
// DASH-06 (shared PageHeader + Title-case section headings), DASH-02
// (focus rings + Button primitive throughout the section components).

import { PageHeader } from '@/components/dashboard/PageHeader'
import { useSettingsForm } from '@/components/settings/useSettingsForm'
import { SettingsNav } from '@/components/settings/SettingsNav'
import { SettingsSkeleton } from '@/components/settings/SettingsSkeleton'
import { LogoSection } from '@/components/settings/LogoSection'
import { ProfileSection } from '@/components/settings/ProfileSection'
import { BusinessSection } from '@/components/settings/BusinessSection'
import { AdvisorSection } from '@/components/settings/AdvisorSection'
import { BillingSection } from '@/components/settings/BillingSection'
import { SaveBar } from '@/components/settings/SaveBar'

export default function SettingsPage() {
  const s = useSettingsForm()

  return (
    <div className="h-full overflow-y-auto scrollbar-thin bg-bg">
      {/* pb generous so the sticky SaveBar rests clear of the last section
          (Billing) instead of hovering over its lower edge. */}
      <div className="max-w-5xl mx-auto px-4 sm:px-8 pt-8 pb-24">
        {s.loading ? (
          <SettingsSkeleton />
        ) : (
          <div className="lg:grid lg:grid-cols-[180px_minmax(0,1fr)] lg:gap-10">
            <aside className="hidden lg:block">
              <div className="sticky top-8">
                <SettingsNav />
              </div>
            </aside>

            <div className="w-full max-w-2xl mx-auto lg:mx-0">
              <PageHeader
                eyebrow="Settings"
                title="Your HQ.ai workspace."
                subtitle="Update your business profile, advisor handoff details and billing plan."
              />

              <LogoSection bizId={s.bizId} logoUrl={s.logoUrl} setLogoUrl={s.setLogoUrl} />
              <ProfileSection userName={s.userName} setUserName={s.setUserName} />
              <BusinessSection form={s.form} setForm={s.setForm} />
              <AdvisorSection form={s.form} setForm={s.setForm} plan={s.plan} />
              <BillingSection plan={s.plan} subscriptionStatus={s.subscriptionStatus} hasStripe={s.hasStripe} />

              <SaveBar
                saving={s.saving}
                saved={s.saved}
                dirty={s.dirty}
                saveError={s.saveError}
                onSave={s.save}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
