'use client'

// AI Advisor settings. Customises the in-app AI advisor only (the human
// Humanistiqs advisor is assigned, not self-set, so it no longer lives here).
// Name, tone, response detail and custom instructions are threaded into the
// chat system prompt (lib/prompts.ts) so they actually change how the advisor
// responds.

import * as React from 'react'
import { SettingsSection } from './SettingsSection'
import { Field, inputCls, selectCls } from './SettingsField'
import { ADVISOR_TONES, ADVISOR_DETAILS } from './options'
import type { SettingsForm } from './useSettingsForm'

const textareaCls =
  'w-full px-3 py-2.5 bg-bg-elevated border border-border rounded-lg text-sm text-ink placeholder-ink-muted outline-none transition-colors resize-none leading-relaxed focus-visible:border-ink focus-visible:ring-2 focus-visible:ring-accent/30'

export function AdvisorSection({
  form,
  setForm,
}: {
  form: SettingsForm
  setForm: React.Dispatch<React.SetStateAction<SettingsForm>>
}) {
  const set = (k: keyof SettingsForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  return (
    <SettingsSection
      id="advisor"
      title="AI Advisor"
      description="Customise the AI advisor you chat with. These settings change how it talks to you."
    >
      <div className="space-y-4">
        <Field
          label="Advisor name"
          htmlFor="s-advisor-name"
          optional
          hint="The name shown in chat. Pick something friendly - Hugo, Sarah, anything you like."
        >
          <input id="s-advisor-name" className={inputCls} value={form.advisor_name} onChange={set('advisor_name')} placeholder="Hugo" />
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Tone" htmlFor="s-advisor-tone" optional hint="How the advisor communicates.">
            <select id="s-advisor-tone" className={selectCls} value={form.advisor_tone} onChange={set('advisor_tone')}>
              <option value="">Balanced (default)</option>
              {ADVISOR_TONES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Response detail" htmlFor="s-advisor-detail" optional hint="How much the advisor gives you at once.">
            <select id="s-advisor-detail" className={selectCls} value={form.advisor_detail} onChange={set('advisor_detail')}>
              <option value="">Standard (default)</option>
              {ADVISOR_DETAILS.map((d) => <option key={d}>{d}</option>)}
            </select>
          </Field>
        </div>

        <Field
          label="Custom instructions"
          htmlFor="s-advisor-instructions"
          optional
          hint="Anything the advisor should always keep in mind about your business - context, preferences, house rules."
        >
          <textarea
            id="s-advisor-instructions"
            className={textareaCls}
            rows={4}
            value={form.advisor_instructions}
            onChange={set('advisor_instructions')}
            placeholder="e.g. We run three sites across QLD and NSW. Always flag state differences. We prefer plain-English summaries first, detail second."
          />
        </Field>
      </div>
    </SettingsSection>
  )
}
