import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import MobileShell from '@/components/layout/MobileShell'
import ThemeBoundary from '@/components/theme/ThemeBoundary'
import { flagMap } from '@/lib/auth/feature-flags'
import type { AppRole } from '@/lib/auth/roles'

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
    // data-app="product" scope on <html>. next-themes inside the
    // boundary handles light/dark within product.
    <ThemeBoundary app="product">
      <MobileShell sidebarProps={sidebarProps}>
        {children}
      </MobileShell>
    </ThemeBoundary>
  )
}
