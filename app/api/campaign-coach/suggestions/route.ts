import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 30
export const dynamic = 'force-dynamic'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const MODEL = 'claude-sonnet-4-20250514'

interface RecentCampaign {
  id: string
  title: string
  brief: string
  created_at: string
}

interface SuggestionsResponse {
  industry: string | null
  industry_source: 'profile' | 'inferred' | 'fallback'
  examples: string[]
  recent_campaigns: RecentCampaign[]
}

const FALLBACK_EXAMPLES = [
  'Office Manager / EA in Melbourne CBD, full-time, $80-90k + super.',
  'Bookkeeper, Adelaide CBD - 2 days a week, must know Xero and BAS.',
  'Customer Service Lead, Brisbane - hybrid, $75k + super, 4 direct reports.',
]

export async function GET(_req: NextRequest): Promise<NextResponse<SuggestionsResponse>> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({
        industry: null,
        industry_source: 'fallback',
        examples: FALLBACK_EXAMPLES,
        recent_campaigns: [],
      })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('businesses(id, name, industry, state, about)')
      .eq('id', user.id)
      .single()
    const business = profile?.businesses as unknown as {
      id: string
      name: string
      industry?: string
      state?: string
      about?: string
    } | null

    const recent = await loadRecentCampaigns(supabase, business?.id)

    const profileIndustry = (business?.industry || '').trim()
    if (profileIndustry) {
      const examples = await generateExamples(profileIndustry, business)
      return NextResponse.json({
        industry: profileIndustry,
        industry_source: 'profile',
        examples,
        recent_campaigns: recent,
      })
    }

    // No industry in profile - try to infer from business name + about.
    // First try fast keyword match, then fall back to Claude inference.
    const keywordIndustry = inferIndustryFromKeywords(business?.name, business?.about)
    const inferred = keywordIndustry || await inferIndustry(business?.name, business?.about)
    if (inferred) {
      const examples = await generateExamples(inferred, business)
      return NextResponse.json({
        industry: inferred,
        industry_source: 'inferred',
        examples,
        recent_campaigns: recent,
      })
    }

    return NextResponse.json({
      industry: null,
      industry_source: 'fallback',
      examples: FALLBACK_EXAMPLES,
      recent_campaigns: recent,
    })
  } catch (err) {
    console.error('[campaign-coach/suggestions]', err)
    return NextResponse.json({
      industry: null,
      industry_source: 'fallback',
      examples: FALLBACK_EXAMPLES,
      recent_campaigns: [],
    })
  }
}

async function loadRecentCampaigns(
  supabase: Awaited<ReturnType<typeof createClient>>,
  businessId: string | undefined,
): Promise<RecentCampaign[]> {
  if (!businessId) return []
  const { data } = await supabase
    .from('campaigns')
    .select('id, role_profile, created_at')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })
    .limit(5)

  return (data ?? [])
    .map(row => {
      const rp = row.role_profile as Record<string, unknown> | null
      if (!rp) return null
      const title = String(rp.title ?? 'Untitled role')
      const location = (rp.location as Record<string, unknown> | undefined)
      const locStr = location
        ? [location.suburb, location.state].filter(Boolean).join(', ')
        : ''
      const contractRaw = String(rp.contract_type ?? '').replace(/_/g, ' ')
      const salary = rp.salary as Record<string, unknown> | undefined
      const salStr = salary && salary.min && salary.max
        ? `$${salary.min}-${salary.max}`
        : ''
      const must = Array.isArray(rp.must_have_skills) ? rp.must_have_skills.slice(0, 3).join(', ') : ''
      const briefParts = [
        title,
        locStr,
        contractRaw,
        salStr,
        must ? `must-haves: ${must}` : '',
      ].filter(Boolean)
      return {
        id: String(row.id),
        title,
        brief: briefParts.join(' - '),
        created_at: String(row.created_at),
      }
    })
    .filter((r): r is RecentCampaign => r !== null)
}

