import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import WizardShell from '@/components/recruit/campaign-coach/WizardShell'
import type { CampaignBusinessContext } from '@/lib/campaign-types'

export default async function CampaignCoachPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*, businesses(*)')
    .eq('id', user.id)
    .single()

  const biz = (profile as any)?.businesses

  const business: CampaignBusinessContext = {
    id: biz?.id,
    name: biz?.name || 'My Business',
    industry: biz?.industry || '',
    state: biz?.state || '',
    award: biz?.award || '',
    size: biz?.size || '',
    about: biz?.about || '',
  }

  return <WizardShell business={business} />
}
