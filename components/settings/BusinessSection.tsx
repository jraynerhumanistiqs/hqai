'use client'

import * as React from 'react'
import { SettingsSection } from './SettingsSection'
import { Field, inputCls, selectCls } from './SettingsField'
import type { SettingsForm } from './useSettingsForm'

const INDUSTRIES = ['Retail', 'Hospitality & Food Service', 'Healthcare & Aged Care', 'Pharmacy', 'Construction & Trades', 'Professional Services', 'Education & Childcare', 'Community Services & NFP', 'Technology', 'Other']
const AWARDS = ['General Retail Industry Award', 'Hospitality Industry (General) Award', 'Restaurant Industry Award', 'Pharmacy Industry Award 2020', 'Aged Care Award', 'SCHADS Award', 'Nurses Award', 'Building & Construction Award', 'Clerks Private Sector Award', 'Professional Employees Award', 'Award-free / Enterprise Agreement', 'Multiple awards apply', 'Not sure']
const STATES = ['QLD', 'NSW', 'VIC', 'SA', 'WA', 'TAS', 'ACT', 'NT']
const HEADCOUNTS = ['1-10', '11-30', '31-80', '81-150', '151-250']

export function BusinessSection({
  form,
  setForm,
}: {
  form: SettingsForm
  setForm: React.Dispatch<React.SetStateAction<SettingsForm>>
}) {
  const set = (k: keyof SettingsForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  return (
    <SettingsSection
      id="business"
      title="Business details"
      description="These details are used to fill employer information on the documents HQ generates - contracts, letters and offers."
    >
      <div className="space-y-4">
        <Field label="Business name (trading name)" htmlFor="s-biz-name">
          <input id="s-biz-name" className={inputCls} value={form.name} onChange={set('name')} placeholder="My Business" />
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Legal entity name" htmlFor="s-legal-name" hint="The registered name on contracts, if different.">
            <input id="s-legal-name" className={inputCls} value={form.legal_name} onChange={set('legal_name')} placeholder="My Business Pty Ltd" />
          </Field>
          <Field label="ABN" htmlFor="s-abn" hint="Shown on generated employment documents.">
            <input id="s-abn" className={inputCls} value={form.abn} onChange={set('abn')} placeholder="12 345 678 901" inputMode="numeric" />
          </Field>
        </div>

        <Field label="Industry" htmlFor="s-industry">
          <select id="s-industry" className={selectCls} value={form.industry} onChange={set('industry')}>
            <option value="">Select industry</option>
            {INDUSTRIES.map((i) => <option key={i}>{i}</option>)}
          </select>
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="State / Territory" htmlFor="s-state">
            <select id="s-state" className={selectCls} value={form.state} onChange={set('state')}>
              <option value="">Select state</option>
              {STATES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Headcount" htmlFor="s-headcount">
            <select id="s-headcount" className={selectCls} value={form.headcount} onChange={set('headcount')}>
              <option value="">Select headcount</option>
              {HEADCOUNTS.map((s) => <option key={s}>{s}</option>)}
            </select>
          </Field>
        </div>

        <Field label="Business address" htmlFor="s-address" hint="Used as the employer address on letters and contracts.">
          <input id="s-address" className={inputCls} value={form.address} onChange={set('address')} placeholder="123 Example St, Brisbane QLD 4000" />
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Website" htmlFor="s-website">
            <input id="s-website" className={inputCls} value={form.website} onChange={set('website')} placeholder="www.mybusiness.com.au" inputMode="url" />
          </Field>
          <Field label="Phone" htmlFor="s-phone">
            <input id="s-phone" className={inputCls} value={form.phone} onChange={set('phone')} placeholder="07 1234 5678" inputMode="tel" />
          </Field>
        </div>

        <Field label="Employment types you use" htmlFor="s-emp-types" hint="e.g. Full-time, Part-time, Casual - helps tailor HR advice and documents.">
          <input id="s-emp-types" className={inputCls} value={form.employment_types} onChange={set('employment_types')} placeholder="Full-time, Part-time, Casual" />
        </Field>

        <Field label="Primary Modern Award" htmlFor="s-award">
          <select id="s-award" className={selectCls} value={form.award} onChange={set('award')}>
            <option value="">Select or skip</option>
            {AWARDS.map((a) => <option key={a}>{a}</option>)}
          </select>
        </Field>
      </div>
    </SettingsSection>
  )
}
