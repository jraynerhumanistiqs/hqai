'use client'
import { useEffect, useRef } from 'react'
import { useWizard } from './wizard-state'

const FALLBACK_PROMPTS = [
  'Site Manager, Brisbane - residential builds, full-time, $130k + super.',
  'Office Manager / EA in Melbourne CBD, full-time, $80-90k + super.',
  'Casual barista, Newtown - 4 shifts across weekday mornings, $30+/hr.',
  'Bookkeeper, Adelaide CBD - 2 days a week, must know Xero and BAS.',
  'Registered Nurse, aged-care facility in Geelong - full-time, weekday days.',
]

const INDUSTRY_PROMPTS: Record<string, string[]> = {
  construction: [
    'Site Manager, Brisbane - residential builds, full-time, $130k + super.',
    'Foreman / leading hand on a Sydney commercial fit-out crew, full-time.',
    'Project Manager, civil infrastructure - Townsville, $160k + super + vehicle.',
    'Qualified electrician, residential service work, Northern Beaches - full-time.',
    'Carpenter (formwork), tier-2 commercial builder, Perth - 2-year project.',
  ],
  hospitality: [
    'Casual barista, Newtown - 4 shifts across weekday mornings, $30+/hr.',
    'Restaurant Manager, Surry Hills - full-time, can run a full lunch and dinner service solo.',
    'Sous Chef, fine dining, Brisbane - 5 days, $80-90k + tips.',
    'Function and events coordinator, hotel - Melbourne CBD, full-time.',
    'Front-of-house supervisor, gastropub - Newcastle, full-time evenings.',
  ],
  retail: [
    'Assistant Store Manager, Westfield Parramatta - full-time, mid-level retail experience.',
    'Visual Merchandiser, fashion - 4 stores across Sydney, casual.',
    'Store Manager, hardware/trade - Geelong, $75k + super + bonuses.',
    'E-commerce coordinator, Shopify + meta ads - hybrid Melbourne, $70-80k.',
    'Casual sales assistant, weekends - Bondi flagship store.',
  ],
  healthcare: [
    'Registered Nurse, aged-care facility in Geelong - full-time, weekday days.',
    'Practice Manager, GP clinic - 3 doctors, Hobart - full-time.',
    'Allied health receptionist, physiotherapy - Brisbane Northside, part-time.',
    'Disability Support Worker, NDIS provider - South Sydney, casual rotating shifts.',
    'Enrolled Nurse, day surgery - Adelaide, Mon-Fri, $70-80k.',
  ],
  professional_services: [
    'Bookkeeper, Adelaide CBD - 2 days a week, must know Xero and BAS.',
    'Office Manager / EA in Melbourne CBD, full-time, $80-90k + super.',
    'Junior accountant, business services - Brisbane Inner West, full-time.',
    'Paralegal, family law - Sydney CBD, full-time, $75-85k.',
    'Marketing coordinator, agency - hybrid Melbourne, full-time.',
  ],
  trades: [
    'Qualified electrician, residential service work, Northern Beaches - full-time.',
    'Plumber, commercial maintenance - Perth, full-time, $100k + vehicle.',
    'HVAC technician, refrigeration ticket - Adelaide, full-time.',
    'Apprentice carpenter, 2nd or 3rd year - Sunshine Coast, residential builds.',
    'Glazier, commercial - Western Sydney, full-time.',
  ],
  manufacturing: [
    'Production Supervisor, food manufacturing - Toowoomba, day shift.',
    'CNC machinist, swing shift - Western Sydney, $80-90k + overtime.',
    'Quality Assurance Officer, ISO 9001 - Geelong, full-time.',
    'Warehouse Team Leader, FMCG - Truganina, $75-85k + super.',
    'Forklift driver (LF licence), 6am start - Eastern Creek, $32+/hr casual.',
  ],
}

