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
      'Search the HQ.ai grounded knowledge base (Fair Work Act, NES, Modern Awards, Fair Work Ombudsman guidance, internal playbooks) for passages relevant to the user question. Call this BEFORE quoting any clause, entitlement, or procedural step. Returns numbered passages with source titles and URLs that you must cite using [n] markers.\n\nIMPORTANT: keep the query SHORT (3-6 keywords max). Use the legal/topic terms you actually need to find — not the user\'s full sentence. Drop generic words like "employee", "entitlement", "NES", "National Employment Standards", "full-time", "Australia". Examples:\n  ✓ "annual leave 4 weeks"\n  ✓ "redundancy pay small business"\n  ✓ "casual conversion 12 months"\n  ✗ "what is the annual leave entitlement for a full-time employee under the NES"\nIf the first search returns no hits, retry with even fewer / different keywords.',
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
