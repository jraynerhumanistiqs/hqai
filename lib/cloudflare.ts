// Humanistiqs — Cloudflare Stream utilities
// Used by the Video Pre-Screen feature in HQ Recruit

const CF_ACCOUNT = process.env.CLOUDFLARE_ACCOUNT_ID!
const CF_TOKEN   = process.env.CLOUDFLARE_STREAM_TOKEN!
const CF_BASE    = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT}/stream`

/**
 * Request a one-time direct upload URL from Cloudflare Stream.
 * Candidates upload video blobs directly to this URL —
 * no video data passes through this server.
 */
export async function getDirectUploadUrl(): Promise<{ uploadUrl: string; uid: string }> {
  const res = await fetch(`${CF_BASE}/direct_upload`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${CF_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      maxDurationSeconds: 300,
      requireSignedURLs: false,
      meta: { source: 'hqai-prescreen' },
    }),
  })
  if (!res.ok) throw new Error(`Cloudflare upload URL error: ${res.status}`)
  const data = await res.json()
  return { uploadUrl: data.result.uploadURL, uid: data.result.uid }
}

/**
 * Generate a temporary signed download URL for a video (expires 1 hour).
 */
export async function getSignedDownloadUrl(videoId: string): Promise<string> {
  const res = await fetch(`${CF_BASE}/${videoId}/token`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${CF_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 }),
  })
  if (!res.ok) throw new Error(`Cloudflare token error: ${res.status}`)
  const data = await res.json()
  return `https://watch.cloudflarestream.com/${videoId}?token=${data.result.token}`
}

/**
 * Returns the iframe embed src for a Cloudflare Stream video.
 */
export function streamEmbedUrl(videoId: string): string {
  return `https://iframe.cloudflarestream.com/${videoId}`
}
