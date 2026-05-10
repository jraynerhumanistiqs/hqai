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
    const inferred = await inferIndustry(business?.name, business?.about)
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

  try {
    const res = await Promise.race([
      anthropic.messages.create({
        model: MODEL,
        max_tokens: 600,
        system: `You produce 3 example role briefs for an Australian SME working in ${industry}. Each brief is one short sentence with: role title - location - contract type - salary range or hourly - 1-3 quick must-haves. Use Australian spelling, plain hyphens (no em-dashes or en-dashes), AUD currency, and locations from the business's state if known. Match the tone and structure of these reference examples:
- "Site Manager, Brisbane - residential builds, full-time, $130k + super."
- "Bookkeeper, Adelaide CBD - 2 days a week, must know Xero and BAS."
- "Registered Nurse, aged-care facility in Geelong - full-time, weekday days."

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
    if (!res || !('content' in res)) return FALLBACK_EXAMPLES
    const toolBlock = res.content.find(b => b.type === 'tool_use')
    if (!toolBlock || toolBlock.type !== 'tool_use') return FALLBACK_EXAMPLES
    const input = toolBlock.input as { examples?: string[] }
    const arr = Array.isArray(input.examples)
      ? input.examples.map(s => String(s).trim()).filter(Boolean)
      : []
    return arr.length === 3 ? arr : FALLBACK_EXAMPLES
  } catch {
    return FALLBACK_EXAMPLES
  }
}
