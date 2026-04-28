// POST /api/campaign/draft — runs the AI turn for whichever Campaign Coach
// step is currently active. Streams SSE: status pulse, then incremental
// partials (best-effort), then a final `done` with the typed output.
//
// Step 1 (Brief → Extract): RoleBrief.raw_text → RoleProfile + AwardSuggestion.
//                            search_knowledge tool wired in for award grounding.
// Step 2 (Extract → Draft):  RoleProfile → JobAdDraft.
// Step 3 (Draft → Coach):    JobAdDraft → CoachScore (rolling).
// Step 4 (Distribution):     RoleProfile + partial DistributionPlan → DistributionPlan w/ rationales.

import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { tools as chatTools, runTool } from '@/lib/chat-tools'
import { NextRequest } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 180

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const MODEL = 'claude-sonnet-4-20250514'

const STATUS_PHRASES: Record<1 | 2 | 3 | 4, string[]> = {
  1: [
    'Reading through this now…',
    "Got it — let me figure out what we're hiring for.",
    'Pulling out the key bits…',
  ],
  2: [
    'Drafting the ad now.',
    'Putting words to paper for you.',
    'Cool, writing it up.',
  ],
  3: [
    'Quick once-over for tone and inclusivity.',
    'Scoring this against best practice.',
  ],
  4: [
    'Working out where to post this.',
    'Lining up the boards now.',
  ],
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

type Business = { name: string; industry: string; state: string }

function systemPromptForStep(
  step: 1 | 2 | 3 | 4,
  business: Business,
): string {
  const businessLine = `You are coaching ${business.name} (industry: ${business.industry}, primary state: ${business.state}). Voice: first-person, warm, concise. Use Australian English. Never refer to yourself as "the Coach" — speak as "I".`

  if (step === 1) {
    return `${businessLine}

You are HQ.ai's Campaign Coach. The user has given you a free-text brief about a role they want to hire. Your job is to extract a structured RoleProfile AND suggest an Australian Modern Award classification.

You MUST call the \`search_knowledge\` tool to ground the award suggestion in the Fair Work Act / Modern Awards corpus before finalising the AwardSuggestion. Use a short keyword query (e.g. "clerks award level 4", "building construction onsite award").

After tool use, respond with EXACTLY ONE JSON object inside a single \`\`\`json fenced code block. No prose before or after. The object must have this shape:
{
  "role_profile": RoleProfile,
  "award_suggestion": AwardSuggestion | null
}

RoleProfile fields:
- title (string), alt_titles (string[] for board SEO, 2-4 items)
- level: "entry" | "mid" | "senior" | "lead" | "manager"
- contract_type: "permanent_ft" | "permanent_pt" | "fixed_term" | "casual" | "contract"
- hours_per_week (number, optional)
- location: { suburb, state (NSW|VIC|QLD|SA|WA|TAS|ACT|NT), postcode?, remote: "no"|"hybrid"|"full" }
- salary: { min, max, currency: "AUD", super_inclusive: boolean, source: "user" | "estimate" }
- must_have_skills (string[], 3-7 items)
- nice_to_have_skills (string[])
- team_context (string, optional)
- start_date ("asap" | ISO date, optional)
- eeo_flags (string[]) — list any AU-prohibited-grounds risk phrases you noticed in the brief; empty array if none.

AwardSuggestion fields:
- code (e.g. "MA000020"), name, classification (e.g. "Level 3"), min_weekly_rate (AUD, integer), source_url (FWA reference), confidence (0-1).
If you genuinely cannot pin an award, return null for award_suggestion.`
  }

  if (step === 2) {
    return `${businessLine}

You are drafting a job ad as composable blocks for the Campaign Coach Step 3 wizard. The user has confirmed a RoleProfile. Produce a JobAdDraft.

Tone: warm, plain-English, Australian. Avoid US-centric phrasing ("EEO", "veteran status"). Avoid passive voice. Lead with what the role does, not the company.

Respond with EXACTLY ONE JSON object inside a single \`\`\`json fenced code block. No prose before or after. Shape:
{
  "blocks": {
    "overview": string,                                   // 2-3 sentences
    "about_us": string,                                    // 2-3 sentences about the business
    "responsibilities": string[],                          // 5-8 bullet strings
    "requirements": { "must": string[], "nice": string[] },// must mirrors role_profile.must_have_skills
    "benefits": string[],                                  // 3-6 items
    "apply_cta": string                                    // 1 sentence
  },
  "meta": { "word_count": number, "reading_grade": number }
}

reading_grade is an approximate Flesch-Kincaid grade level (integer 6-12 typical).`
  }

  if (step === 3) {
    return `${businessLine}

You are scoring a draft job ad against best practice for Australian SMEs. Be honest — under-praising is fine, over-praising is not.

Respond with EXACTLY ONE JSON object inside a single \`\`\`json fenced code block. No prose before or after. Shape (CoachScore):
{
  "overall": number,           // 0-100
  "inclusivity": number,       // 0-100, AU prohibited-grounds + gendered language
  "clarity": number,           // 0-100, plain English, scannable
  "legal": number,             // 0-100, FWA / NES compliance signal
  "attractiveness": number,    // 0-100, would a passive candidate click?
  "warnings": [
    {
      "block": "overview" | "about_us" | "responsibilities" | "requirements" | "benefits" | "apply_cta",
      "severity": "info" | "warn" | "error",
      "message": string,
      "suggestion": string | undefined
    }
  ]
}

Cap warnings at 8. Lead with the highest-severity items.`
  }

  // step 4
  return `${businessLine}

You are recommending a job-board distribution plan for an Australian SME. The user has supplied a RoleProfile and (optionally) a partial DistributionPlan. Annotate or build the plan with rationales tuned to AU SME reality (SEEK is dominant; Indeed is a useful free supplement; LinkedIn is high-cost-low-ROI for trades/blue-collar; Jora is free via aggregator if we have a careers microsite; HQ.ai careers is always-on and free).

Respond with EXACTLY ONE JSON object inside a single \`\`\`json fenced code block. No prose before or after. Shape (DistributionPlan):
{
  "boards": [
    {
      "id": "seek"|"indeed"|"linkedin"|"jora"|"careerone"|"ethicaljobs"|"hqai_careers",
      "method": "deep_link"|"api"|"copy_paste"|"internal",
      "estimated_cost_aud": number | undefined,
      "rationale": string,
      "prefill_url": string | undefined
    }
  ],
  "total_estimated_cost_aud": number
}

Always include "hqai_careers" with method: "internal", cost 0. Recommend SEEK for almost every role. Suppress LinkedIn for trades/casual/hospitality unless the user explicitly asked.`
}

function userPromptForStep(step: 1 | 2 | 3 | 4, body: any): string {
  if (step === 1) {
    const raw = body?.brief?.raw_text ?? ''
    return `Brief from the hiring manager:\n\n"""\n${raw}\n"""\n\nExtract the RoleProfile and (after calling search_knowledge) the AwardSuggestion. Return the single JSON object as instructed.`
  }
  if (step === 2) {
    return `Confirmed RoleProfile (JSON):\n\n${JSON.stringify(body?.role_profile ?? {}, null, 2)}\n\nDraft the JobAdDraft now.`
  }
  if (step === 3) {
    return `JobAdDraft to score (JSON):\n\n${JSON.stringify(body?.job_ad_draft ?? {}, null, 2)}\n\nReturn the CoachScore as instructed.`
  }
  return `RoleProfile (JSON):\n\n${JSON.stringify(body?.role_profile ?? {}, null, 2)}\n\nReturn the DistributionPlan as instructed.`
}

// Tool definitions used as STRUCTURED OUTPUTS for steps 2/3/4. The
// model is forced (via tool_choice) to call exactly one of these and
// the `input` it produces IS the typed result we return to the client.
function stepStructuredTool(step: 1 | 2 | 3 | 4): any {
  if (step === 2) {
    return {
      name: 'submit_job_ad_draft',
      description: 'Submit the drafted job ad as composable blocks.',
      input_schema: {
        type: 'object',
        properties: {
          blocks: {
            type: 'object',
            properties: {
              overview: { type: 'string' },
              about_us: { type: 'string' },
              responsibilities: { type: 'array', items: { type: 'string' } },
              requirements: {
                type: 'object',
                properties: {
                  must: { type: 'array', items: { type: 'string' } },
                  nice: { type: 'array', items: { type: 'string' } },
                },
                required: ['must', 'nice'],
              },
              benefits: { type: 'array', items: { type: 'string' } },
              apply_cta: { type: 'string' },
            },
            required: ['overview', 'about_us', 'responsibilities', 'requirements', 'benefits', 'apply_cta'],
          },
          meta: {
            type: 'object',
            properties: {
              word_count: { type: 'number' },
              reading_grade: { type: 'number' },
            },
            required: ['word_count', 'reading_grade'],
          },
        },
        required: ['blocks', 'meta'],
      },
    }
  }
  if (step === 3) {
    return {
      name: 'submit_coach_score',
      description: 'Submit the coach score and warnings for this draft.',
      input_schema: {
        type: 'object',
        properties: {
          overall: { type: 'number' },
          inclusivity: { type: 'number' },
          clarity: { type: 'number' },
          legal: { type: 'number' },
          attractiveness: { type: 'number' },
          warnings: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                block: { type: 'string' },
                severity: { type: 'string', enum: ['info', 'warn', 'error'] },
                message: { type: 'string' },
                suggestion: { type: 'string' },
              },
              required: ['block', 'severity', 'message'],
            },
          },
        },
        required: ['overall', 'inclusivity', 'clarity', 'legal', 'attractiveness', 'warnings'],
      },
    }
  }
  // step 4
  return {
    name: 'submit_distribution_plan',
    description: 'Submit the distribution plan with board recommendations.',
    input_schema: {
      type: 'object',
      properties: {
        boards: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                enum: ['seek', 'indeed', 'linkedin', 'jora', 'careerone', 'ethicaljobs', 'hqai_careers'],
              },
              method: {
                type: 'string',
                enum: ['deep_link', 'api', 'copy_paste', 'internal'],
              },
              estimated_cost_aud: { type: 'number' },
              rationale: { type: 'string' },
              prefill_url: { type: 'string' },
            },
            required: ['id', 'method', 'rationale'],
          },
        },
        total_estimated_cost_aud: { type: 'number' },
      },
      required: ['boards', 'total_estimated_cost_aud'],
    },
  }
}

