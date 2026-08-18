'use client'

import { SettingsSection } from './SettingsSection'
import { Field, inputCls } from './SettingsField'

export function ProfileSection({
  userName,
  setUserName,
  jobTitle,
  setJobTitle,
  userEmail,
}: {
  userName: string
  setUserName: (v: string) => void
  jobTitle: string
  setJobTitle: (v: string) => void
  userEmail: string
}) {
  return (
    <SettingsSection id="profile" title="Your profile">
      <div className="space-y-4">
        <Field label="Your name" htmlFor="s-name">
          <input
            id="s-name"
            className={inputCls}
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            placeholder="James Smith"
          />
        </Field>

        <Field label="Job title" htmlFor="s-job-title" hint="Shown on documents you generate that need a signatory.">
          <input
            id="s-job-title"
            className={inputCls}
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
            placeholder="Director, Office Manager, HR Lead..."
          />
        </Field>

        <Field label="Email" htmlFor="s-email" hint="The email you sign in with. Contact support to change it.">
          <input
            id="s-email"
            className={`${inputCls} opacity-70 cursor-not-allowed`}
            value={userEmail}
            readOnly
            aria-readonly="true"
          />
        </Field>
      </div>
    </SettingsSection>
  )
}
