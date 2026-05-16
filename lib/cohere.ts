// B11 - Cohere rerank-3 wrapper.
//
// Source: docs/research/2026-05-16_ai-doc-creation-teardown.md
// section 6.6. Reorders the top-K candidates returned by pgvector by
// running them through a cross-encoder, lifting precision at top-4 by
// 20-30% on the mixed AU employment-law corpus.
//
// Single call with topK candidates - no batching needed; rerank-3
// accepts up to 1000 documents per request and we never exceed 20.
//
// Failure mode: if the Cohere call fails (network, rate limit, key
// invalid), the caller in lib/rag.ts catches the throw and falls
// through to the original embed-order top-K. The chat surface never
// breaks just because rerank is unavailable.

import { CohereClient } from 'cohere-ai'
import type { KnowledgeHit } from '@/lib/rag'

const COHERE_MODEL = 'rerank-english-v3.0'

let _client: CohereClient | null = null
function getCohere(): CohereClient {
  if (!_client) {
    const token = process.env.COHERE_API_KEY
    if (!token) throw new Error('COHERE_API_KEY not set - rerank disabled.')
    _client = new CohereClient({ token })
  }
  return _client
}

/**
 * Rerank a list of knowledge hits against the user query and return
 * the top-K most relevant. Preserves the input row metadata; the only
 * thing that changes is the order (and the array is truncated to K).
 */
export async function rerankHits(
  query: string,
  hits: KnowledgeHit[],
  topK: number,
): Promise<KnowledgeHit[]> {
  if (hits.length === 0) return hits
  if (hits.length <= topK) return hits

  const documents = hits.map(h => h.content)
  const res = await getCohere().rerank({
    model: COHERE_MODEL,
    query,
    documents,
    topN: topK,
  })

  // results is sorted high-to-low by relevance_score; pick by index.
  const reordered: KnowledgeHit[] = []
  for (const r of res.results ?? []) {
    const idx = r.index
    if (idx >= 0 && idx < hits.length) {
      reordered.push({
        ...hits[idx],
        // Mix the rerank score in alongside the original embed score
        // so downstream code can introspect the precision lift if
        // useful.
        hybrid_score: r.relevanceScore ?? hits[idx].hybrid_score,
      })
    }
  }
  return reordered.length ? reordered : hits.slice(0, topK)
}
