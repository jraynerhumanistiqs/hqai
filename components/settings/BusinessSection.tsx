'use client'

import * as React from 'react'
import { SettingsSection } from './SettingsSection'
import { Field, inputCls, selectCls } from './SettingsField'
import { MultiSelectField } from './MultiSelectField'
import { AwardsEditor } from './AwardsEditor'
import { INDUSTRIES, STATES, HEADCOUNTS, EMPLOYMENT_TYPES, splitCsv, joinCsv, type AwardEntry } from './options'
import type { SettingsForm } from './useSettingsForm'

export function BusinessSection({
  form,
  setForm,
}: {
  form: SettingsForm
  setForm: React.Dispatch<React.SetStateAction<SettingsForm>>
}) {
  const setText = (k: keyof SettingsForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  const operatingStates = splitCsv(form.operating_states)

  const setOperatingStates = (arr: string[]) =>
    setForm((f) => ({
      ...f,
      operating_states: joinCsv(arr),
      // Keep the HQ within the selected states.
      state: arr.includes(f.state) ? f.state : (arr[0] || ''),
    }))

  return (
    <SettingsSection
      id="business"
      title="Business details"
      description="These details fill employer information on the documents HQ generates - contracts, letters and offers - and tailor its advice. Starred fields are required."
    >
      <div className="space-y-4">
        <Field label="Business name (trading name)" htmlFor="s-biz-name" required>
          <input id="s-biz-name" className={inputCls} value={form.name} onChange={setText('name')} placeholder="My Business" />
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Legal entity name" htmlFor="s-legal-name" optional hint="The registered name on contracts, if different.">
            <input id="s-legal-name" className={inputCls} value={form.legal_name} onChange={setText('legal_name')} placeholder="My Business Pty Ltd" />
          </Field>
          <Field label="ABN" htmlFor="s-abn" optional hint="Shown on generated employment documents.">
            <input id="s-abn" className={inputCls} value={form.abn} onChange={setText('abn')} placeholder="12 345 678 901" inputMode="numeric" />
          </Field>
        </div>

        <Field label="Industry" htmlFor="s-industry" required>
          <select id="s-industry" className={selectCls} value={form.industry} onChange={setText('industry')}>
            <option value="">Select industry</option>
            {INDUSTRIES.map((i) => <option key={i}>{i}</option>)}
          </select>
        </Field>

        <MultiSelectField
          label="States you operate in"
          options={STATES}
          value={operatingStates}
          onChange={setOperatingStates}
          required
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Headquarters" htmlFor="s-hq" required hint="Which state is your head office in?">
            <select id="s-hq" className={selectCls} value={form.state} onChange={setText('state')} disabled={operatingStates.length === 0}>
              <option value="">{operatingStates.length ? 'Select HQ state' : 'Pick your states first'}</option>
              {operatingStates.map((s) => <option key={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Headcount" htmlFor="s-headcount" required hint="15+ means you're no longer a small business under the Fair Work Act.">
            <select id="s-headcount" className={selectCls} value={form.headcount} onChange={setText('headcount')}>
              <option value="">Select headcount</option>
              {HEADCOUNTS.map((s) => <option key={s}>{s}</option>)}
            </select>
          </Field>
        </div>

        <Field label="Business address" htmlFor="s-address" optional hint="Used as the employer address on letters and contracts.">
          <input id="s-address" className={inputCls} value={form.address} onChange={setText('address')} placeholder="123 Example St, Brisbane QLD 4000" />
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Website" htmlFor="s-website" optional>
            <input id="s-website" className={inputCls} value={form.website} onChange={setText('website')} placeholder="www.mybusiness.com.au" inputMode="url" />
          </Field>
          <Field label="Phone" htmlFor="s-phone" optional>
            <input id="s-phone" className={inputCls} value={form.phone} onChange={setText('phone')} placeholder="07 1234 5678" inputMode="tel" />
          </Field>
        </div>

        <MultiSelectField
          label="Employment types you use"
          options={EMPLOYMENT_TYPES}
          value={splitCsv(form.employment_types)}
          onChange={(arr) => setForm((f) => ({ ...f, employment_types: joinCsv(arr) }))}
          required
          hint="Helps HQ tailor advice and documents to how you employ."
        />

        <AwardsEditor
          value={form.awards}
          onChange={(awards: AwardEntry[]) => setForm((f) => ({ ...f, awards }))}
          required
        />
      </div>
    </SettingsSection>
  )
}
