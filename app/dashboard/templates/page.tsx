'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ALL_TEMPLATES, TEMPLATE_CATEGORIES, type TemplateDefinition } from '@/lib/template-ip'

// Group templates by category from template-ip.ts
const CATEGORIES = TEMPLATE_CATEGORIES.map(cat => ({
  title: cat,
  templates: ALL_TEMPLATES.filter(t => t.category === cat),
}))

export default function TemplatesPage() {
  const router = useRouter()
  const [openCategory, setOpenCategory] = useState<string | null>(CATEGORIES[0].title)
  const [downloading, setDownloading] = useState<string | null>(null)

  function toggleCategory(title: string) {
    setOpenCategory(prev => prev === title ? null : title)
  }

  async function handleDownload(tmpl: TemplateDefinition) {
    setDownloading(tmpl.id)
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
        alert('Failed to generate document. Please try again.')
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
      alert('Something went wrong. Please try again.')
    }
    setDownloading(null)
  }

  function handleCustomise(tmpl: TemplateDefinition) {
    // Navigate to HQ People chat with a pre-filled prompt
    const prompt = encodeURIComponent(`I need to generate a ${tmpl.title}`)
    router.push(`/dashboard/people?prompt=${prompt}`)
  }

  return (
    <div className="h-full overflow-y-auto scrollbar-thin bg-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-8 py-6 sm:py-8">
        <h1 className="font-display text-2xl sm:text-h1 font-bold text-charcoal uppercase tracking-wide mb-1">HR Templates</h1>
        <p className="text-xs sm:text-sm text-mid mb-6 sm:mb-8">
          {ALL_TEMPLATES.length} best-practice templates curated by Humanistiqs. Download a blank template or customise with your business details first.
        </p>

        <div className="space-y-3">
          {CATEGORIES.map(cat => (
            <div key={cat.title} className="bg-white shadow-card rounded-2xl overflow-hidden">
              {/* Category header */}
              <button
                onClick={() => toggleCategory(cat.title)}
                className="w-full flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 hover:bg-light transition-colors"
              >
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  <h2 className="font-display text-base sm:text-lg font-bold text-charcoal uppercase tracking-wider truncate">{cat.title}</h2>
                  <span className="text-xs text-muted bg-light px-2 py-0.5 rounded-full flex-shrink-0">{cat.templates.length}</span>
                </div>
                <svg className={`w-4 h-4 text-gray-500 transition-transform ${openCategory === cat.title ? 'rotate-180' : ''}`}
                  viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd"/>
                </svg>
              </button>

              {/* Templates list */}
              {openCategory === cat.title && (
                <div className="border-t border-border">
                  {cat.templates.map((tmpl, idx) => (
                    <div key={tmpl.id}
                      className={`px-4 sm:px-6 py-3 sm:py-4 hover:bg-light transition-colors ${idx > 0 ? 'border-t border-border' : ''}`}>
                      <div className="flex items-start gap-3 sm:gap-4">
                        <div className="w-8 h-8 bg-black/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 hidden sm:flex">
                          <svg className="w-4 h-4 text-black" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd"/>
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-charcoal">{tmpl.title}</p>
                          <p className="text-[11px] sm:text-xs text-muted mt-0.5 leading-relaxed">{tmpl.description}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <div className="relative group">
                            <button
                              onClick={() => handleDownload(tmpl)}
                              disabled={downloading === tmpl.id}
                              className="bg-white hover:bg-light text-mid hover:text-charcoal text-[11px] sm:text-xs font-bold px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-full border border-border transition-colors disabled:opacity-50"
                            >
                              {downloading === tmpl.id ? 'Generating…' : 'Download'}
                            </button>
                            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-charcoal text-white text-[10px] px-2.5 py-1.5 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-lg hidden sm:block">
                              Generate &amp; download template
                            </span>
                          </div>
                          <div className="relative group">
                            <button
                              onClick={() => handleCustomise(tmpl)}
                              className="bg-black hover:bg-[#1a1a1a] text-white text-[11px] sm:text-xs font-bold px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-full transition-colors"
                            >
                              Customise
                            </button>
                            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-charcoal text-white text-[10px] px-2.5 py-1.5 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-lg hidden sm:block">
                              Input your data before downloading
                            </span>
                          </div>
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