const INDUSTRY_KEYWORDS: Array<{ industry: string; patterns: RegExp }> = [
  { industry: 'Construction', patterns: /\b(construct|build(er|ing)|plumb|electri|carpent|concret|excavat|demolit|scaffold|roofing|tiling|landscap|civil|trade|hvac|welding|steel|formwork)\b/i },
  { industry: 'Healthcare', patterns: /\b(health|medical|hospital|clinic|nurs|doctor|physio|dental|pharmacy|aged.?care|allied.?health|patholog|radiol|optometr)\b/i },
  { industry: 'Hospitality', patterns: /\b(hotel|restaurant|cafe|caf[eé]|bar |pub |hospit|catering|food.?service|accommodation|motel|resort|brew|kitchen|chef)\b/i },
  { industry: 'Retail', patterns: /\b(retail|shop|store|boutique|supermarket|grocer|fashion|apparel|merchand)\b/i },
  { industry: 'Professional Services', patterns: /\b(consult|account|legal|law firm|financ|advisory|architect|engineer|design|market|advertis|recruit|real.?estate|insur|wealth)\b/i },
  { industry: 'Education', patterns: /\b(school|educat|teach|university|college|childcare|kindergarten|daycare|early.?learn|tutor|training)\b/i },
  { industry: 'Manufacturing', patterns: /\b(manufactur|factory|production|assembly|fabricat|packag|warehouse|logistics|freight|transport)\b/i },
  { industry: 'Technology', patterns: /\b(software|tech|digital|cyber|data|cloud|saas|app |web |develop|program|startup)\b/i },
  { industry: 'Community Services', patterns: /\b(community|nfp|not.?for.?profit|charity|social.?work|disability|ndis|welfare|council)\b/i },
  { industry: 'Agriculture', patterns: /\b(farm|agri|pastoral|livestock|grain|dairy|horticulture|vineyard|wine|crop)\b/i },
  { industry: 'Mining', patterns: /\b(min(e|ing)|resource|oil|gas|drill|explor|quarry|mineral)\b/i },
  { industry: 'Automotive', patterns: /\b(auto|motor|mechanic|panel.?beat|smash.?repair|car.?wash|tyre|tire|dealer)\b/i },
  { industry: 'Cleaning', patterns: /\b(clean|janitor|sanit|waste|hygiene)\b/i },
  { industry: 'Security', patterns: /\b(security|guard|patrol|surveillance|protecti)\b/i },
]

function inferIndustryFromKeywords(name?: string, about?: string): string | null {
  const text = [name, about].filter(Boolean).join(' ')
  if (!text) return null
  for (const { industry, patterns } of INDUSTRY_KEYWORDS) {
    if (patterns.test(text)) return industry
  }
  return null
}

async function inferIndustry(name?: string, about?: string): Promise<string | null> {
  if (!name) return null
  try {
    const res = await Promise.race([
      anthropic.messages.create({
        model: MODEL,
        max_tokens: 64,
        system:
          'You return only a single short Australian industry label for a business. No JSON, no markdown, no explanation - just the industry. Examples of valid outputs: "Construction", "Hospitality", "Retail", "Healthcare", "Professional Services", "Trades", "Manufacturing", "Aged Care", "Childcare". If you genuinely cannot tell, return only the literal word UNKNOWN.',
        messages: [{
          role: 'user',
          content: `Business name: ${name}\n${about ? `About: ${about}` : ''}\n\nIndustry?`,
        }],
      }),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 8000)),
    ])
    if (!res || !('content' in res)) return null
    const text = res.content
      .filter(b => b.type === 'text')
      .map(b => (b as { type: 'text'; text: string }).text)
      .join('')
      .trim()
    if (!text || /unknown/i.test(text)) return null
    return text.split('\n')[0]?.trim() || null
  } catch {
    return null
  }
}

