import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import type { Rubric, RubricCriterion } from '@/lib/cv-screening-types'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 60

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const MODEL = 'claude-sonnet-4-20250514'

interface CreateBody {
  label: string
  source_jd?: string
  campaign_id?: string
  rubric?: Rubric
}

export async function GET(_req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('businesses(id)')
    .eq('id', user.id)
    .single()
  const businessId = (profile?.businesses as unknown as { id: string } | null)?.id ?? null
  if (!businessId) return NextResponse.json({ rubrics: [] })

  const { data, error } = await supabaseAdmin
    .from('cv_custom_rubrics')
    .select('id, label, label_family, parent_rubric_id, version_number, rubric, created_at')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ rubrics: data ?? [] })
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('businesses(id)')
      .eq('id', user.id)
      .single()
    const businessId = (profile?.businesses as unknown as { id: string } | null)?.id ?? null
    if (!businessId) return NextResponse.json({ error: 'No business profile' }, { status: 400 })

    const body = await req.json() as CreateBody

    let rubric: Rubric | null = body.rubric ?? null
    let sourceJd = body.source_jd ?? null

    // If a campaign_id was given, pull its job-ad copy as the JD source.
    let campaignId: string | null = null
    if (body.campaign_id) {
      campaignId = body.campaign_id
      const { data: campaign } = await supabaseAdmin
        .from('campaigns')
        .select('role_profile, job_ad_draft')
        .eq('id', body.campaign_id)
        .single()
      if (campaign) {
        const ad = campaign.job_ad_draft as { body?: string; title?: string } | null
        const role = campaign.role_profile as { title?: string } | null
        sourceJd = `${role?.title ?? ad?.title ?? ''}\n\n${ad?.body ?? ''}`.trim() || sourceJd
      }
    }

    if (!rubric && sourceJd) {
      rubric = await suggestRubricFromJd(sourceJd, body.label)
    }
    if (!rubric) {
      return NextResponse.json({ error: 'Provide either a rubric, a source_jd, or a campaign_id' }, { status: 400 })
    }

    const { data: inserted, error } = await supabaseAdmin
      .from('cv_custom_rubrics')
      .insert({
        business_id: businessId,
        user_id: user.id,
        label: body.label || rubric.role,
        rubric,
        source_jd: sourceJd,
        source_campaign_id: campaignId,
      })
      .select('id, label, rubric, created_at')
      .single()
    if (error) {
      console.error('[cv-screening/rubrics] insert', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ rubric: inserted })
  } catch (err) {
    console.error('[cv-screening/rubrics POST]', err)
    const detail = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: 'Failed to create rubric', detail }, { status: 500 })
  }
}

async function suggestRubricFromJd(jd: string, label: string): Promise<Rubric> {
  const tool = {
    name: 'submit_rubric',
    description: 'Return a structured 6-8 criterion scoring rubric tuned to the supplied job ad.',
    input_schema: {
      type: 'object' as const,
      properties: {
        role: { type: 'string', description: 'Short role title for the rubric.' },
        criteria: {
          type: 'array',
          minItems: 6,
          maxItems: 8,
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'snake_case identifier.' },
              label: { type: 'string', description: 'Human-readable criterion name.' },
              weight: { type: 'number', description: '0.05 to 0.30. All weights across criteria must sum to 1.00.' },
              type: { type: 'string', enum: ['ordinal_5', 'binary'] },
              anchors: {
                type: 'object',
                properties: {
                  '1': { type: 'string' },
                  '3': { type: 'string' },
                  '5': { type: 'string' },
                },
              },
              evidence_required: { type: 'boolean' },
              hard_gate: { type: 'boolean', description: 'true only for binary location/work-rights criteria.' },
            },
            required: ['id', 'label', 'weight', 'type'],
          },
        },
      },
      required: ['role', 'criteria'],
    },
  }

  const res = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 2048,
    system: `You design CV-scoring rubrics for Australian SMEs. You are given a job ad and you produce a 6-8 criterion weighted rubric tuned to that role. Rules:
- Total weight across criteria must sum to exactly 1.00.
- Always include exactly one binary hard_gate criterion called "location_eligibility" with weight 0.10 covering AU work rights and location requirements.
- Other criteria are ordinal_5 with anchors at 1, 3, and 5 levels written as one-line discriminators.
- Pick the 5-7 things from the ad that actually matter. Don't pad.
- Use Australian English (organise, behaviour, recognise). No em-dashes or en-dashes - plain hyphens only.
- Anchors must reference observable CV evidence (years of experience, specific certifications, deliverable scope), not aspirational descriptions.
- For contract roles, do not include tenure_stability as a criterion.

Output only via the submit_rubric tool.`,
    tools: [tool],
    tool_choice: { type: 'tool', name: 'submit_rubric' },
    messages: [{
      role: 'user',
      content: `Rubric label: ${label || '(unnamed)'}\n\nJob ad / role description:\n\n${jd}`,
    }],
  })

  const toolBlock = res.content.find(b => b.type === 'tool_use')
  if (!toolBlock || toolBlock.type !== 'tool_use') {
    throw new Error('Rubric generator did not return tool_use')
  }
  const input = toolBlock.input as { role?: string; criteria?: Array<Partial<RubricCriterion>> }
  const criteria: RubricCriterion[] = (input.criteria ?? []).map((c, i) => ({
    id: c.id ?? `crit_${i}`,
    label: c.label ?? `Criterion ${i + 1}`,
    weight: typeof c.weight === 'number' ? c.weight : 0.1,
    type: c.type === 'binary' ? 'binary' : 'ordinal_5',
    anchors: c.anchors ?? undefined,
    evidence_required: c.evidence_required ?? undefined,
    hard_gate: c.hard_gate ?? undefined,
  }))

  // Normalise weights so they sum to 1.0 in case the model drifted.
  const total = criteria.reduce((acc, c) => acc + c.weight, 0)
  if (total > 0 && Math.abs(total - 1) > 0.01) {
    criteria.forEach(c => { c.weight = Number((c.weight / total).toFixed(3)) })
  }

  const hardGates = criteria.filter(c => c.hard_gate).map(c => c.id)

  return {
    rubric_id: `custom_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    role: input.role ?? label ?? 'Custom role',
    country: 'AU',
    version: 1,
    criteria,
    minimum_score_to_advance: 3.4,
    hard_gates: hardGates,
    blind_fields: ['name', 'photo', 'address', 'dob', 'gender_inferred', 'graduation_year', 'school_name'],
  }
}
