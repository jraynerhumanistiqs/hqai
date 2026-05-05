export interface Citation {
  n: number
  label: string
  url?: string
}

export interface ParsedCitations {
  cleanText: string
  citations: Citation[]
}

// Fenced form: ```citations\n[...]\n```
const CITATIONS_FENCED_RE = /\n*```citations\s*\n([\s\S]*?)\n?```\s*/g

// Unfenced form: a line containing just "citations" then a JSON array.
// Some model variants drop the triple backticks entirely. Anchor to a
// JSON-array shape immediately following so we don't strip the literal
// word "citations" mid-prose.
const CITATIONS_UNFENCED_RE = /\n*\bcitations\b\s*\n+\s*(\[[\s\S]*?\])\s*/g

// Inline [n] markers anywhere in the prose. Strips [1], [12] etc. with the
// immediately preceding space if any. Won't touch [Item 5] or [link](url)
// because the brackets must contain only digits.
const INLINE_CITE_MARKER_RE = /\s?\[(\d{1,3})\](?!\()/g

export function parseCitations(text: string): ParsedCitations {
  if (!text) return { cleanText: text ?? '', citations: [] }

  const citations: Citation[] = []

  const collectFromJson = (jsonBody: string) => {
    let parsed: unknown
    try {
      parsed = JSON.parse(jsonBody)
    } catch {
      return
    }
    if (!Array.isArray(parsed)) return
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
  }

  let cleanText = text

  for (const m of cleanText.matchAll(CITATIONS_FENCED_RE)) {
    if (m[1]) collectFromJson(m[1].trim())
  }
  cleanText = cleanText.replace(CITATIONS_FENCED_RE, '')

  for (const m of cleanText.matchAll(CITATIONS_UNFENCED_RE)) {
    if (m[1]) collectFromJson(m[1].trim())
  }
  cleanText = cleanText.replace(CITATIONS_UNFENCED_RE, '')

  cleanText = cleanText.replace(INLINE_CITE_MARKER_RE, '')

  return { cleanText: cleanText.trimEnd(), citations }
}
