// Humanistiqs - Deepgram transcription helper for HQ Recruit
// Phase 1 AI scoring: Nova-3 via REST, input = Cloudflare Stream mp4 URL.
// Env: DEEPGRAM_API_KEY, CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_STREAM_API_TOKEN.

const CF_ACCOUNT = process.env.CLOUDFLARE_ACCOUNT_ID!
const CF_TOKEN   = (process.env.CLOUDFLARE_STREAM_API_TOKEN ?? process.env.CLOUDFLARE_STREAM_TOKEN)!
const DG_KEY     = process.env.DEEPGRAM_API_KEY!

const CF_BASE = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT}/stream`

export interface TranscriptUtterance {
  start: number
  end: number
  speaker: number
  transcript: string
}

export interface TranscriptResult {
  text: string
  utterances: TranscriptUtterance[]
  raw: any
}

async function cfJson(path: string, init?: RequestInit) {
  const res = await fetch(`${CF_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${CF_TOKEN}`,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  })
  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    throw new Error(`Cloudflare ${path} ${res.status}: ${txt}`)
  }
  return res.json()
}

/**
 * Resolve the downloadable mp4 URL for a Cloudflare Stream video.
 * Enables downloads if not already enabled, then polls until ready.
 */
async function resolveMp4Url(uid: string): Promise<string> {
  // Ensure the video itself is ready
  const deadline = Date.now() + 60_000
  while (Date.now() < deadline) {
    const vid = await cfJson(`/${uid}`)
    if (vid?.result?.readyToStream) break
    await new Promise(r => setTimeout(r, 3000))
  }

  // Request downloads endpoint (idempotent: returns the existing URL if ready)
  let dl: any
  try {
    dl = await cfJson(`/${uid}/downloads`, { method: 'POST' })
  } catch {
    dl = await cfJson(`/${uid}/downloads`)
  }

  const mp4Deadline = Date.now() + 60_000
  while (Date.now() < mp4Deadline) {
    const url = dl?.result?.default?.url
    const status = dl?.result?.default?.status
    if (url && (status === 'ready' || status === 'inprogress' && dl?.result?.default?.percentComplete === 100)) {
      return url
    }
    if (url && status === 'ready') return url
    await new Promise(r => setTimeout(r, 3000))
    dl = await cfJson(`/${uid}/downloads`)
  }

  const url = dl?.result?.default?.url
  if (!url) throw new Error('Cloudflare mp4 download URL not ready after 60s')
  return url
}

/**
 * Transcribe an audio file stored in Supabase Storage via Deepgram Nova-3.
 * Uses a signed URL so Deepgram can fetch it without the bucket being
 * public.
 */
export async function transcribeSupabaseAudio(
  signedAudioUrl: string,
): Promise<TranscriptResult> {
  if (!DG_KEY) throw new Error('DEEPGRAM_API_KEY is not set')
  return dgTranscribeUrl(signedAudioUrl)
}

async function dgTranscribeUrl(url: string): Promise<TranscriptResult> {
  const qs = new URLSearchParams({
    model: 'nova-3-general',
    language: 'en-AU',
    diarize: 'true',
    punctuate: 'true',
    smart_format: 'true',
    utterances: 'true',
  }).toString()

  const res = await fetch(`https://api.deepgram.com/v1/listen?${qs}`, {
    method: 'POST',
    headers: {
      Authorization: `Token ${DG_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ url }),
  })
  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    throw new Error(`Deepgram ${res.status}: ${txt}`)
  }
  const raw = await res.json()

  const alt = raw?.results?.channels?.[0]?.alternatives?.[0]
  const text: string = alt?.transcript ?? ''
  const utterancesRaw: any[] = raw?.results?.utterances ?? []
  const utterances: TranscriptUtterance[] = utterancesRaw.map(u => ({
    start: Number(u.start) || 0,
    end: Number(u.end) || 0,
    speaker: Number(u.speaker) || 0,
    transcript: String(u.transcript ?? ''),
  }))

  return { text, utterances, raw }
}

/**
 * Transcribe a Cloudflare Stream video via Deepgram Nova-3 REST API.
 */
export async function transcribeCloudflareVideo(cloudflareUid: string): Promise<TranscriptResult> {
  if (!DG_KEY) throw new Error('DEEPGRAM_API_KEY is not set')

  const mp4Url = await resolveMp4Url(cloudflareUid)
  return dgTranscribeUrl(mp4Url)
}
