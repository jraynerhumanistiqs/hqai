// Tool definitions for the HQ People chat loop. Two tools keep the model
// honest about facts it cannot safely recite from memory:
//   - get_pay_rate      — deterministic, via FWC MAPD (no RAG, no guessing)
//   - search_knowledge  — hybrid RAG over vetted AU employment-law corpus
//
// The model MUST call a tool before making a numeric claim about pay, and
// SHOULD call search_knowledge before quoting a clause or entitlement.

import Anthropic from '@anthropic-ai/sdk'
import { getPayRate, summarisePayRate, MapdError } from './mapd'
import { searchKnowledge, formatHitsForModel, KnowledgeHit } from './rag'

export const tools: Anthropic.Tool[] = [
  {
    name: 'request_clarification',
    description:
      'Ask the user a SINGLE clarifying question when an entitlement, pay rate, or award question cannot be answered accurately without knowing one more piece of information. Use this BEFORE answering when the user asks something like "what is the minimum pay rate for a teacher" without saying which sector (early childhood, primary, secondary, TAFE, independent school) - or "annual leave for a casual" without specifying if they mean casual loading vs accrual. Returns a structured chip list the UI renders as clickable options. The model should NOT call this if the question is already specific enough to answer from one search.\n\nGood examples to use this for:\n  - "What is the pay rate for a teacher?" -> ask which sector (Early Childhood / Primary or Secondary State School / Catholic or Independent School / TAFE)\n  - "What annual leave does my casual get?" -> ask which entitlement (annual leave accrual / casual loading / personal leave)\n  - "What are the penalty rates?" -> ask which award and shift type\n\nDo NOT use for:\n  - Simple questions with one clear answer\n  - Document generation requests (use form intercept)\n  - High-stakes triage situations (those short-circuit upstream)\n\nThe followUpHint must rephrase the user question as a complete question that incorporates whichever option the user picks. The frontend will substitute "{option}" with the picked label before sending it back as the next user message.',
    input_schema: {
      type: 'object',
      properties: {
        question: {
          type: 'string',
          description: 'One short sentence asking the user which option applies. e.g. "Which teaching sector are you asking about?"',
        },
        options: {
          type: 'array',
          minItems: 2,
          maxItems: 6,
          items: {
            type: 'object',
            properties: {
              label: { type: 'string', description: 'Short option label shown on the chip, e.g. "Primary or Secondary state school".' },
              hint: { type: 'string', description: 'Optional sub-text shown under the label.' },
            },
            required: ['label'],
          },
          description: 'Mutually-exclusive choices the user can click. The user can also type free text - the UI always offers an "Other" free-text option.',
        },
        followUpHint: {
          type: 'string',
          description: 'How the user question would be rephrased once a choice is made. Must include the literal placeholder "{option}". e.g. "What is the minimum pay rate for a {option} teacher?"',
        },
      },
      required: ['question', 'options', 'followUpHint'],
    },
  },
  {
    name: 'get_pay_rate',
    description:
      'Look up the authoritative Modern Award base pay rate for a classification and employment type from the Fair Work Commission Modern Awards Pay Database (MAPD). Use this for any question about how much an employee is entitled to be paid under an award. Do NOT guess dollar figures.',
    input_schema: {
      type: 'object',
      properties: {
        awardCode: {
          type: 'string',
          description: 'Modern Award code, e.g. MA000003 for the General Retail Industry Award.',
        },
        classification: {
          type: 'string',
          description: 'Classification level or title, e.g. "Level 3", "Retail Employee Level 4".',
        },
        employmentType: {
          type: 'string',
          enum: ['full-time', 'part-time', 'casual'],
          description: 'Employment type the rate applies to.',
        },
        date: {
          type: 'string',
          description: 'ISO date (YYYY-MM-DD) the rate should be effective on. Omit for today.',
        },
      },
      required: ['awardCode', 'classification', 'employmentType'],
    },
  },
  {
    name: 'search_knowledge',
    description:
      'Search the HQ.ai grounded knowledge base (Fair Work Act, NES, Modern Awards, Fair Work Ombudsman guidance, internal playbooks) for passages relevant to the user question. Call this BEFORE quoting any clause, entitlement, or procedural step. Returns numbered passages with source titles and URLs that you must cite using [n] markers.\n\nIMPORTANT — query format: keep it SHORT (3-6 keywords max). Drop generic words like "employee", "entitlement", "NES", "National Employment Standards", "full-time", "Australia". Examples:\n  ✓ "annual leave 4 weeks"\n  ✓ "redundancy pay small business"\n  ✓ "casual conversion 12 months"\n  ✗ "what is the annual leave entitlement for a full-time employee under the NES"\n\nIMPORTANT — sourceFilter strategy:\n  • For NES entitlements (annual leave, personal/carer\'s leave, parental leave, max hours, redundancy pay, notice, public holidays, FDV leave) — use sourceFilter="fair-work-act". The Fair Work Act 2009 is the authoritative source for these.\n  • For Modern Award questions (specific industry pay rates, allowances, penalties, classifications) — use sourceFilter="modern-award:<code>" if you know it, otherwise no filter.\n  • For procedural / how-to / Fair Work Ombudsman guidance — no filter is fine.\n\nIf the first search returns no hits, retry with shorter keywords or no sourceFilter.',
    input_schema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Short keyword query, 3-6 terms. e.g. "annual leave 4 weeks", "redundancy small business", "notice period termination".',
        },
        sourceFilter: {
          type: 'string',
          description:
            'Optional exact source filter: "fair-work-ombudsman", "nes", "modern-award:MA000003", etc.',
        },
        jurisdictionFilter: {
          type: 'string',
          description: 'Optional jurisdiction: "AU", "QLD", "NSW", "VIC", etc. Defaults to all.',
        },
      },
      required: ['query'],
    },
  },
]

