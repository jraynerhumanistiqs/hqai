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

          // Step 1 gets the search_knowledge tool for award grounding.
          // One tool iteration max, then forced final-answer turn.
          if (step === 1) {
            const tools = chatTools.filter(t => t.name === 'search_knowledge')
            const MAX_ITERS = 1
            let citationOffset = 0
            for (let iter = 0; iter <= MAX_ITERS; iter++) {
              const isFinal = iter === MAX_ITERS
              const res = await anthropic.messages.create({
                model: MODEL,
                max_tokens: 2048,
                system: systemPrompt,
                tools,
                tool_choice: isFinal ? { type: 'none' } : { type: 'auto' },
                messages: working,
              })
              if (res.stop_reason !== 'tool_use' || isFinal) {
                const text = res.content
                  .filter((b: any) => b.type === 'text')
                  .map((b: any) => b.text)
                  .join('')
                const parsed = extractJson(text)
                console.log('[campaign/draft] step 1 final, parsed:', parsed ? 'OK' : 'FAILED', 'text-len:', text.length)
                if (!parsed) {
                  console.log('[campaign/draft] step 1 raw text preview:', text.slice(0, 500))
                }
                if (parsed) send({ partial: parsed })
                send({ done: true, output: parsed ?? { raw: text, _parseFailed: true } })
                controller.close()
                return
              }
              working.push({ role: 'assistant', content: res.content })
              const toolUseBlocks = res.content.filter((b: any) => b.type === 'tool_use') as Array<{
                type: 'tool_use'; id: string; name: string; input: Record<string, unknown>
              }>
              const results = await Promise.all(
                toolUseBlocks.map((tu, i) =>
                  runTool(tu.id, tu.name, tu.input, citationOffset + i * 16),
                ),
              )
              const toolResults = toolUseBlocks.map((tu, i) => ({
                type: 'tool_result' as const,
                tool_use_id: tu.id,
                content: results[i].output,
                is_error: results[i].isError,
              }))
              citationOffset += results.reduce((acc, r) => acc + r.citations.length, 0)
              working.push({ role: 'user', content: toolResults })
            }
            return
          }

          // Steps 2/3/4 — single non-streaming call, then emit partial+done.
          // We don't true-stream JSON here because partials are unparseable
          // until the closing brace; UX-wise the status pulse covers latency.
          const res = await anthropic.messages.create({
            model: MODEL,
            max_tokens: 4096,
            system: systemPrompt,
            messages: working,
          })
          const text = (res.content as any[])
            .filter(b => b.type === 'text')
            .map(b => b.text)
            .join('')
          const parsed = extractJson(text)
          if (parsed) send({ partial: parsed })
          send({ done: true, output: parsed ?? { raw: text } })
          controller.close()
        } catch (err) {
          const detail = err instanceof Error ? err.message : String(err)
          console.error('[campaign/draft] stream error:', detail)
          send({ error: 'Stream error', detail })
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
