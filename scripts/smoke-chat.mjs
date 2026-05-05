// Demo-day smoke test for /api/chat. Hits the deployed route with 10
// representative queries and asserts each lands under SOFT_LIMIT_MS without
// hanging or producing a server error event.
//
// Usage:
//   BASE_URL=https://hqai.vercel.app EVAL_BYPASS_TOKEN=xxx node scripts/smoke-chat.mjs
//
// EVAL_BYPASS_TOKEN must match the env var on the deployment. Without it the
// route will 401 because there's no real Supabase session.

const BASE_URL = process.env.BASE_URL || 'https://hqai.vercel.app'
const TOKEN = process.env.EVAL_BYPASS_TOKEN
const SOFT_LIMIT_MS = 60_000
const HARD_LIMIT_MS = 90_000

if (!TOKEN) {
  console.error('Set EVAL_BYPASS_TOKEN to the value configured on the deployment.')
  process.exit(2)
}

const CASES = [
  { tier: 'A', q: 'What is the minimum wage in NSW?' },
  { tier: 'A', q: 'What is the casual loading rate?' },
  { tier: 'A', q: 'How much annual leave does a part-time employee get?' },
  { tier: 'B', q: 'Can I terminate someone in their probation period?' },
  { tier: 'B', q: 'What is the redundancy pay scale for an employee with 4 years service?' },
  { tier: 'B', q: 'What notice period applies to a permanent full-time employee with 6 years service?' },
  { tier: 'TRIAGE-V', q: 'My site supervisor slid a battery operated grinder along an employees neck as a joke. What now?' },
  { tier: 'TRIAGE-MH', q: 'An employee just told their manager they want to end their life.' },
  { tier: 'TRIAGE-VISA', q: 'Can I sponsor a 482 visa for our new chef?' },
  { tier: 'TRIAGE-DISC', q: 'I only want to hire men for this role. Help me word the ad.' },
]

async function runOne({ tier, q }) {
  const started = Date.now()
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), HARD_LIMIT_MS)

  let firstByteAt = 0
  let doneAt = 0
  let serverError = null
  let escalate = null
  let triageHit = false
  let textChars = 0

  try {
    const res = await fetch(`${BASE_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Eval-Token': TOKEN,
      },
      signal: controller.signal,
      body: JSON.stringify({
        messages: [{ role: 'user', content: q }],
        module: 'people',
      }),
    })
    if (!res.ok) {
      return { tier, q, ok: false, reason: `HTTP ${res.status}`, ms: Date.now() - started }
    }
    const reader = res.body.getReader()
    const decoder = new TextDecoder('utf-8')
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      if (!firstByteAt) firstByteAt = Date.now()
      const chunk = decoder.decode(value, { stream: true })
      for (const line of chunk.split('\n')) {
        if (!line.startsWith('data: ')) continue
        try {
          const data = JSON.parse(line.slice(6))
          if (typeof data.text === 'string') textChars += data.text.length
          if (data.error) serverError = `${data.error}${data.detail ? ': ' + data.detail : ''}`
          if (data.triage) triageHit = true
          if (data.done) {
            doneAt = Date.now()
            escalate = !!data.escalate
          }
        } catch {}
      }
    }
  } catch (err) {
    return { tier, q, ok: false, reason: `abort/error: ${err?.name || err?.message || err}`, ms: Date.now() - started }
  } finally {
    clearTimeout(timeout)
  }

  const totalMs = (doneAt || Date.now()) - started
  const within = totalMs < SOFT_LIMIT_MS
  const okText = textChars > 20 || triageHit
  const noError = !serverError

  let ok = within && okText && noError
  let reason = ok ? 'pass' : [
    !within && `over ${SOFT_LIMIT_MS}ms (${totalMs}ms)`,
    !okText && `no usable text (${textChars} chars, triage=${triageHit})`,
    !noError && `server error: ${serverError}`,
  ].filter(Boolean).join('; ')

  return {
    tier, q, ok, reason,
    ms: totalMs,
    ttfb: firstByteAt ? firstByteAt - started : null,
    chars: textChars,
    triage: triageHit,
    escalate,
  }
}

async function main() {
  console.log(`Smoke test against ${BASE_URL}`)
  console.log('=' .repeat(70))
  const results = []
  for (const c of CASES) {
    process.stdout.write(`[${c.tier.padEnd(11)}] ${c.q.slice(0, 60).padEnd(60)} ... `)
    const r = await runOne(c)
    results.push(r)
    console.log(r.ok ? `PASS ${r.ms}ms` : `FAIL ${r.ms}ms (${r.reason})`)
  }
  const passed = results.filter(r => r.ok).length
  const failed = results.length - passed
  console.log('=' .repeat(70))
  console.log(`${passed}/${results.length} pass | ${failed} fail`)
  console.log(`p50 latency: ${median(results.map(r => r.ms))}ms`)
  console.log(`p95 latency: ${percentile(results.map(r => r.ms), 95)}ms`)
  console.log(`max latency: ${Math.max(...results.map(r => r.ms))}ms`)
  process.exit(failed > 0 ? 1 : 0)
}

function median(arr) {
  const s = [...arr].sort((a, b) => a - b)
  return s[Math.floor(s.length / 2)]
}
function percentile(arr, p) {
  const s = [...arr].sort((a, b) => a - b)
  return s[Math.min(s.length - 1, Math.floor(s.length * p / 100))]
}

main().catch(err => {
  console.error('Smoke test crashed:', err)
  process.exit(2)
})
