// RAG layer: embed a query, run the `match_knowledge` hybrid search SQL
// function in Supabase, return grounded passages with source metadata.

import { getSupabaseAdmin } from '@/lib/supabase/admin'

// OpenAI text-embedding-3-small — 1536 dims, cheap, good enough for AU
// employment-law corpus. Swap to Voyage-law-2 (1024 dims) later if recall
// is insufficient; see TODO below.
const EMBED_MODEL = 'text-embedding-3-small'
const EMBED_DIMS = 1536

export interface KnowledgeHit {
  id: number
  source: string
  source_url: string | null
  source_title: string
  section: string | null
  content: string
  similarity: number
  hybrid_score: number
  metadata: Record<string, unknown>
}

export interface SearchKnowledgeInput {
  query: string
  topK?: number
  minSimilarity?: number
  sourceFilter?: string          // e.g. 'modern-award:MA000003'
  jurisdictionFilter?: string    // e.g. 'AU', 'QLD'
}

export async function embedQuery(text: string): Promise<number[]> {
  const key = process.env.OPENAI_API_KEY
  if (!key) throw new Error('OPENAI_API_KEY not set — RAG disabled.')
  // TODO(voyage): swap to https://api.voyageai.com/v1/embeddings with
  // `voyage-law-2` for noticeably better legal retrieval. Dims change to 1024,
  // so the knowledge_chunks.embedding column + ivfflat index must be rebuilt.
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({ model: EMBED_MODEL, input: text }),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`OpenAI embeddings ${res.status}: ${body.slice(0, 300)}`)
  }
  const data = (await res.json()) as { data: Array<{ embedding: number[] }> }
  const emb = data.data?.[0]?.embedding
  if (!emb || emb.length !== EMBED_DIMS) {
    throw new Error(`Unexpected embedding shape: length=${emb?.length}`)
  }
  return emb
}

// Per-hit content is truncated to keep total tool_result payload small.
// Long Fair Work Act sections can be 5k+ chars each; with 4 hits that's a
// 20k+ char prompt addition that slows the streaming turn. 1500 chars
// keeps enough context for the model to cite while halving final-turn TTFB.
const MAX_HIT_CONTENT_CHARS = 1500

export async function searchKnowledge(input: SearchKnowledgeInput): Promise<KnowledgeHit[]> {
  const { query, topK = 4, minSimilarity = 0.4, sourceFilter, jurisdictionFilter } = input
  if (!query || !query.trim()) return []

  let embedding: number[]
  try {
    embedding = await embedQuery(query)
  } catch (err) {
    console.warn('[rag] embedQuery failed — returning empty hits:', (err as Error).message)
    return []
  }

  // Use the service-role admin client — match_knowledge needs to read across
  // the whole knowledge_chunks corpus regardless of the caller's RLS context
  // (e.g. eval-bypass requests have no Supabase session at all).
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase.rpc('match_knowledge', {
    query_embedding: embedding as unknown as string, // supabase-js serialises the array
    query_text: query,
    match_count: topK,
    min_similarity: minSimilarity,
    source_filter: sourceFilter ?? null,
    jurisdiction_filter: jurisdictionFilter ?? null,
  })
  if (error) {
    console.warn('[rag] match_knowledge RPC error:', error.message)
    return []
  }
  const hits = (data as KnowledgeHit[]) ?? []
  return hits.map(h => ({
    ...h,
    content: h.content.length > MAX_HIT_CONTENT_CHARS
      ? h.content.slice(0, MAX_HIT_CONTENT_CHARS) + '…'
      : h.content,
  }))
}

// Format hits into a compact string the model can read as a tool_result.
// Keeps a stable schema so the model can cite `[n]` back to each hit.
export function formatHitsForModel(hits: KnowledgeHit[]): string {
  if (!hits.length) return 'No grounded passages matched this query.'
  return hits
    .map((h, i) => {
      const header = `[${i + 1}] ${h.source_title}${h.section ? ' — ' + h.section : ''}`
      const url = h.source_url ? `\nURL: ${h.source_url}` : ''
      return `${header}${url}\n${h.content.trim()}`
    })
    .join('\n\n---\n\n')
}