function pickPromptsForIndustry(industry: string | undefined): string[] {
  const key = (industry || '').toLowerCase().trim()
  if (!key) return FALLBACK_PROMPTS
  // Loose match: 'professional services' / 'professional_services' / 'consulting'
  const normalised = key
    .replace(/[\s/\-]+/g, '_')
    .replace(/&/g, 'and')
  if (INDUSTRY_PROMPTS[normalised]) return INDUSTRY_PROMPTS[normalised]
  // Fuzzy keyword fall-through.
  if (/(constru|build|site|civil)/i.test(key)) return INDUSTRY_PROMPTS.construction
  if (/(hospo|hotel|caf|restaurant|food.*bev|hospitality)/i.test(key)) return INDUSTRY_PROMPTS.hospitality
  if (/(retail|store|shop|ecomm)/i.test(key)) return INDUSTRY_PROMPTS.retail
  if (/(health|medical|nurse|aged|ndis|disab)/i.test(key)) return INDUSTRY_PROMPTS.healthcare
  if (/(consult|legal|accounting|professional|advisory|finance)/i.test(key)) return INDUSTRY_PROMPTS.professional_services
  if (/(trade|electric|plumb|hvac|carpent)/i.test(key)) return INDUSTRY_PROMPTS.trades
  if (/(manufact|warehouse|logistic|production|fmcg)/i.test(key)) return INDUSTRY_PROMPTS.manufacturing
  return FALLBACK_PROMPTS
}

export default function Step1Brief() {
  const { state, dispatch, business } = useWizard()
  const prompts = pickPromptsForIndustry(business?.industry).slice(0, 5)

  // Push initial coaching messages on first Step 1 render so the right-side
  // panel reads like a real conversation. Tips are AU-tuned best-practice
  // and reference industrial award + protected-attribute compliance.
  const seededRef = useRef(false)
  useEffect(() => {
    if (seededRef.current) return
    if (state.coach_messages.length > 0) return
    seededRef.current = true
    const tips = [
      "Hi - I'll guide you through writing a great ad and getting it live. Tell me about the role on the left and I'll take it from there.",
      "Quick coaching tip while you type: the best-performing AU ads lead with the specific outcome someone will own in their first 90 days, not a generic 'about us' pitch.",
      "Compliance heads-up: I'll auto-classify the Modern Award and check the rate against the Fair Work Pay Calculator on the next step. No need to know it now.",
      "Plain English wins. Skip the rockstar/ninja/guru words - they discourage women and older candidates from applying and they're not specific enough to filter for skill.",
    ]
    tips.forEach((text, i) => {
      const stagger = i === 0 ? 0 : 200 + i * 800
      setTimeout(() => {
        dispatch({ type: 'PUSH_COACH_MESSAGE', msg: { role: 'coach', text, ts: Date.now() } })
      }, stagger)
    })
  }, [dispatch, state.coach_messages.length])

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-xl sm:text-2xl font-bold text-charcoal mb-1.5">
          Step 1 - Tell me about the role
        </h2>
        <p className="text-sm text-mid leading-relaxed max-w-xl">
          Just rough notes are fine. I'll classify the role, find the right Modern Award, and
          draft an ad you can react to.
        </p>
      </div>

      <div className="bg-white shadow-card rounded-2xl p-4 sm:p-5 relative">
        <textarea
          value={state.briefText}
          onChange={e => dispatch({ type: 'SET_BRIEF_TEXT', text: e.target.value })}
          placeholder={"Try something like: 'Site Manager in Brisbane, full-time, $130k + super, residential builds.'\n\nA few rough notes on the role, location, contract type, salary, and the 2-3 things you really need them to be good at is plenty - I'll take it from there."}
          rows={5}
          className="w-full bg-transparent text-base sm:text-lg text-charcoal placeholder-muted resize-none outline-none leading-relaxed pr-12"
        />

        <div className="absolute bottom-3 right-3">
          <button
            disabled
            title="Voice input - coming soon"
            className="w-9 h-9 rounded-full bg-black text-white flex items-center justify-center cursor-not-allowed shadow-card"
            aria-label="Voice input - coming soon"
          >
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10 2a3 3 0 00-3 3v5a3 3 0 006 0V5a3 3 0 00-3-3z" />
              <path d="M3.5 9.5a.5.5 0 011 0 5.5 5.5 0 0011 0 .5.5 0 011 0 6.5 6.5 0 01-6 6.48V18a.5.5 0 01-1 0v-2.02a6.5 6.5 0 01-6-6.48z" />
            </svg>
          </button>
        </div>
      </div>

      <div>
        <p className="text-[11px] font-bold text-muted uppercase tracking-wider mb-2">
          {business?.industry ? `Common roles in ${business.industry.toLowerCase()}` : 'Or try an example'}
        </p>
        <div className="flex flex-wrap gap-2">
          {prompts.map((p, i) => (
            <button
              key={i}
              onClick={() => dispatch({ type: 'SET_BRIEF_TEXT', text: p })}
              className="bg-light hover:bg-border text-charcoal text-xs sm:text-sm font-medium px-4 py-2 rounded-full transition-colors text-left max-w-full"
            >
              {p}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
