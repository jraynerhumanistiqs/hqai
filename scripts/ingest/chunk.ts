// Clause-preserving text chunker.
// Splits on paragraph + bullet + numbered-clause boundaries, then greedily
// packs ~800 tokens per chunk with ~100-token overlap so retrieval doesn't
// slice a sentence mid-way.

const AVG_CHARS_PER_TOKEN = 4            // rough; good enough for sizing
const TARGET_TOKENS = 800
const OVERLAP_TOKENS = 100

export interface Chunk {
  content: string
  section?: string
  tokenCount: number
}

export function chunkText(raw: string, opts?: { section?: string }): Chunk[] {
  const text = raw.replace(/\r\n/g, '\n').trim()
  if (!text) return []

  // 1. Split into "units" at paragraph / clause boundaries. Preserve short
  // section headers attached to the following paragraph.
  const units: string[] = []
  let buf = ''
  for (const line of text.split(/\n/)) {
    const trimmed = line.trim()
    if (!trimmed) {
      if (buf.trim()) { units.push(buf.trim()); buf = '' }
      continue
    }
    // Numbered-clause break ("1.", "12.3", "(a)", "Section 87"), etc.
    if (/^(\(\w+\)|\d+\.|\d+\.\d+|Section \d+|Clause \d+|Part \w+)/i.test(trimmed) && buf.trim()) {
      units.push(buf.trim())
      buf = ''
    }
    buf += (buf ? '\n' : '') + trimmed
  }
  if (buf.trim()) units.push(buf.trim())

  // 2. Greedy pack into ~TARGET_TOKENS chunks with overlap.
  const chunks: Chunk[] = []
  let current: string[] = []
  let currentTokens = 0

  const flush = () => {
    if (!current.length) return
    const content = current.join('\n\n')
    chunks.push({ content, section: opts?.section, tokenCount: approxTokens(content) })
    // Retain the tail ~OVERLAP_TOKENS worth for the next chunk
    const tail: string[] = []
    let tailTokens = 0
    for (let i = current.length - 1; i >= 0 && tailTokens < OVERLAP_TOKENS; i--) {
      tail.unshift(current[i])
      tailTokens += approxTokens(current[i])
    }
    current = tail
    currentTokens = tailTokens
  }

  for (const u of units) {
    const t = approxTokens(u)
    if (currentTokens + t > TARGET_TOKENS && current.length) flush()
    current.push(u)
    currentTokens += t
  }
  if (current.length) {
    const content = current.join('\n\n')
    chunks.push({ content, section: opts?.section, tokenCount: approxTokens(content) })
  }
  return chunks
}

export function approxTokens(text: string): number {
  return Math.max(1, Math.round(text.length / AVG_CHARS_PER_TOKEN))
}
