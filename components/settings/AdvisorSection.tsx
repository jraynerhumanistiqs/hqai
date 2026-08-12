'use client'

import * as React from 'react'
import { SettingsSection } from './SettingsSection'
import { Field, inputCls } from './SettingsField'
import { Button } from '@/components/ui/button'
import type { SettingsForm } from './useSettingsForm'

const ring =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg'

export function AdvisorSection({
  form,
  setForm,
  plan,
}: {
  form: SettingsForm
  setForm: React.Dispatch<React.SetStateAction<SettingsForm>>
  plan: string
}) {
  const gated = plan === 'free'
  // SET-03 - inert the whole gated group so keyboard + screen-reader users
  // cannot tab into the locked fields behind the blur. Passed as a string
  // attribute (spread) so it renders on React 18 as well as 19 and is only
  // present when actually gated (never inert="false", which would still
  // apply).
  const inertProps: Record<string, string> = gated ? { inert: '' } : {}

  return (
    <SettingsSection
      id="advisor"
      title="Advisor details"
      description="Two advisors looking after you: your AI Advisor (in the app) and your human Humanistiqs Advisor (real person, on call when things get complex)."
      className="relative"
    >
      {gated && (
        <div className="absolute inset-0 bg-bg/40 backdrop-blur-[1.5px] rounded-3xl flex items-center justify-center z-10">
          {/* SET-03 - send free users to the plan picker (checkout), not the
              billing portal they have no Stripe customer for. */}
          <Button size="lg" onClick={() => document.getElementById('billing')?.scrollIntoView({ behavior: 'smooth' })}>
            Upgrade to unlock
          </Button>
        </div>
      )}

      <div className="space-y-4" {...inertProps}>
        <Field
          label="Your AI Advisor's name (the one in HQ.ai)"
          htmlFor="s-advisor-name"
          hint="This is the name that shows up in chat. Pick something friendly."
        >
          <input
            id="s-advisor-name"
            className={inputCls}
            value={form.advisor_name}
            onChange={(e) => setForm((f) => ({ ...f, advisor_name: e.target.value }))}
            placeholder="Hugo, Sarah, anything you like"
          />
        </Field>

        <Field label="Your human Humanistiqs Advisor's email" htmlFor="s-advisor-email">
          <input
            id="s-advisor-email"
            className={inputCls}
            value={form.advisor_email}
            onChange={(e) => setForm((f) => ({ ...f, advisor_email: e.target.value }))}
            placeholder="sarah@humanistiqs.com.au"
          />
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          <div>
            <label className="block text-xs font-bold text-ink-soft mb-1.5">Book a time</label>
            <a
              href={form.calendly_link || '#'}
              target={form.calendly_link ? '_blank' : undefined}
              rel={form.calendly_link ? 'noopener noreferrer' : undefined}
              onClick={(e) => { if (!form.calendly_link) e.preventDefault() }}
              aria-disabled={!form.calendly_link}
              className={`w-full inline-flex items-center justify-center gap-2 bg-accent text-ink-on-accent font-semibold px-4 py-2.5 rounded-full text-sm transition-colors ${ring} ${form.calendly_link ? 'hover:bg-accent-hover' : 'opacity-50 cursor-not-allowed'}`}
            >
              <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
              </svg>
              Calendly booking
            </a>
          </div>
          <div>
            <label className="block text-xs font-bold text-ink-soft mb-1.5">Or call them</label>
            <a
              href={form.advisor_email ? `mailto:${form.advisor_email}?subject=HQ.ai%20advisor%20call` : '#'}
              onClick={(e) => { if (!form.advisor_email) e.preventDefault() }}
              aria-disabled={!form.advisor_email}
              className={`w-full inline-flex items-center justify-center gap-2 bg-bg-elevated border border-border text-ink font-semibold px-4 py-2.5 rounded-full text-sm transition-colors ${ring} ${form.advisor_email ? 'hover:bg-bg-soft' : 'opacity-50 cursor-not-allowed'}`}
            >
              <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
              </svg>
              Call my HQ Advisor
            </a>
          </div>
        </div>

        <Field label="Calendly booking link (URL)" htmlFor="s-calendly">
          <input
            id="s-calendly"
            className={inputCls}
            value={form.calendly_link}
            onChange={(e) => setForm((f) => ({ ...f, calendly_link: e.target.value }))}
            placeholder="https://calendly.com/your-advisor"
          />
        </Field>
      </div>
    </SettingsSection>
  )
}
