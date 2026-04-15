'use client'
import { useState } from 'react'

interface Template {
  name: string
  description: string
}

interface Category {
  title: string
  templates: Template[]
}

const CATEGORIES: Category[] = [
  {
    title: 'Employment Contracts',
    templates: [
      { name: 'Full-Time Employment Contract', description: 'Comprehensive contract for permanent full-time employees including all NES and Modern Award compliance clauses.' },
      { name: 'Part-Time Employment Contract', description: 'Contract for permanent part-time employees with guaranteed hours and pro-rata entitlements.' },
      { name: 'Casual Employment Contract', description: 'Casual engagement agreement with casual loading, BOOT compliance, and casual conversion notice.' },
      { name: 'Fixed-Term Employment Contract', description: 'Fixed-term contract with end date, renewal conditions, and conversion rights under Fair Work Act.' },
      { name: 'Maximum Term Employment Contract', description: 'Maximum term contract that may end earlier by notice, with all standard employment protections.' },
    ]
  },
  {
    title: 'Letters & Offers',
    templates: [
      { name: 'Letter of Offer', description: 'Formal offer letter with position details, remuneration summary, and conditions of offer.' },
      { name: 'Contract Variation Letter', description: 'Letter to vary existing employment terms — hours, duties, remuneration, or location.' },
      { name: 'Probation Extension Letter', description: 'Letter extending probationary period with clear expectations and review date.' },
      { name: 'Confirmation of Employment Letter', description: 'Letter confirming successful completion of probation and ongoing employment.' },
    ]
  },
  {
    title: 'Performance Management',
    templates: [
      { name: 'Verbal Warning File Note', description: 'Formal file note documenting an informal verbal warning discussion.' },
      { name: 'First Written Warning Letter', description: 'First formal written warning with specific conduct or performance issues, expectations, and review period.' },
      { name: 'Final Written Warning Letter', description: 'Final warning letter clearly stating further issues may result in termination.' },
      { name: 'Performance Improvement Plan (PIP)', description: 'Structured PIP with measurable goals, timeline, support offered, and consequences of non-improvement.' },
      { name: 'Show Cause Letter', description: 'Show cause letter providing employee opportunity to respond before any adverse action is taken.' },
    ]
  },
  {
    title: 'Termination & Separation',
    templates: [
      { name: 'Termination Letter (Performance)', description: 'Termination for underperformance after completing full performance management process.' },
      { name: 'Termination Letter (Serious Misconduct)', description: 'Summary dismissal for serious misconduct — fraud, theft, violence, serious safety breach.' },
      { name: 'Redundancy Letter', description: 'Genuine redundancy notification with consultation obligations and entitlements.' },
      { name: 'Resignation Acceptance Letter', description: 'Confirming acceptance of resignation with final pay details and handover requirements.' },
      { name: 'Abandonment of Employment Letter', description: 'Letter addressing unauthorised absence and potential termination for abandonment.' },
    ]
  },
  {
    title: 'Workplace Policies',
    templates: [
      { name: 'Code of Conduct', description: 'Comprehensive code of conduct covering expected workplace behaviour and standards.' },
      { name: 'Anti-Discrimination & Harassment Policy', description: 'Policy covering all protected attributes under federal and state anti-discrimination legislation.' },
      { name: 'Work Health & Safety Policy', description: 'WHS policy covering employer and employee obligations under relevant state WHS Act.' },
      { name: 'Social Media & Technology Use Policy', description: 'Acceptable use policy for company technology, social media, and online conduct.' },
      { name: 'Flexible Working Arrangements Policy', description: 'Policy for requesting and managing flexible work under NES provisions.' },
      { name: 'Leave Policy', description: 'Comprehensive leave policy covering all NES entitlements plus any above-award provisions.' },
    ]
  },
  {
    title: 'Recruitment',
    templates: [
      { name: 'Job Advertisement Template', description: 'Compliant, compelling job ad structure with anti-discrimination safeguards.' },
      { name: 'Candidate Screening Questions', description: 'Structured screening questions scored against role-specific criteria.' },
      { name: 'Interview Scorecard', description: 'Standardised interview evaluation scorecard with competency-based rating scale.' },
      { name: 'Reference Check Template', description: 'Structured reference check questions covering performance, conduct, and re-employment.' },
      { name: 'Unsuccessful Candidate Letter', description: 'Professional rejection letter maintaining employer brand and compliance.' },
    ]
  },
]

export default function TemplatesPage() {
  const [openCategory, setOpenCategory] = useState<string | null>(CATEGORIES[0].title)

  function toggleCategory(title: string) {
    setOpenCategory(prev => prev === title ? null : title)
  }

  return (
    <div className="h-full overflow-y-auto scrollbar-thin bg-[#000000]">
      <div className="max-w-3xl mx-auto px-4 sm:px-8 py-6 sm:py-8">
        <h1 className="font-display text-2xl sm:text-h1 font-bold text-white uppercase tracking-wide mb-1">HR Templates</h1>
        <p className="text-xs sm:text-sm text-gray-400 mb-6 sm:mb-8">Best practice templates curated by HQ.ai experts. Download unmarked or customise with your business details first.</p>

        <div className="space-y-3">
          {CATEGORIES.map(cat => (
            <div key={cat.title} className="bg-[#111111] border border-[#222222] rounded-2xl overflow-hidden">
              {/* Category header */}
              <button
                onClick={() => toggleCategory(cat.title)}
                className="w-full flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 hover:bg-[#1a1a1a] transition-colors"
              >
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  <h2 className="font-display text-base sm:text-lg font-bold text-white uppercase tracking-wider truncate">{cat.title}</h2>
                  <span className="text-xs text-gray-500 bg-[#1a1a1a] px-2 py-0.5 rounded-full flex-shrink-0">{cat.templates.length}</span>
                </div>
                <svg className={`w-4 h-4 text-gray-500 transition-transform ${openCategory === cat.title ? 'rotate-180' : ''}`}
                  viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd"/>
                </svg>
              </button>

              {/* Templates list */}
              {openCategory === cat.title && (
                <div className="border-t border-[#222222]">
                  {cat.templates.map((tmpl, idx) => (
                    <div key={tmpl.name}
                      className={`px-4 sm:px-6 py-3 sm:py-4 hover:bg-[#0a0a0a] transition-colors ${idx > 0 ? 'border-t border-[#1a1a1a]' : ''}`}>
                      <div className="flex items-start gap-3 sm:gap-4">
                        <div className="w-8 h-8 bg-[#fd7325]/15 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 hidden sm:flex">
                          <svg className="w-4 h-4 text-[#fd7325]" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd"/>
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-white">{tmpl.name}</p>
                          <p className="text-[11px] sm:text-xs text-gray-500 mt-0.5 leading-relaxed">{tmpl.description}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <div className="relative group">
                            <button className="bg-[#1a1a1a] hover:bg-[#222222] text-gray-400 hover:text-white text-[11px] sm:text-xs font-bold px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg border border-[#333333] transition-colors">
                              Download
                            </button>
                            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-[#222222] text-white text-[10px] px-2.5 py-1.5 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-lg hidden sm:block">
                              Download unmarked template
                            </span>
                          </div>
                          <div className="relative group">
                            <button className="bg-[#fd7325] hover:bg-[#e5671f] text-white text-[11px] sm:text-xs font-bold px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg transition-colors">
                              Customise
                            </button>
                            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-[#222222] text-white text-[10px] px-2.5 py-1.5 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-lg hidden sm:block">
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