export interface ToolRunResult {
  toolUseId: string
  name: string
  output: string                    // string the model reads back
  citations: Array<{ n: number; label: string; url?: string; source?: string; chunkId?: number }>
  isError?: boolean
  // Non-standard: when the model calls request_clarification, runTool returns
  // the structured payload here so the route can short-circuit to a SSE
  // clarify event instead of looping back to the model.
  clarify?: {
    question: string
    options: Array<{ label: string; hint?: string }>
    followUpHint: string
  }
}

// Dispatch a single tool call and return a formatted result + any citations
// the front-end should render. Errors are returned as `isError: true` so the
// model can recover gracefully instead of crashing the whole turn.
export async function runTool(
  toolUseId: string,
  name: string,
  input: Record<string, unknown>,
  citationOffset: number,
): Promise<ToolRunResult> {
  try {
    if (name === 'request_clarification') {
      const q = typeof input.question === 'string' ? input.question.trim() : ''
      const opts = Array.isArray(input.options) ? (input.options as Array<{ label?: string; hint?: string }>) : []
      const cleanOpts = opts
        .filter(o => o && typeof o.label === 'string' && o.label.trim().length > 0)
        .slice(0, 6)
        .map(o => ({ label: String(o.label).trim(), hint: o.hint ? String(o.hint).trim() : undefined }))
      const hint = typeof input.followUpHint === 'string' ? input.followUpHint.trim() : ''
      if (!q || cleanOpts.length < 2 || !hint) {
        return {
          toolUseId,
          name,
          output: 'request_clarification called with invalid input - falling back to direct answer.',
          citations: [],
          isError: true,
        }
      }
      return {
        toolUseId,
        name,
        output: `Asked the user: ${q}`,
        citations: [],
        clarify: { question: q, options: cleanOpts, followUpHint: hint },
      }
    }

    if (name === 'get_pay_rate') {
      const rate = await getPayRate({
        awardCode: String(input.awardCode),
        classification: String(input.classification),
        employmentType: input.employmentType as 'full-time' | 'part-time' | 'casual',
        date: input.date ? String(input.date) : undefined,
      })
      const summary = summarisePayRate(rate)
      const n = citationOffset + 1
      return {
        toolUseId,
        name,
        output: `[${n}] ${summary}\nSource: ${rate.source_url}`,
        citations: [
          {
            n,
            label: `${rate.award_name} — ${rate.classification} (${rate.employment_type})`,
            url: rate.source_url,
            source: 'mapd',
          },
        ],
      }
    }

    if (name === 'search_knowledge') {
      const hits = await searchKnowledge({
        query: String(input.query),
        sourceFilter: input.sourceFilter ? String(input.sourceFilter) : undefined,
        jurisdictionFilter: input.jurisdictionFilter ? String(input.jurisdictionFilter) : undefined,
      })
      const citations = hits.map((h, i) => hitToCitation(h, citationOffset + i + 1))
      // Renumber the formatted output so the [n] markers match the citation list.
      const body = hits.length
        ? hits
            .map((h, i) => {
              const n = citationOffset + i + 1
              const header = `[${n}] ${h.source_title}${h.section ? ' — ' + h.section : ''}`
              const url = h.source_url ? `\nURL: ${h.source_url}` : ''
              return `${header}${url}\n${h.content.trim()}`
            })
            .join('\n\n---\n\n')
        : formatHitsForModel([])
      return { toolUseId, name, output: body, citations }
    }

    return {
      toolUseId,
      name,
      output: `Unknown tool: ${name}`,
      citations: [],
      isError: true,
    }
  } catch (err) {
    const msg = err instanceof MapdError ? err.message : (err as Error).message
    return {
      toolUseId,
      name,
      output: `Tool error: ${msg}`,
      citations: [],
      isError: true,
    }
  }
}

function hitToCitation(h: KnowledgeHit, n: number) {
  const label = `${h.source_title}${h.section ? ' — ' + h.section : ''}`
  return {
    n,
    label,
    url: h.source_url ?? undefined,
    source: h.source,
    chunkId: h.id,
  }
}
