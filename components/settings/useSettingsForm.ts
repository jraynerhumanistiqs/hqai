'use client'

// SET-08 / SET-04 / SET-05 - shared Settings form state.
//
// Lifts the profile + business + advisor form, the async load, the honest
// save (error-checked, dirty-tracked) and the loading flag out of the
// former 454-line page monolith so the section components can stay dumb
// and presentational. Billing (checkout / portal) is self-contained in
// BillingSection - it acts immediately and is not part of this save.

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface SettingsForm {
  name: string
  legal_name: string
  abn: string
  address: string
  website: string
  phone: string
  industry: string
  state: string
  award: string
  headcount: string
  employment_types: string
  advisor_name: string
  advisor_email: string
}

const EMPTY_FORM: SettingsForm = {
  name: '', legal_name: '', abn: '', address: '', website: '', phone: '',
  industry: '', state: '', award: '', headcount: '', employment_types: '',
  advisor_name: '', advisor_email: '',
}

// Columns added by add_settings_depth_fields.sql. If the live DB hasn't had
// that migration applied yet, updating them fails the whole row - so the
// save retries without them (core fields still save; the new fields light up
// once the migration lands, self-healing, same pattern as the dashboard).
const DEPTH_BIZ_COLS = ['legal_name', 'abn', 'address', 'website', 'phone'] as const

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

  // Baseline snapshot for dirty tracking. Set on load and after each
  // successful save; `dirty` is a live diff against it, so we do not need
  // to wire a markDirty into every onChange.
  const snapshotRef = useRef<string>(JSON.stringify({ form: EMPTY_FORM, userName: '', jobTitle: '' }))
  const dirty = JSON.stringify({ form, userName, jobTitle }) !== snapshotRef.current

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
          // Missing (un-migrated) columns simply come back undefined -> ''.
          nextForm = {
            name: biz.name || '', legal_name: biz.legal_name || '', abn: biz.abn || '',
            address: biz.address || '', website: biz.website || '', phone: biz.phone || '',
            industry: biz.industry || '', state: biz.state || '', award: biz.award || '',
            headcount: biz.headcount || '', employment_types: biz.employment_types || '',
            advisor_name: biz.advisor_name || '', advisor_email: biz.advisor_email || '',
          }
          setForm(nextForm)
        }
        // Reset the dirty baseline to the loaded values.
        snapshotRef.current = JSON.stringify({ form: nextForm, userName: nextUserName, jobTitle: nextJobTitle })
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // SET-04 - warn before a hard unload (tab close / refresh) while there
  // are unsaved edits. In-app soft navigation between sidebar items is not
  // intercepted here (App Router has no stable router-guard hook yet).
  useEffect(() => {
    if (!dirty) return
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [dirty])

  async function save() {
    if (!bizId || !userId) return
    setSaving(true)
    setSaveError('')

    // businesses - try the full row; if a depth column is un-migrated the
    // whole update fails, so retry with only the pre-migration columns.
    let bizErr = (await supabase.from('businesses').update(form).eq('id', bizId)).error
    if (bizErr) {
      const core: Record<string, unknown> = { ...form }
      for (const c of DEPTH_BIZ_COLS) delete core[c]
      bizErr = (await supabase.from('businesses').update(core).eq('id', bizId)).error
    }

    // profiles - full_name + job_title; retry without job_title if un-migrated.
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
    loading, saving, saved, saveError, dirty, save,
  }
}
