// B1 (prepared, not yet wired) - Voyage AI embeddings client.
//
// `voyage-law-2` is tuned for legal / statutory text and is reported to
// improve recall on Fair Work + Modern Awards corpora by roughly 10%
// compared with OpenAI's text-embedding-3-small (current default in
// lib/rag.ts). The model returns 1024-dim vectors, NOT the 1536 dims
// lib/rag.ts currently consumes.
//
// This module is intentionally NOT imported by lib/rag.ts yet. The flip
// is a three-step migration:
//   1. Provision VOYAGE_API_KEY in Vercel + .env.local.
//   2. Apply supabase/migrations/knowledge_chunks_voyage_dim.sql to drop
//      the 1536-dim column and recreate it at 1024 dims.
//   3. Re-run scripts/ingest/ingest-{awards,fwo,act}.ts using this
//      module instead of lib/rag.ts:embedQuery.
// Only after step 3 lands should lib/rag.ts:embedQuery be repointed at
// embedQueryVoyage below. Running the swap out of order will produce a
// dim-mismatch error from pgvector and the chat will silently lose RAG.

const VOYAGE_MODEL = 'voyage-law-2'
export const VOYAGE_EMBED_DIMS = 1024

export interface VoyageEmbedOptions {
  /**
   * Whether the input is a search query (true) or a document being
   * ingested (false). Voyage exposes per-mode optimised representations
   * via the `input_type` field. Default is 'document' so the ingest
   * scripts can call this without an extra flag.
   */
  inputType?: 'query' | 'document'
}

interface VoyageEmbedResponse {
  data: Array<{ embedding: number[]; index: number }>
  model: string
  usage?: { total_tokens?: number }
}

/**
 * Embeds a single string with voyage-law-2. Throws on missing env var
 * or non-2xx response so call sites can decide whether to fall back to
 * OpenAI embeddings (lib/rag.ts retains that fallback today).
 */
export async function embedTextVoyage(
  text: string,
  options: VoyageEmbedOptions = {},
): Promise<number[]> {
  const key = process.env.VOYAGE_API_KEY
  if (!key) {
    throw new Error('VOYAGE_API_KEY not set - cannot embed with voyage-law-2.')
  }
  const res = await fetch('https://api.voyageai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: VOYAGE_MODEL,
      input: text,
      input_type: options.inputType ?? 'document',
    }),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Voyage embeddings ${res.status}: ${body.slice(0, 300)}`)
  }
  const data = (await res.json()) as VoyageEmbedResponse
  const emb = data.data?.[0]?.embedding
  if (!emb || emb.length !== VOYAGE_EMBED_DIMS) {
    throw new Error(`Unexpected Voyage embedding shape: length=${emb?.length}`)
  }
  return emb
}

/**
 * Batch variant - used by the ingest scripts which embed thousands of
 * chunks. Voyage accepts up to 128 inputs per request; the caller is
 * responsible for chunking beyond that.
 */
export async function embedBatchVoyage(
  texts: string[],
  options: VoyageEmbedOptions = {},
): Promise<number[][]> {
  const key = process.env.VOYAGE_API_KEY
  if (!key) {
    throw new Error('VOYAGE_API_KEY not set - cannot embed with voyage-law-2.')
  }
  if (texts.length === 0) return []
  if (texts.length > 128) {
    throw new Error(`Voyage embed batch limit is 128 inputs; received ${texts.length}.`)
  }
  const res = await fetch('https://api.voyageai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: VOYAGE_MODEL,
      input: texts,
      input_type: options.inputType ?? 'document',
    }),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Voyage embeddings batch ${res.status}: ${body.slice(0, 300)}`)
  }
  const data = (await res.json()) as VoyageEmbedResponse
  const sorted = [...data.data].sort((a, b) => a.index - b.index)
  return sorted.map(d => d.embedding)
}
