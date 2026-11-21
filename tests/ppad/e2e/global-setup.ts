/**
 * Warms the route before the suite runs.
 *
 * Next compiles a route on its first request. Without this the first few
 * tests race that compile and fail on a timeout, which looks exactly like a
 * real failure and moves around between runs - 4 failures on a cold run, 0
 * on the next, with nothing changed. Fetching each asset once up front
 * removes the race rather than papering over it with retries.
 */
export default async function globalSetup() {
  const base = process.env.PPAD_E2E_BASE_URL || 'http://localhost:3000'
  const paths = ['/tools/ppad/app.html', '/tools/ppad/app.js', '/tools/ppad/app.css', '/tools/ppad/ppad-store.js']
  const deadline = Date.now() + 120_000

  for (const p of paths) {
    for (;;) {
      try {
        const res = await fetch(base + p)
        if (res.ok) { await res.text(); break }
      } catch { /* server not up yet */ }
      if (Date.now() > deadline) throw new Error(`warmup timed out on ${p}`)
      await new Promise(r => setTimeout(r, 500))
    }
  }
}
