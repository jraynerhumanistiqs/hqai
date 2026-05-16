// B12 - Anthropic Message Batches helper.
//
// Source: docs/research/2026-05-16_ai-doc-creation-teardown.md
// section 6.5. 50% cheaper than synchronous Anthropic calls; usable
// for any non-realtime job: eval runs, bulk recruit-campaign analysis,
// scheduled document audits, periodic re-summaries of long candidate
// pools.
//
// Asynchronous by nature - submit returns a batch id, results arrive
// hours later. Use only when the user is NOT actively waiting for the
// answer. Chat and template-fill flows stay on the streaming API.
//
// Minimal surface area on purpose - call sites import { submitBatch,
// getBatch, listBatchResults } and otherwise use the Anthropic SDK's
// standard request shape.

import Anthropic from '@anthropic-ai/sdk'

let _client: Anthropic | null = null
function getAnthropic(): Anthropic {
  if (!_client) {
    const key = process.env.ANTHROPIC_API_KEY
    if (!key) throw new Error('ANTHROPIC_API_KEY not set - batches disabled.')
    _client = new Anthropic({ apiKey: key })
  }
  return _client
}

export type BatchRequest = {
  /** Unique per-batch id - the caller picks this to correlate later. */
  custom_id: string
  /** Standard Anthropic Messages.MessageCreateParams (non-streaming). */
  params: Omit<Anthropic.Messages.MessageCreateParamsNonStreaming, 'stream'>
}

export type BatchHandle = {
  id: string
  status: 'in_progress' | 'canceling' | 'ended'
  request_counts: {
    processing: number
    succeeded: number
    errored: number
    canceled: number
    expired: number
  }
  ended_at: string | null
}

/**
 * Submit a batch of message requests. Returns the batch handle which
 * the caller polls via getBatch. Caps per Anthropic API: 100k
 * requests per batch.
 */
export async function submitBatch(requests: BatchRequest[]): Promise<BatchHandle> {
  if (requests.length === 0) {
    throw new Error('submitBatch requires at least one request.')
  }
  if (requests.length > 100_000) {
    throw new Error(`submitBatch limit is 100k requests; received ${requests.length}.`)
  }
  // The SDK's messages.batches.create accepts the same shape; we keep
  // the wrapper thin so the call site stays close to the SDK docs.
  const res = await getAnthropic().messages.batches.create({
    requests: requests.map(r => ({
      custom_id: r.custom_id,
      params: r.params,
    })),
  })
  return {
    id: res.id,
    status: res.processing_status === 'in_progress' ? 'in_progress'
          : res.processing_status === 'canceling' ? 'canceling'
          : 'ended',
    request_counts: res.request_counts,
    ended_at: res.ended_at ?? null,
  }
}

/** Polls the batch status. Returns null if the batch id is unknown. */
export async function getBatch(batchId: string): Promise<BatchHandle | null> {
  try {
    const res = await getAnthropic().messages.batches.retrieve(batchId)
    return {
      id: res.id,
      status: res.processing_status === 'in_progress' ? 'in_progress'
            : res.processing_status === 'canceling' ? 'canceling'
            : 'ended',
      request_counts: res.request_counts,
      ended_at: res.ended_at ?? null,
    }
  } catch (err) {
    if ((err as { status?: number })?.status === 404) return null
    throw err
  }
}

/**
 * Iterate the results stream for a completed batch. Yields each
 * (custom_id, result) pair. Caller decides what to do with errored
 * requests - they ride in the same stream with a `type: "errored"`
 * shape so the consumer can log + skip.
 */
export async function* listBatchResults(batchId: string): AsyncGenerator<{
  custom_id: string
  result:
    | { type: 'succeeded'; message: Anthropic.Messages.Message }
    | { type: 'errored'; error: { type: string; message: string } }
    | { type: 'canceled' }
    | { type: 'expired' }
}> {
  const stream = await getAnthropic().messages.batches.results(batchId)
  for await (const row of stream) {
    yield row as any
  }
}
