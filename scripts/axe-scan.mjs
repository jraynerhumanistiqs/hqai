#!/usr/bin/env node
// A5 - axe-core a11y scan runner.
//
// Spawns a dev server on a free port, walks the three high-traffic
// surfaces called out in the brief (/dashboard/people/advisor,
// /dashboard/recruit, /prescreen/<sample>), and reports any axe
// violations.
//
// Mode (matches the recommendation accepted by the founder):
//   - First pass (now): WARNING-ONLY. Logs violations but exits 0.
//   - Subsequent passes: pass --strict to block on serious / critical.
//
// Usage:
//   node scripts/axe-scan.mjs            # warning-only
//   node scripts/axe-scan.mjs --strict   # serious/critical -> exit 1
//   PRESCREEN_SLUG=demo node scripts/axe-scan.mjs
//
// Requires a running app at $BASE_URL (default http://localhost:3000)
// or pass --start to have this script run `npm run dev` for the
// duration of the scan.

import { spawn } from 'node:child_process'
import { setTimeout as wait } from 'node:timers/promises'

const STRICT      = process.argv.includes('--strict')
const START_SERVER = process.argv.includes('--start')
const BASE_URL    = process.env.BASE_URL || 'http://localhost:3000'
const PRESCREEN_SLUG = process.env.PRESCREEN_SLUG || ''

const PAGES = [
  { path: '/dashboard/people/advisor',     label: 'AI Advisor chat' },
  { path: '/dashboard/people/administrator', label: 'AI Administrator' },
  { path: '/dashboard/recruit',            label: 'HQ Recruit hub' },
  ...(PRESCREEN_SLUG ? [{ path: `/prescreen/${PRESCREEN_SLUG}`, label: 'Prescreen candidate' }] : []),
  { path: '/login',  label: 'Login (marketing)' },
  { path: '/privacy', label: 'Privacy page (marketing)' },
]

async function ensureServer() {
  if (!START_SERVER) return null
  console.log('[axe-scan] starting dev server...')
  const child = spawn('npm', ['run', 'dev'], { stdio: 'pipe', shell: true })
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(BASE_URL + '/login', { method: 'HEAD' })
      if (r.ok || r.status === 401 || r.status === 307) {
        console.log('[axe-scan] server ready at', BASE_URL)
        return child
      }
    } catch { /* keep polling */ }
    await wait(1000)
  }
  child.kill()
  throw new Error('dev server did not start within 60s')
}

async function runAxe(url) {
  // Use the @axe-core/cli binary so we don't pull a full headless
  // browser ourselves; it shells out to puppeteer internally.
  return new Promise((resolve, reject) => {
    const args = [url, '--exit']
    const p = spawn('npx', ['@axe-core/cli', ...args], { stdio: ['ignore', 'pipe', 'pipe'], shell: true })
    let out = ''
    let err = ''
    p.stdout.on('data', d => { out += d.toString() })
    p.stderr.on('data', d => { err += d.toString() })
    p.on('close', code => {
      // @axe-core/cli exits non-zero when violations exist - we still
      // want the report. Resolve and let the caller decide.
      resolve({ code, out, err })
    })
    p.on('error', reject)
  })
}

function parseSeverityCounts(text) {
  // The CLI's plain output groups by impact (minor / moderate /
  // serious / critical). We grep for the lines that mention a count.
  const counts = { critical: 0, serious: 0, moderate: 0, minor: 0 }
  const re = /(\d+) violations? .* (critical|serious|moderate|minor) impact/gi
  let m
  while ((m = re.exec(text)) !== null) {
    const sev = m[2].toLowerCase()
    counts[sev] = (counts[sev] || 0) + Number(m[1])
  }
  return counts
}

const child = await ensureServer().catch(err => {
  console.error(err.message); process.exit(2)
})

let aggregate = { critical: 0, serious: 0, moderate: 0, minor: 0 }
for (const { path, label } of PAGES) {
  const url = BASE_URL + path
  process.stdout.write(`[axe-scan] ${label.padEnd(28)} ${url} ... `)
  const { code, out } = await runAxe(url)
  const sev = parseSeverityCounts(out)
  aggregate.critical += sev.critical
  aggregate.serious  += sev.serious
  aggregate.moderate += sev.moderate
  aggregate.minor    += sev.minor
  console.log(`crit=${sev.critical} serious=${sev.serious} moderate=${sev.moderate} minor=${sev.minor} (exit ${code})`)
}

console.log('\n[axe-scan] aggregate:', aggregate)
if (child) child.kill()

if (STRICT && (aggregate.critical + aggregate.serious) > 0) {
  console.error('\n[axe-scan] strict mode: serious/critical violations found. Failing.')
  process.exit(1)
}
console.log('\n[axe-scan] done. (warning-only mode; pass --strict to gate.)')
