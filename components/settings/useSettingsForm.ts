'use client'

// Shared Settings form state - profile + business + AI advisor, the async
// load, the honest self-healing save, dirty tracking and required-field
// validation. Section components stay dumb and presentational. Billing
// (checkout / portal) is self-contained in BillingSection.

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { splitCsv, type AwardEntry } from './options'

export interface SettingsForm {
  name: string
  legal_name: string
  abn: string
  address: string
  website: string
  phone: string
  industry: string
  state: string            // headquarters
  operating_states: string // comma-joined list of all states
  awards: AwardEntry[]     // structured Modern Awards (primary/secondary + roles)
  headcount: string
  employment_types: string // comma-joined
  advisor_name: string
  advisor_tone: string
  advisor_detail: string
  advisor_instructions: string
}

const EMPTY_FORM: SettingsForm = {
  name: '', legal_name: '', abn: '', address: '', website: '', phone: '',
  industry: '', state: '', operating_states: '', awards: [],
  headcount: '', employment_types: '',
  advisor_name: '', advisor_tone: '', advisor_detail: '', advisor_instructions: '',
}

// Columns added by add_settings_depth_fields.sql + add_settings_v2_fields.sql.
// If the live DB hasn't had them applied, updating them fails the whole row,
// so the save retries without them (core fields still save; the new fields
// light up once the migrations land - self-healing).
const DEPTH_BIZ_COLS = [
  'legal_name', 'abn', 'address', 'website', 'phone',
  'operating_states', 'awards', 'advisor_tone', 'advisor_detail', 'advisor_instructions',
] as const

export function useSettingsForm() {
  const supabase = createClient()

  const [form, setForm] = useState<SettingsForm>(EMPTY_FORM)
  const [userName, setUserName] = useState('')
  const [jobTitle, setJobTitle] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [bizId, setBizId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [plan, setPlan] = useState('free')
  const [subscriptionStatus, setSubscriptionStatus] = useState('trialing')
  const [hasStripe, setHasStripe] = useState(false)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState('')

  const snapshotRef = useRef<string>(JSON.stringify({ form: EMPTY_FORM, userName: '', jobTitle: '' }))
  const dirty = JSON.stringify({ form, userName, jobTitle }) !== snapshotRef.current

  // Required fields (mandatory helps HQ tailor advice + documents). Optional:
  // legal_name, abn, address, website, phone, job_title, advisor prefs.
  const missingRequired: string[] = []
  if (!userName.trim()) missingRequired.push('Your name')
  if (!form.name.trim()) missingRequired.push('Business name')
  if (!form.industry) missingRequired.push('Industry')
  if (!form.state) missingRequired.push('Headquarters')
  if (!splitCsv(form.operating_states).length) missingRequired.push('Operating states')
  if (!form.headcount) missingRequired.push('Headcount')
  if (!splitCsv(form.employment_types).length) missingRequired.push('Employment types')
  if (!form.awards.length) missingRequired.push('Modern Awards')

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user || cancelled) return
        setUserId(user.id)
        const { data: profile } = await supabase
          .from('profiles').select('*, businesses(*)').eq('id', user.id).single()
        if (!profile || cancelled) return

        const nextUserName = profile.full_name || ''
        const nextJobTitle = (profile as any).job_title || ''
        setUserName(nextUserName)
        setJobTitle(nextJobTitle)
        setUserEmail((profile as any).email || user.email || '')

        const biz = profile.businesses as any
        let nextForm = EMPTY_FORM
        if (biz) {
          setBizId(biz.id)
          setPlan(biz.plan || 'free')
          setSubscriptionStatus(biz.subscription_status || 'trialing')
          setHasStripe(!!biz.stripe_customer_id)
          setLogoUrl(biz.logo_url || '')

          // awards: prefer the structured jsonb; fall back to the legacy single
          // `award` text so existing businesses are not blanked.
          let awards: AwardEntry[] = Array.isArray(biz.awards) ? biz.awards : []
          if (awards.length === 0 && biz.award && biz.award !== 'Multiple awards apply') {
            awards = [{ name: biz.award, tier: 'primary', roles: '' }]
          }
          // operating states: fall back to the HQ state so it is never empty.
          const operatingStates = biz.operating_states || biz.state || ''

          nextForm = {
            name: biz.name || '', legal_name: biz.legal_name || '', abn: biz.abn || '',
            address: biz.address || '', website: biz.website || '', phone: biz.phone || '',
            industry: biz.industry || '', state: biz.state || '', operating_states: operatingStates,
            awards, headcount: biz.headcount || '', employment_types: biz.employment_types || '',
            advisor_name: biz.advisor_name || '', advisor_tone: biz.advisor_tone || '',
            advisor_detail: biz.advisor_detail || '', advisor_instructions: biz.advisor_instructions || '',
          }
          setForm(nextForm)
        }
        snapshotRef.current = JSON.stringify({ form: nextForm, userName: nextUserName, jobTitle: nextJobTitle })
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!dirty) return
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [dirty])

  async function save() {
    if (!bizId || !userId) return
    if (missingRequired.length) {
      setSaveError(`Please complete the required fields: ${missingRequired.join(', ')}.`)
      return
    }
    setSaving(true)
    setSaveError('')

    // Derive the legacy primary-award text column from the structured awards,
    // so document generation + chat (which read businesses.award) keep working.
    const primaryAward = form.awards.find(a => a.tier === 'primary')?.name || form.awards[0]?.name || ''
    const bizUpdate: Record<string, unknown> = { ...form, award: primaryAward }

    let bizErr = (await supabase.from('businesses').update(bizUpdate).eq('id', bizId)).error
    if (bizErr) {
      const core = { ...bizUpdate }
      for (const c of DEPTH_BIZ_COLS) delete core[c]
      bizErr = (await supabase.from('businesses').update(core).eq('id', bizId)).error
    }

    let profErr = (await supabase.from('profiles').update({ full_name: userName, job_title: jobTitle }).eq('id', userId)).error
    if (profErr) {
      profErr = (await supabase.from('profiles').update({ full_name: userName }).eq('id', userId)).error
    }

    setSaving(false)
    if (bizErr || profErr) {
      setSaveError('Could not save your changes. Please try again.')
      return
    }
    snapshotRef.current = JSON.stringify({ form, userName, jobTitle })
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return {
    form, setForm,
    userName, setUserName,
    jobTitle, setJobTitle,
    userEmail,
    logoUrl, setLogoUrl,
    bizId, plan, subscriptionStatus, hasStripe,
    loading, saving, saved, saveError, dirty, missingRequired, save,
  }
}
