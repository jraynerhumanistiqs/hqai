'use client'

import { useState } from 'react'
import { SettingsSection } from './SettingsSection'

// Logo upload is self-contained: /api/upload-logo persists logo_url on the
// business row server-side, so it is independent of the profile/business
// save form (and not part of the dirty state).
export function LogoSection({
  bizId,
  logoUrl,
  setLogoUrl,
}: {
  bizId: string | null
  logoUrl: string
  setLogoUrl: (v: string) => void
}) {
  const [logoUploading, setLogoUploading] = useState(false)
  const [logoError, setLogoError] = useState('')

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !bizId) return
    if (file.size > 2 * 1024 * 1024) { setLogoError('File must be under 2MB'); return }
    setLogoUploading(true)
    setLogoError('')
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/upload-logo', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) {
        setLogoError(data.error || 'Upload failed')
        setLogoUploading(false)
        return
      }
      setLogoUrl(data.url)
    } catch (err: any) {
      setLogoError(`Upload failed: ${err?.message || 'Unknown error'}`)
    }
    setLogoUploading(false)
  }

  return (
    <SettingsSection id="logo" title="Company logo">
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 bg-bg-soft border-2 border-dashed border-border rounded-xl flex items-center justify-center overflow-hidden">
          {logoUrl ? (
            <img src={logoUrl} alt="Company logo" className="w-full h-full object-contain rounded-xl" />
          ) : (
            <svg className="w-6 h-6 text-ink-muted" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
            </svg>
          )}
        </div>
        <div>
          {/* File input is sr-only (not display:none) so it stays keyboard
              focusable; focus-within rings the visible label. */}
          <label
            className={`inline-flex items-center cursor-pointer bg-bg-elevated border border-border rounded-full px-4 py-2 text-sm font-bold text-ink hover:bg-bg-soft transition-colors focus-within:outline-none focus-within:ring-2 focus-within:ring-accent/30 ${logoUploading ? 'opacity-50 pointer-events-none' : ''}`}
          >
            {logoUploading ? 'Uploading...' : 'Upload logo'}
            <input type="file" accept="image/*" className="sr-only" onChange={handleLogoUpload} disabled={logoUploading} />
          </label>
          <p className="text-xs text-ink-muted mt-1">PNG or JPG, max 2MB</p>
          {logoError && <p className="text-xs text-danger mt-1">{logoError}</p>}
        </div>
      </div>
    </SettingsSection>
  )
}
