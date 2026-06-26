'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ALL_TEMPLATES, TEMPLATE_CATEGORIES, type TemplateDefinition } from '@/lib/template-ip'

interface Props {
  title: string
  subtitle?: string
  /** Category names to include. If omitted, all categories are shown. */
  includeCategories?: string[]
  /** Category names to exclude from the default full list. Ignored when includeCategories is set. */
  excludeCategories?: string[]
  /** Route for the "Fill in details" button destination (chat page that accepts ?prompt=…). */
  customiseHref?: string
  /** Which module's chat to route to. 'people' -> /dashboard/people, 'recruit' -> /dashboard/recruit. */
  customiseModule?: 'people' | 'recruit'
}

export function TemplatesList({
  title,
  subtitle,
  includeCategories,
  excludeCategories = [],
  customiseHref,
  customiseModule = 'people',
}: Props) {
  const router = useRouter()

  // Derive the chat href from the module when not explicitly provided.
  const resolvedCustomiseHref = customiseHref ?? (customiseModule === 'recruit' ? '/dashboard/recruit' : '/dashboard/people')

  const categoryNames = includeCategories
    ? TEMPLATE_CATEGORIES.filter(c => includeCategories.includes(c))
    : TEMPLATE_CATEGORIES.filter(c => !excludeCategories.includes(c))

  const categories = categoryNames.map(cat => ({
    title: cat,
    templates: ALL_TEMPLATES.filter(t => t.category === cat),
  })).filter(cat => cat.templates.length > 0)

  const [openCategory, setOpenCategory] = useState<string | null>(categories[0]?.title ?? null)
  const [downloading, setDownloading] = useState<string | null>(null)
  // Fix #1 (H1): per-row error state instead of alert().
  const [downloadError, setDownloadError] = useState<Record<string, string>>({})

  const totalCount = categories.reduce((n, c) => n + c.templates.length, 0)

  function toggleCategory(t: string) {
    setOpenCategory(prev => prev === t ? null : t)
  }

  async function handleDownload(tmpl: TemplateDefinition) {
    setDownloading(tmpl.id)
    setDownloadError(prev => { const next = { ...prev }; delete next[tmpl.id]; return next })
    try {
      const res = await fetch('/api/documents/contract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          docType: tmpl.title,
          templateId: tmpl.id,
          formData: {},
        }),
      })

      if (!res.ok) {
        setDownloadError(prev => ({ ...prev, [tmpl.id]: 'Failed to generate document. Please try again.' }))
        setDownloading(null)
        return
      }

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${tmpl.title.replace(/[^a-zA-Z0-9 ]/g, '').replace(/\s+/g, '_')}.docx`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch {
      setDownloadError(prev => ({ ...prev, [tmpl.id]: 'Something went wrong. Please try again.' }))
    }
    setDownloading(null)
  }

  function handleCustomise(tmpl: TemplateDefinition) {
    const prompt = encodeURIComponent(`I need to generate a ${tmpl.title}`)
    router.push(`${resolvedCustomiseHref}?prompt=${prompt}`)
  }

  return (
    // Fix #5 (M2): bg-white page root -> bg-bg
    <div className="h-full overflow-y-auto scrollbar-thin bg-bg">
      <div className="max-w-3xl mx-auto px-4 sm:px-8 py-6 sm:py-8">
        {/* Fix #4 (M1): drop uppercase/tracking-wide, sentence-case, align size to documents page */}
        <h1 className="font-display text-3xl sm:text-[44px] font-bold text-charcoal mb-1">{title}</h1>
        <p className="text-xs sm:text-sm text-mid mb-6 sm:mb-8">
          {subtitle ?? `${totalCount} best-practice templates curated by Humanistiqs. Download a blank template or fill in your business details first.`}
        </p>

        <div className="space-y-3">
          {categories.map(cat => (
            // Fix #5 (M2): bg-white shadow-card -> bg-bg-elevated shadow-card
            <div key={cat.title} className="bg-bg-elevated shadow-card rounded-2xl overflow-hidden">
              {/* Category header - Fix #3 (H10 a11y): aria-expanded + aria-controls + focus ring */}
              <button
                id={`cat-btn-${cat.title.replace(/\s+/g, '-')}`}
                aria-expanded={openCategory === cat.title}
                aria-controls={`cat-panel-${cat.title.replace(/\s+/g, '-')}`}
                onClick={() => toggleCategory(cat.title)}
                className="w-full flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 hover:bg-light transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
              >
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  {/* Fix #4 (M1): drop uppercase from category h2 */}
                  <h2 className="font-display text-base sm:text-lg font-bold text-charcoal truncate">{cat.title}</h2>
                  <span className="text-xs text-muted bg-light px-2 py-0.5 rounded-full flex-shrink-0">{cat.templates.length}</span>
                </div>
                {/* Fix #5 (M2): text-gray-500 -> text-ink-muted */}
                <svg className={`w-4 h-4 text-ink-muted transition-transform ${openCategory === cat.title ? 'rotate-180' : ''}`}
                  viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd"/>
                </svg>
              </button>

              {/* Templates list */}
              {openCategory === cat.title && (
                <div
                  id={`cat-panel-${cat.title.replace(/\s+/g, '-')}`}
                  role="region"
                  aria-labelledby={`cat-btn-${cat.title.replace(/\s+/g, '-')}`}
                  className="border-t border-border"
                >
                  {cat.templates.map((tmpl, idx) => (
                    <div key={tmpl.id}
                      className={`px-4 sm:px-6 py-3 sm:py-4 hover:bg-light transition-colors ${idx > 0 ? 'border-t border-border' : ''}`}>
                      <div className="flex items-start gap-3 sm:gap-4">
                        <div className="w-8 h-8 bg-ink/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 hidden sm:flex">
                          <svg className="w-4 h-4 text-ink" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd"/>
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-charcoal">{tmpl.title}</p>
                          <p className="text-[11px] sm:text-xs text-muted mt-0.5 leading-relaxed">{tmpl.description}</p>
                          {/* Fix #1 (H1): inline per-row error message */}
                          {downloadError[tmpl.id] && (
                            <p className="text-xs text-danger mt-1" role="alert">{downloadError[tmpl.id]}</p>
                          )}
                        </div>
                        {/* Fix #2 (H3 touch) + Fix #9 (M12): min-h-touch, rename buttons, remove tooltip spans */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            onClick={() => handleDownload(tmpl)}
                            disabled={downloading === tmpl.id}
                            className="bg-bg-elevated hover:bg-light text-mid hover:text-charcoal text-[11px] sm:text-xs font-bold px-2.5 sm:px-3 py-1.5 sm:py-2 min-h-touch rounded-full border border-border transition-colors disabled:opacity-50"
                          >
                            {downloading === tmpl.id ? 'Generating...' : 'Download blank'}
                          </button>
                          <button
                            onClick={() => handleCustomise(tmpl)}
                            className="bg-accent hover:bg-accent-hover text-ink-on-accent text-[11px] sm:text-xs font-bold px-2.5 sm:px-3 py-1.5 sm:py-2 min-h-touch rounded-full transition-colors"
                          >
                            Fill in details
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
