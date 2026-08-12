'use client'

import { SettingsSection } from './SettingsSection'
import { Field, inputCls } from './SettingsField'

export function ProfileSection({
  userName,
  setUserName,
}: {
  userName: string
  setUserName: (v: string) => void
}) {
  return (
    <SettingsSection id="profile" title="Your profile">
      <Field label="Your name" htmlFor="s-name">
        <input
          id="s-name"
          className={inputCls}
          value={userName}
          onChange={(e) => setUserName(e.target.value)}
          placeholder="James Smith"
        />
      </Field>
    </SettingsSection>
  )
}