function extractJson(raw: string): unknown | null {
  // Prefer the first ```json fenced block; fall back to first {...} blob.
  const fence = raw.match(/```json\s*([\s\S]*?)```/i)
  const candidate = fence ? fence[1] : (() => {
    const open = raw.indexOf('{')
    const close = raw.lastIndexOf('}')
    return open >= 0 && close > open ? raw.slice(open, close + 1) : ''
  })()
  if (!candidate.trim()) return null
  try { return JSON.parse(candidate) } catch { return null }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorised' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const body = await req.json().catch(() => ({}))
    const step = Number(body?.step) as 1 | 2 | 3 | 4
    if (!step || step < 1 || step > 4) {
      return new Response(JSON.stringify({ error: 'step must be 1, 2, 3, or 4' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const business: Business = {
      name: String(body?.business?.name ?? 'Unknown'),
      industry: String(body?.business?.industry ?? 'General'),
      state: String(body?.business?.state ?? 'QLD'),
    }

    const systemPrompt = systemPromptForStep(step, business)
    const userMsg = userPromptForStep(step, body)

    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        const send = (obj: Record<string, unknown>) =>
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`))

        // Immediate status pulse so the UI lights up.
        send({ status: 'thinking', message: pick(STATUS_PHRASES[step]) })

        try {
          const working: Array<{ role: 'user' | 'assistant'; content: any }> = [
            { role: 'user', content: userMsg },
          ]

          // Step 1: use a structured-output tool to guarantee shape.
          // Anthropic's tool_use with a tool_choice forces the model to
          // emit a tool_use block whose input matches our JSON schema —
          // no fragile prose-+-JSON parsing. We don't actually run the
          // tool; we just read its `input` as the typed result.
          if (step === 1) {
            const submitProfile: any = {
              name: 'submit_role_profile',
              description: 'Submit the extracted role profile and award classification.',
              input_schema: {
                type: 'object',
                properties: {
                  role_profile: {
                    type: 'object',
                    properties: {
                      title: { type: 'string' },
                      alt_titles: { type: 'array', items: { type: 'string' } },
                      level: { type: 'string', enum: ['entry', 'mid', 'senior', 'lead', 'manager'] },
                      contract_type: {
                        type: 'string',
                        enum: ['permanent_ft', 'permanent_pt', 'fixed_term', 'casual', 'contract'],
                      },
                      hours_per_week: { type: 'number' },
                      location: {
                        type: 'object',
                        properties: {
                          suburb: { type: 'string' },
                          state: { type: 'string', enum: ['NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS', 'ACT', 'NT'] },
                          postcode: { type: 'string' },
                          remote: { type: 'string', enum: ['no', 'hybrid', 'full'] },
                        },
                        required: ['suburb', 'state', 'remote'],
                      },
                      salary: {
                        type: 'object',
                        properties: {
                          min: { type: 'number' },
                          max: { type: 'number' },
                          currency: { type: 'string' },
                          super_inclusive: { type: 'boolean' },
                          source: { type: 'string', enum: ['user', 'estimate'] },
                        },
                        required: ['min', 'max', 'currency', 'super_inclusive', 'source'],
                      },
                      must_have_skills: { type: 'array', items: { type: 'string' } },
                      nice_to_have_skills: { type: 'array', items: { type: 'string' } },
                      team_context: { type: 'string' },
                      eeo_flags: { type: 'array', items: { type: 'string' } },
                    },
                    required: ['title', 'alt_titles', 'level', 'contract_type', 'location', 'salary', 'must_have_skills', 'nice_to_have_skills', 'eeo_flags'],
                  },
                  award_suggestion: {
                    type: 'object',
                    properties: {
                      code: { type: 'string' },
                      name: { type: 'string' },
                      classification: { type: 'string' },
                      min_weekly_rate: { type: 'number' },
                      source_url: { type: 'string' },
                      confidence: { type: 'number' },
                    },
                  },
                },
                required: ['role_profile'],
              },
            }
            const res = await anthropic.messages.create({
              model: MODEL,
              max_tokens: 2048,
              system: systemPrompt,
              tools: [submitProfile],
              tool_choice: { type: 'tool', name: 'submit_role_profile' },
              messages: working,
            })
            const toolUse = (res.content as any[]).find(b => b.type === 'tool_use')
            const output = toolUse?.input ?? null
            console.log('[campaign/draft] step 1 structured output:', output ? 'OK' : 'FAILED', 'stop:', res.stop_reason)
            if (!output) {
              // Surface what the model actually returned so the wizard can
              // show it inline. Includes stop_reason, content-block types,
              // and any plain text the model emitted instead of using the
              // forced tool.
              const contentSummary = (res.content as any[]).map(b => ({
                type: b.type,
                text: b.type === 'text' ? String(b.text || '').slice(0, 600) : undefined,
                tool_name: b.type === 'tool_use' ? b.name : undefined,
              }))
              send({
                done: true,
                output: {
                  _parseFailed: true,
                  _stop_reason: res.stop_reason,
                  _content: contentSummary,
                  _model: MODEL,
                },
              })
            } else {
              send({ done: true, output })
            }
            controller.close()
            return
          }

          // Steps 2/3/4 — same structured-output pattern. Force the model
          // to emit a single tool_use block whose `input` IS the typed
          // result. No JSON-parsing fragility.
          const stepTool = stepStructuredTool(step)
          const res = await anthropic.messages.create({
            model: MODEL,
            max_tokens: 4096,
            system: systemPrompt,
            tools: [stepTool],
            tool_choice: { type: 'tool', name: stepTool.name },
            messages: working,
          })
          const toolUse2 = (res.content as any[]).find(b => b.type === 'tool_use')
          const output2 = toolUse2?.input ?? null
          console.log(`[campaign/draft] step ${step} structured output:`, output2 ? 'OK' : 'FAILED', 'stop:', res.stop_reason)
          send({ done: true, output: output2 ?? { _parseFailed: true } })
          controller.close()
        } catch (err) {
          const detail = err instanceof Error ? err.message : String(err)
          const stack = err instanceof Error
            ? err.stack?.split('\n').slice(0, 4).join(' | ')
            : undefined
          console.error('[campaign/draft] stream error:', detail, stack)
          // Send BOTH a soft error chunk AND a `done` with the error in
          // the output payload — so the wizard's diagnostic dump shows
          // exactly what blew up server-side instead of `null`.
          send({ error: 'Stream error', detail })
          send({
            done: true,
            output: { _parseFailed: true, _error: detail, _stack: stack },
          })
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    })
  } catch (err) {
    console.error('[campaign/draft] fatal:', err)
    return new Response(JSON.stringify({ error: 'Server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