async function generateExamples(
  industry: string,
  business: { name: string; state?: string } | null,
): Promise<string[]> {
  const tool = {
    name: 'submit_examples',
    description: 'Return exactly 3 example role briefs for the supplied industry.',
    input_schema: {
      type: 'object' as const,
      properties: {
        examples: {
          type: 'array',
          minItems: 3,
          maxItems: 3,
          items: { type: 'string' },
          description: 'Each item is a single-sentence role brief in the format used by HQ.ai Campaign Coach Step 1.',
        },
      },
      required: ['examples'],
    },
  }

  // Seed the prompt with industry-specific reference examples (researched
  // against Fair Work Pay Calculator + SEEK/Hays data) so Claude generates
  // variations of those roles rather than drifting to generic office hires.
  const referenceExamples = industryFallbackExamples(industry)
  const referenceBlock = referenceExamples.map(s => `- "${s}"`).join('\n')

  try {
    const res = await Promise.race([
      anthropic.messages.create({
        model: MODEL,
        max_tokens: 600,
        system: `You produce 3 example role briefs for an Australian SME working in ${industry}. Each brief is one short sentence with: role title - location - contract type - salary range or hourly - 1-3 quick must-haves. Use Australian spelling, plain hyphens (no em-dashes or en-dashes), AUD currency, and locations from the business's state if known.

CRITICAL: roles must be the MOST COMMON hires an Australian SME in ${industry} actually makes. Do NOT default to generic office roles (Office Manager, Bookkeeper, Customer Service Lead) unless this industry actually hires them frequently. Use the reference examples below as your guide for which kinds of roles to surface and what salary bands/qualifications to include. Vary the specifics (location, exact salary, must-haves) but keep the role types in the same family as the references:

${referenceBlock}

Output via the submit_examples tool only.`,
        tools: [tool],
        tool_choice: { type: 'tool', name: 'submit_examples' },
        messages: [{
          role: 'user',
          content: `Business: ${business?.name ?? 'Unnamed business'} (${industry})${business?.state ? ` based in ${business.state}` : ''}.\n\nGive me 3 realistic role briefs an SME in this industry would commonly hire for. Roles should vary across seniority and contract type.`,
        }],
      }),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 10_000)),
    ])
    if (!res || !('content' in res)) return industryFallbackExamples(industry)
    const toolBlock = res.content.find(b => b.type === 'tool_use')
    if (!toolBlock || toolBlock.type !== 'tool_use') return industryFallbackExamples(industry)
    const input = toolBlock.input as { examples?: string[] }
    const arr = Array.isArray(input.examples)
      ? input.examples.map(s => String(s).trim()).filter(Boolean)
      : []
    return arr.length === 3 ? arr : industryFallbackExamples(industry)
  } catch {
    return industryFallbackExamples(industry)
  }
}

