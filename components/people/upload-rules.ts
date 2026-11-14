// Rules for files uploaded to a person's record. Shared by the uploader
// (components/people/UploadDocument.tsx) for instant feedback and by the
// server route (app/api/employees/[id]/documents/route.ts), which is the one
// that actually enforces them. Pure and dependency-free.

export const EMPLOYEE_DOCUMENTS_BUCKET = 'employee-documents'
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024

/** Extension -> the content type we store it under. */
export const ALLOWED_TYPES: Record<string, string> = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  heic: 'image/heic',
}

/** For <input accept>. */
export const ACCEPT_ATTR = Object.keys(ALLOWED_TYPES).map(e => `.${e}`).join(',')

export const ALLOWED_LABEL = 'PDF, Word (DOC or DOCX), JPG, PNG or HEIC'

export function extensionOf(name: string): string {
  const m = /\.([a-z0-9]+)$/i.exec(name.trim())
  return m ? m[1].toLowerCase() : ''
}

/**
 * A storage-safe version of the original name: no path separators or control
 * characters, no leading dots, collapsed whitespace, capped length with the
 * extension kept.
 */
export function sanitiseFileName(name: string, maxLength = 100): string {
  const base = name.split(/[\\/]/).pop() ?? ''
  const ext = extensionOf(base)
  let stem = (ext ? base.slice(0, -(ext.length + 1)) : base)
    .replace(/[^\w.\- ]+/g, '_')
    .replace(/\s+/g, ' ')
    .replace(/^[.\s]+/, '')
    .trim()
  const room = Math.max(1, maxLength - (ext ? ext.length + 1 : 0))
  stem = stem.slice(0, room).trim() || 'file'
  return ext ? `${stem}.${ext}` : stem
}

export type UploadCheck = { ok: true; ext: string; mime: string } | { ok: false; error: string }

export function checkUpload(name: string, size: number): UploadCheck {
  const ext = extensionOf(name)
  const mime = ALLOWED_TYPES[ext]
  if (!mime) return { ok: false, error: `That file type cannot be attached. Use ${ALLOWED_LABEL}.` }
  if (!Number.isFinite(size) || size <= 0) return { ok: false, error: 'That file is empty.' }
  if (size > MAX_UPLOAD_BYTES) return { ok: false, error: 'That file is over 10 MB. Attach a smaller copy.' }
  return { ok: true, ext, mime }
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}
