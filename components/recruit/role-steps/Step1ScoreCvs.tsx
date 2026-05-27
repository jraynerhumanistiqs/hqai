'use client'

// Step 1 of the role workflow stepper - CV scoring scoped to this role.
//
// This is a thin wrapper around the existing CvScreeningClient. The
// component takes the role's prescreen_session_id and business_id,
// loads the screenings + custom rubrics that belong to this role only
// (via prescreen_session_id), and forwards the scope to CvScreeningClient
// so any uploads in this surface land on the role's anchor rather than
// the standalone CV Scoring pool.
//
// The standalone /dashboard/recruit/cv-screening route keeps working
// without role context. Same component, role-aware prop drives the
// difference.

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import CvScreeningClient from '@/components/recruit/cv-screening/CvScreeningClient'
import type { CandidateScreening, Rubric } from '@/lib/cv-screening-types'

interface CustomRubricRow {
  id: string
  label: string
  label_family: string | null
  parent_rubric_id: string | null
  version_number: number | null
  rubric: Rubric
  created_at: string
}

interface Props {
  sessionId: string
  roleTitle: string
}

export function Step1ScoreCvs({ sessionId, roleTitle }: Props) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [screenings, setScreenings] = useState<CandidateScreening[]>([])
  const [customRubrics, setCustomRubrics] = useState<CustomRubricRow[]>([])
  const [businessName, setBusinessName] = useState('your business')

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      const supabase = createClient()
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('Not signed in')
        const { data: profile, error: pErr } = await supabase
          .from('profiles')
          .select('businesses(id, name)')
          .eq('id', user.id)
          .single()
        if (pErr) throw pErr
        const business = profile?.businesses as unknown as { id: string; name: string } | null
        const businessId = business?.id ?? null
        if (!businessId) throw new Error('No business profile found. Complete onboarding first.')
        if (cancelled) return
        setBusinessName(business?.name ?? 'your business')

        const [scrRes, rubRes] = await Promise.all([
          supabase
            .from('cv_screenings')
            .select('*')
            .eq('business_id', businessId)
            .eq('prescreen_session_id', sessionId)
            .order('created_at', { ascending: false })
            .limit(100),
          supabase
            .from('cv_custom_rubrics')
            .select('id, label, label_family, parent_rubric_id, version_number, rubric, created_at')
            .eq('business_id', businessId)
            .order('created_at', { ascending: false }),
        ])
        if (cancelled) return
        if (scrRes.error) throw scrRes.error
        if (rubRes.error) throw rubRes.error
        setScreenings((scrRes.data ?? []) as CandidateScreening[])
        setCustomRubrics((rubRes.data ?? []) as CustomRubricRow[])
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [sessionId])

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-12 text-center">
        <p className="text-sm text-mid">Loading CV scoring workspace for {roleTitle}...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-6">
        <div className="bg-white border border-danger/30 rounded-2xl p-5">
          <p className="text-sm font-bold text-danger">Couldn&apos;t load Step 1</p>
          <p className="text-xs text-mid mt-1">{error}</p>
          <p className="text-xs text-mid mt-3">
            If you&apos;re seeing &quot;column cv_screenings.prescreen_session_id does not exist&quot;,
            apply the <code>cv_screenings_link_prescreen.sql</code> migration in Supabase.
          </p>
        </div>
      </div>
    )
  }

  return (
    <CvScreeningClient
      businessName={businessName}
      initialScreenings={screenings}
      initialCustomRubrics={customRubrics}
      prescreenSessionId={sessionId}
      roleContextLabel={roleTitle}
    />
  )
}