// Industry example library - grounded in Fair Work Pay Calculator (1 July 2025
// award rates) and SEEK/Hays/ABS market data. Reviewed quarterly.
// Keys are checked for exact match first then case-insensitive substring match,
// so "Construction & Trades" (Settings dropdown) resolves to "Construction".
const INDUSTRY_EXAMPLE_MAP: Record<string, string[]> = {
  Retail: [
    'Retail Sales Assistant, Melbourne - casual, $31.50/hr inc. casual loading, weekend availability and POS experience.',
    'Store Manager, Brisbane - full-time, $65-78k + super, 2+ years retail leadership and rostering experience.',
    'Assistant Store Manager / 2IC, Sydney - full-time, $58-66k + super, visual merchandising and stock control.',
  ],
  Hospitality: [
    'Barista, Melbourne - part-time, $28-34/hr, 1+ years specialty coffee experience and 5am starts.',
    'Chef de Partie, Sydney - full-time, $70-82k + super, a la carte service and 50-hour weeks.',
    'Front of House / Wait Staff, Adelaide - casual, $33.41/hr inc. casual loading, RSA certificate and Friday-Sunday nights.',
  ],
  Healthcare: [
    'Personal Care Worker (Cert III), Newcastle - part-time, $30.86-33.50/hr, NDIS Worker Screening and own car.',
    'Registered Nurse, Geelong - full-time, $82-98k + super, current AHPRA registration and aged care experience.',
    'Home Care Worker, Sunshine Coast - casual, $36-41/hr inc. loadings, Cert III Individual Support and driver licence.',
  ],
  Pharmacy: [
    'Pharmacy Assistant (S2/S3 trained), Canberra - casual, $30-33/hr, S2/S3 modules completed and Saturday rotation.',
    'Retail Pharmacist, Townsville - full-time, $95-120k + super, AHPRA registration and FRED/Minfos/LOTS experience.',
    'Pharmacy Technician, Wollongong - part-time, $28-32/hr, Cert IV in Community Pharmacy and dispensing experience.',
  ],
  Construction: [
    'Carpenter, Brisbane - full-time, $38-48/hr, white card, own tools and residential framing experience.',
    'Site Supervisor / Foreman, Sydney - full-time, $110-140k + ute + super, white card and supervisor ticket.',
    'Apprentice (1st-4th year), Adelaide - full-time, $14-25/hr per award year + tools allowance, school leaver with reliable transport.',
  ],
  'Professional Services': [
    'Bookkeeper / Accounts Officer, Melbourne - part-time, $35-45/hr, Xero certified and BAS Agent registration preferred.',
    'Administration Assistant, Sydney - full-time, $60-72k + super, MS 365 fluency and 2+ years in a small office.',
    'Junior Accountant, Brisbane - full-time, $65-78k + super + study support, CA/CPA enrolled and Xero/MYOB experience.',
  ],
  Education: [
    'Early Childhood Educator (Cert III), Melbourne - full-time, $26-32/hr, Cert III in ECEC, WWCC and First Aid + anaphylaxis.',
    'Diploma Educator / Room Leader, Sydney - full-time, $32-38/hr, Diploma of ECEC and 2+ years in a long day care room.',
    'OSHC Educator, Perth - part-time split shift, $30-35/hr, Cert III (or working toward) and afternoon availability 2-6pm.',
  ],
  'Community Services': [
    'Disability Support Worker, Hobart - casual, $38-45/hr inc. casual loading, NDIS Worker Screening, manual handling and own vehicle.',
    'Case Manager, Canberra - full-time, $80-92k + super + salary packaging, Cert IV in community services and NDIS pricing knowledge.',
    'Youth Worker, Geelong - part-time, $38-44/hr, Cert IV in Youth Work, WWCC and afternoon/evening shifts.',
  ],
  Technology: [
    'Full Stack Developer (mid), Melbourne - full-time, $110-140k + super, 3+ years React/Node and AWS experience.',
    'IT Support / Helpdesk (L1-L2), Sydney - full-time, $65-85k + super, M365 admin, Intune and 1+ years MSP experience.',
    'Junior Developer / Graduate, Brisbane - full-time, $70-85k + super, CS degree or bootcamp and a portfolio repo.',
  ],
  Manufacturing: [
    'Production Operator, Melbourne - full-time, $28-34/hr, forklift licence and rotating shift availability.',
    'Warehouse / Storeperson, Sydney - full-time, $28-34/hr + super, forklift licence and 2+ years in dispatch.',
    'Maintenance Technician, Brisbane - full-time, $75-95k + super, mechanical trade qualification and PLC experience.',
  ],
  Agriculture: [
    'Farm Hand, regional Victoria - full-time, $28-35/hr, manual licence and livestock or cropping experience.',
    'Vineyard Worker, Adelaide Hills - casual, $26-31/hr, hand-pruning experience and weekend availability in vintage.',
    'Dairy Hand, regional NSW - full-time + on-farm housing, $60-72k + super, early starts and milking shed experience.',
  ],
  Automotive: [
    'Motor Mechanic, Perth - full-time, $32-42/hr + tool allowance, MV trade qualification and 3+ years dealership experience.',
    'Service Advisor, Brisbane - full-time, $65-80k + super, dealership DMS experience and customer-facing.',
    'Apprentice Motor Mechanic, Adelaide - full-time, $14-22/hr per award year, school leaver with manual licence.',
  ],
  Cleaning: [
    'Commercial Cleaner, Sydney - part-time evenings, $32-36/hr, own transport and 2+ years experience.',
    'Cleaning Supervisor, Melbourne - full-time, $55-65k + super, rostering and team leadership.',
    'Domestic Cleaner, Brisbane - casual, $33-38/hr inc. loadings, NDIS Worker Screening and own vehicle.',
  ],
  Security: [
    'Security Officer, Melbourne - casual, $33-38/hr inc. casual loading, current Security Licence and First Aid.',
    'Control Room Operator, Sydney - full-time, $60-72k + super, 12-hour rotating shifts and Security Licence.',
    'Crowd Controller, Gold Coast - casual, $36-42/hr, RSA + Crowd Control Licence and weekend nights.',
  ],
  Other: [
    'Administration Officer, Melbourne - full-time, $60-70k + super, MS 365 and 1+ years in a small business.',
    'Customer Service Representative, Sydney - full-time, $58-68k + super, phone-based support and CRM experience.',
    'Operations Coordinator, Brisbane - full-time, $70-85k + super, scheduling, supplier liaison and 2+ years in operations.',
  ],
}

function industryFallbackExamples(industry: string): string[] {
  // Exact match first
  if (INDUSTRY_EXAMPLE_MAP[industry]) return INDUSTRY_EXAMPLE_MAP[industry]
  // Fuzzy match - check if any key is a substring of the industry label.
  // Handles Settings dropdown values like "Construction & Trades",
  // "Healthcare & Aged Care", "Education & Childcare".
  const lower = industry.toLowerCase()
  for (const key of Object.keys(INDUSTRY_EXAMPLE_MAP)) {
    if (lower.includes(key.toLowerCase())) return INDUSTRY_EXAMPLE_MAP[key]
  }
  return FALLBACK_EXAMPLES
}
