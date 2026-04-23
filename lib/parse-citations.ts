export interface Citation {
  n: number
  label: string
  url?: string
}

export interface ParsedCitations {
  cleanText: string
  citations: Citation[]
}

// Matches a trailing fenced ```citations ... ``` block (optional trailing whitespace).
// Non-greedy body; anchored to end-of-string so we only strip a trailing block.
const CITATIONS_BLOCK_RE = /\n*```citations\s*\n([\s\S]*?)\n?```\s*$/

/**
 * Extracts a trailing fenced ```citations``` JSON block from an assistant
 * message. Returns cleanText with the block removed and the parsed citations
 * array. Safe on malformed input — returns {cleanText: text, citations: []}.
 */
export function parseCitations(text: string): ParsedCitations {
  if (!text) return { cleanText: text ?? '', citations: [] }

  const match = text.match(CITATIONS_BLOCK_RE)
  if (!match) return { cleanText: text, citations: [] }

  const jsonBody = match[1]?.trim() ?? ''
  let parsed: unknown
  try {
    parsed = JSON.parse(jsonBody)
  } catch {
    return { cleanText: text, citations: [] }
  }

  if (!Array.isArray(parsed)) {
    return { cleanText: text, citations: [] }
  }

  const citations: Citation[] = []
  for (const item of parsed) {
    if (!item || typeof item !== 'object') continue
    const rec = item as Record<string, unknown>
    const nRaw = rec.n
    const labelRaw = rec.label
    const urlRaw = rec.url

    const n =
      typeof nRaw === 'number'
        ? nRaw
        : typeof nRaw === 'string'
          ? Number(nRaw)
          : NaN
    if (!Number.isFinite(n)) continue
    const label = typeof labelRaw === 'string' ? labelRaw : ''
    if (!label) continue
    const url = typeof urlRaw === 'string' && urlRaw.length > 0 ? urlRaw : undefined

    citations.push({ n, label, url })
  }

  const cleanText = text.replace(CITATIONS_BLOCK_RE, '').trimEnd()
  return { cleanText, citations }
}
