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
  return (
    <SettingsSection id="business" title="Business details">
      <div className="space-y-4">
        <Field label="Business name" htmlFor="s-biz-name">
          <input
            id="s-biz-name"
            className={inputCls}
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="My Business Pty Ltd"
          />
        </Field>
        <Field label="Industry" htmlFor="s-industry">
          <select
            id="s-industry"
            className={selectCls}
            value={form.industry}
            onChange={(e) => setForm((f) => ({ ...f, industry: e.target.value }))}
          >
            <option value="">Select industry</option>
            {INDUSTRIES.map((i) => <option key={i}>{i}</option>)}
          </select>
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="State / Territory" htmlFor="s-state">
            <select
              id="s-state"
              className={selectCls}
              value={form.state}
              onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))}
            >
              <option value="">Select state</option>
              {STATES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Headcount" htmlFor="s-headcount">
            <select
              id="s-headcount"
              className={selectCls}
              value={form.headcount}
              onChange={(e) => setForm((f) => ({ ...f, headcount: e.target.value }))}
            >
              <option value="">Select headcount</option>
              {HEADCOUNTS.map((s) => <option key={s}>{s}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Primary Modern Award" htmlFor="s-award">
          <select
            id="s-award"
            className={selectCls}
            value={form.award}
            onChange={(e) => setForm((f) => ({ ...f, award: e.target.value }))}
          >
            <option value="">Select or skip</option>
            {AWARDS.map((a) => <option key={a}>{a}</option>)}
          </select>
        </Field>
      </div>
    </SettingsSection>
  )
}
