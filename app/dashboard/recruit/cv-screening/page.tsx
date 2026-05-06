import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CvScreeningClient from '@/components/recruit/cv-screening/CvScreeningClient'
import type { CandidateScreening } from '@/lib/cv-screening-types'

export const dynamic = 'force-dynamic'

export default async function Page() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('businesses(id, name)')
    .eq('id', user.id)
    .single()
  const business = profile?.businesses as unknown as { id: string; name: string } | null

  let recent: CandidateScreening[] = []
  if (business?.id) {
    const { data } = await supabase
      .from('cv_screenings')
      .select('*')
      .eq('business_id', business.id)
      .order('created_at', { ascending: false })
      .limit(50)
    recent = (data ?? []) as CandidateScreening[]
  }

  return (
    <CvScreeningClient
      businessName={business?.name ?? 'your business'}
      initialScreenings={recent}
    />
  )
}
