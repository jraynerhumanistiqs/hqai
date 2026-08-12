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
  industry: string
  state: string
  award: string
  headcount: string
  employment_types: string
  advisor_name: string
  advisor_email: string
  calendly_link: string
}

const EMPTY_FORM: SettingsForm = {
  name: '', industry: '', state: '', award: '', headcount: '',
  employment_types: '', advisor_name: '', advisor_email: '', calendly_link: '',
}

export function useSettingsForm() {
  const supabase = createClient()

  const [form, setForm] = useState<SettingsForm>(EMPTY_FORM)
  const [userName, setUserName] = useState('')
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
  const snapshotRef = useRef<string>(JSON.stringify({ form: EMPTY_FORM, userName: '' }))
  const dirty = JSON.stringify({ form, userName }) !== snapshotRef.current

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
        setUserName(nextUserName)

        const biz = profile.businesses as any
        let nextForm = EMPTY_FORM
        if (biz) {
          setBizId(biz.id)
          setPlan(biz.plan || 'free')
          setSubscriptionStatus(biz.subscription_status || 'trialing')
          setHasStripe(!!biz.stripe_customer_id)
          setLogoUrl(biz.logo_url || '')
          nextForm = {
            name: biz.name || '', industry: biz.industry || '', state: biz.state || '',
            award: biz.award || '', headcount: biz.headcount || '',
            employment_types: biz.employment_types || '', advisor_name: biz.advisor_name || '',
            advisor_email: biz.advisor_email || '', calendly_link: biz.calendly_link || '',
          }
          setForm(nextForm)
        }
        // Reset the dirty baseline to the loaded values.
        snapshotRef.current = JSON.stringify({ form: nextForm, userName: nextUserName })
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
    // SET-04 - actually check the Supabase errors instead of flipping to
    // "Saved" unconditionally.
    const [{ error: bizErr }, { error: profErr }] = await Promise.all([
      supabase.from('businesses').update(form).eq('id', bizId),
      supabase.from('profiles').update({ full_name: userName }).eq('id', userId),
    ])
    setSaving(false)
    if (bizErr || profErr) {
      setSaveError('Could not save your changes. Please try again.')
      return
    }
    snapshotRef.current = JSON.stringify({ form, userName })
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return {
    form, setForm,
    userName, setUserName,
    logoUrl, setLogoUrl,
    bizId, plan, subscriptionStatus, hasStripe,
    loading, saving, saved, saveError, dirty, save,
  }
}
