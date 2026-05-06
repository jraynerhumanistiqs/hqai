import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CvScreeningClient from '@/components/recruit/cv-screening/CvScreeningClient'
import type { CandidateScreening, Rubric } from '@/lib/cv-screening-types'

export const dynamic = 'force-dynamic'

interface CustomRubricRow {
  id: string
  label: string
  rubric: Rubric
  created_at: string
}

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
  let customRubrics: CustomRubricRow[] = []
  if (business?.id) {
    const [{ data: screenings }, { data: rubrics }] = await Promise.all([
      supabase
        .from('cv_screenings')
        .select('*')
        .eq('business_id', business.id)
        .order('created_at', { ascending: false })
        .limit(50),
      supabase
        .from('cv_custom_rubrics')
        .select('id, label, rubric, created_at')
        .eq('business_id', business.id)
        .order('created_at', { ascending: false }),
    ])
    recent = (screenings ?? []) as CandidateScreening[]
    customRubrics = (rubrics ?? []) as CustomRubricRow[]
  }

  return (
    <CvScreeningClient
      businessName={business?.name ?? 'your business'}
      initialScreenings={recent}
      initialCustomRubrics={customRubrics}
    />
  )
}
