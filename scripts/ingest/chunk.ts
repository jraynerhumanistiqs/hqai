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

// ---------------------------------------------------------------------------
// Section-aware chunker for legislation.
//
// Used for Acts (Fair Work Act etc.) where the document has a strong
// section-number structure. One chunk per section ensures the embedding
// reflects only that section's content — vital because (a) cosine similarity
// over a smeared 800-token chunk dilutes specific clauses, and (b) the model
// can confidently cite "s 87" when the chunk is *only* s 87.
//
// Behaviour:
//   - Drops table-of-contents lines (heading text followed by a tab + page
//     number, or trailing whitespace + page number).
//   - Detects anchors like "87 Entitlement to annual leave",
//     "87A Entitlement to annual leave (mining)", "Division 6—Annual leave",
//     "Subdivision A—Application", "Part 2-2—The National Employment Standards".
//   - Section anchors are the primary chunk boundary. Division/Subdivision/Part
//     headers travel with the next section as context.
//   - Sections longer than HARD_MAX tokens split on subsection markers
//     "(1)", "(2)" with the section heading repeated at the top of each split.
// ---------------------------------------------------------------------------

const ACT_HARD_MAX_TOKENS = 1500
const ACT_SOFT_MIN_TOKENS = 50           // very tiny sections are merged with prev

const SECTION_RE  = /^(\d+[A-Z]{0,4})\s{1,4}([A-Z][^\n]{2,})$/
const DIVISION_RE = /^(Division\s+\d+[A-Z]?[—\-].*|Part\s+\S+[—\-].*|Subdivision\s+[A-Z][A-Z]?[—\-].*|Schedule\s+\d+.*|Chapter\s+\d+.*)$/i
const SUBSECTION_RE = /^\((\d+[A-Z]?|[a-z]+)\)\s+/

function isTocLine(line: string): boolean {
  // Examples:
  //   "87\tEntitlement to annual leave\t218"
  //   "87  Entitlement to annual leave   218"
  //   "Division 6—Annual leave   218"
  // Real headings end with text, not a page number.
  return /\s+\d{1,4}\s*$/.test(line) && /^(\d+[A-Z]*\s|Division|Part|Subdivision|Schedule|Chapter)/i.test(line)
}

export function chunkAct(raw: string, opts?: { defaultSection?: string }): Chunk[] {
  const text = raw.replace(/\r\n/g, '\n')

  // Pre-filter ToC lines and obvious page-number cruft.
  const lines: string[] = []
  for (const ln of text.split('\n')) {
    const t = ln.trim()
    if (!t) { lines.push(''); continue }
    if (isTocLine(t)) continue
    if (/^\d{1,4}$/.test(t)) continue           // bare page number lines
    if (/^Compilation No\./.test(t)) continue
    if (/^Authorised Version/.test(t)) continue
    lines.push(ln)
  }

  // Walk lines; cut a section every time we hit a section anchor.
  type Acc = { heading: string; division?: string; body: string[] }
  const sections: Acc[] = []
  let pendingDivision: string | undefined
  let cur: Acc | null = null

  const startSection = (heading: string) => {
    if (cur) sections.push(cur)
    cur = { heading, division: pendingDivision, body: [] }
    pendingDivision = undefined            // consume division header
  }

  for (const ln of lines) {
    const t = ln.trim()
    const sec = SECTION_RE.exec(t)
    const div = !sec && DIVISION_RE.test(t)
    if (sec) {
      startSection(`${sec[1]}  ${sec[2].trim()}`)
      continue
    }
    if (div) {
      pendingDivision = t
      continue
    }
    if (!cur) {
      // Pre-amble before the first section — start an unnamed bucket.
      cur = { heading: opts?.defaultSection ?? 'Preamble', division: pendingDivision, body: [] }
      pendingDivision = undefined
    }
    cur.body.push(ln)
  }
  if (cur) sections.push(cur)

  // Build chunks. Each section becomes one chunk unless oversized.
  const chunks: Chunk[] = []

  for (const s of sections) {
    const body = s.body.join('\n').trim()
    if (!body) continue                         // skip empty sections (ToC residue)

    const headingLine = s.heading
    const divisionLine = s.division ? s.division + '\n\n' : ''
    const sectionLabel = `s ${s.heading.split(/\s{2,}/)[0]} — ${s.heading.split(/\s{2,}/).slice(1).join(' ')}`.trim()

    const fullContent = `${divisionLine}${headingLine}\n\n${body}`
    const tokens = approxTokens(fullContent)

    if (tokens <= ACT_HARD_MAX_TOKENS) {
      chunks.push({ content: fullContent, section: sectionLabel, tokenCount: tokens })
      continue
    }

    // Oversized: split on subsection markers, repeat the heading at the top.
    const subBuckets: string[][] = [[]]
    for (const ln of body.split('\n')) {
      if (SUBSECTION_RE.test(ln.trim()) && subBuckets[subBuckets.length - 1].length) {
        subBuckets.push([])
      }
      subBuckets[subBuckets.length - 1].push(ln)
    }

    let buf: string[] = []
    let bufTokens = 0
    const flushBuf = (partIdx: number) => {
      if (!buf.length) return
      const content = `${divisionLine}${headingLine}${partIdx > 0 ? `  (continued, part ${partIdx + 1})` : ''}\n\n${buf.join('\n').trim()}`
      chunks.push({ content, section: sectionLabel, tokenCount: approxTokens(content) })
      buf = []
      bufTokens = 0
    }

    let partIdx = 0
    for (const sub of subBuckets) {
      const subText = sub.join('\n')
      const subTokens = approxTokens(subText)
      if (bufTokens + subTokens > ACT_HARD_MAX_TOKENS && buf.length) {
        flushBuf(partIdx++)
      }
      buf.push(subText)
      bufTokens += subTokens
    }
    flushBuf(partIdx)
  }

  // Merge tiny trailing chunks (rare — usually pure ToC residue) into the
  // previous chunk so we don't pollute the index with one-line entries.
  return chunks.filter(c => c.tokenCount >= ACT_SOFT_MIN_TOKENS || c.content.length > 200)
}
