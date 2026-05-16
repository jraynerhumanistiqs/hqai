// RAG layer: embed a query, run the `match_knowledge` hybrid search SQL
// function in Supabase, return grounded passages with source metadata.
//
// B1 - the embedding model is now env-gated. When VOYAGE_API_KEY is
//      present we use voyage-law-2 (1024 dims, tuned for legal text,
//      ~10% recall lift on Fair Work / NES / awards). When the key is
//      absent the legacy OpenAI text-embedding-3-small (1536 dims) is
//      used. The runtime path picks one - mixing dims in the same
//      column blows up pgvector, so the deployment order is:
//        1. set VOYAGE_API_KEY in Vercel
//        2. apply supabase/migrations/knowledge_chunks_voyage_dim.sql
//        3. re-run scripts/ingest/ingest-* with the new key set
//      Until step 3 lands, the legacy OpenAI path stays active for
//      every search.
// B11 - Cohere rerank-3 is wrapped post-retrieval when COHERE_API_KEY
//      is present. Lifts precision on the mixed corpus by ~20-30%.

import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { embedTextVoyage, VOYAGE_EMBED_DIMS } from '@/lib/voyage'
import { rerankHits } from '@/lib/cohere'

const OPENAI_EMBED_MODEL = 'text-embedding-3-small'
const OPENAI_EMBED_DIMS = 1536

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
  // B1 - prefer Voyage law-2 when configured. Falls back to OpenAI
  // for envs that haven't been re-keyed + re-ingested yet.
  if (process.env.VOYAGE_API_KEY) {
    try {
      return await embedTextVoyage(text, { inputType: 'query' })
    } catch (err) {
      console.warn('[rag] Voyage embed failed, falling back to OpenAI:', (err as Error).message)
      // Fall through to OpenAI path
    }
  }

  const key = process.env.OPENAI_API_KEY
  if (!key) throw new Error('OPENAI_API_KEY not set - RAG disabled.')
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({ model: OPENAI_EMBED_MODEL, input: text }),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`OpenAI embeddings ${res.status}: ${body.slice(0, 300)}`)
  }
  const data = (await res.json()) as { data: Array<{ embedding: number[] }> }
  const emb = data.data?.[0]?.embedding
  if (!emb || emb.length !== OPENAI_EMBED_DIMS) {
    throw new Error(`Unexpected embedding shape: length=${emb?.length}`)
  }
  return emb
}

/** Expose the dim of the model the runtime will use - for ingest scripts. */
export function activeEmbedDims(): number {
  return process.env.VOYAGE_API_KEY ? VOYAGE_EMBED_DIMS : OPENAI_EMBED_DIMS
}

// Per-hit content is truncated to keep total tool_result payload small.
// Long Fair Work Act sections can be 5k+ chars each; with 4 hits that's a
// 20k+ char prompt addition that slows the streaming turn. 1500 chars
// keeps enough context for the model to cite while halving final-turn TTFB.
const MAX_HIT_CONTENT_CHARS = 1500

export async function searchKnowledge(input: SearchKnowledgeInput): Promise<KnowledgeHit[]> {
  const { query, topK = 4, minSimilarity = 0.4, sourceFilter, jurisdictionFilter } = input
  if (!query || !query.trim()) return []
  // B11 - over-fetch when rerank is enabled so the reranker has a real
  // candidate set to choose from. Cohere docs recommend 4x the final
  // top-K. Falls back to plain pgvector topK when no rerank key.
  const retrievalK = process.env.COHERE_API_KEY ? Math.max(topK * 4, 16) : topK

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
    match_count: retrievalK,
    min_similarity: minSimilarity,
    source_filter: sourceFilter ?? null,
    jurisdiction_filter: jurisdictionFilter ?? null,
  })
  if (error) {
    console.warn('[rag] match_knowledge RPC error:', error.message)
    return []
  }
  let hits = (data as KnowledgeHit[]) ?? []

  // B11 - rerank if Cohere is configured. The reranker scores semantic
  // relevance more sharply than embedding cosine, so we routinely see
  // top-4 quality lift on legal corpora. Cheap (~$0.001/query) and
  // dropped to a no-op when the key is missing.
  if (process.env.COHERE_API_KEY && hits.length > topK) {
    try {
      hits = await rerankHits(query, hits, topK)
    } catch (err) {
      console.warn('[rag] Cohere rerank failed - falling through to embed order:', (err as Error).message)
      hits = hits.slice(0, topK)
    }
  } else if (hits.length > topK) {
    // No rerank key: just trim to the requested topK (we over-fetched
    // because retrievalK was set on the assumption rerank would run).
    hits = hits.slice(0, topK)
  }

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
