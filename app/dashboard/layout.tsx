import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import MobileShell from '@/components/layout/MobileShell'
import ThemeBoundary from '@/components/theme/ThemeBoundary'
import UnpaidPlanBanner from '@/components/billing/UnpaidPlanBanner'
import { flagMap } from '@/lib/auth/feature-flags'
import type { AppRole } from '@/lib/auth/roles'

// Plan ids the public checkout route accepts - the banner CTA can only
// re-checkout one of these. Anything else (e.g. legacy 'free'/'growth')
// falls back to 'business', the plan the buyer was closest to.
const CHECKOUT_PLAN_IDS = ['solo', 'business', 'recruit']

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*, businesses(*)')
    .eq('id', user.id)
    .single()

  if (!profile?.business_id) {
    redirect('/onboarding')
  }

  const business = profile.businesses as any
  const role: AppRole = (profile.role === 'owner' || profile.role === 'test_admin') ? profile.role : 'member'

  // Unpaid = never checked out. A real Stripe subscription always sets
  // stripe_subscription_id via the webhook (its status may be trialing /
  // past_due - those are Stripe's problem, not the soft gate's). The DB
  // defaults subscription_status to 'trialing' for every business that
  // has NEVER checked out, so status alone cannot be trusted - the
  // absence of a subscription id is the real signal.
  const unpaid = !!business
    && business.subscription_status !== 'active'
    && !business.stripe_subscription_id
  const bannerPlanId = CHECKOUT_PLAN_IDS.includes(business?.plan) ? business.plan : 'business'

  const sidebarProps = {
    userName: profile.full_name || '',
    bizName: business?.name || 'My Business',
    bizLogoUrl: business?.logo_url || null,
    advisorName: business?.advisor_name || 'Hugo',
    plan: business?.plan || 'free',
    role,
    flags: flagMap(role),
  }

  return (
    // A3 - product chrome runs the Option 3 (Ink & Amber) theme via the
    // data-app="product" scope on <html>. themeMode="dashboard" defaults
    // to dark (brand consistency with the public site) with a user toggle
    // to light; next-themes inside the boundary handles the switch.
    <ThemeBoundary app="product" themeMode="dashboard">
      <MobileShell sidebarProps={sidebarProps}>
        {unpaid && <UnpaidPlanBanner planId={bannerPlanId} />}
        {children}
      </MobileShell>
    </ThemeBoundary>
  )
}
