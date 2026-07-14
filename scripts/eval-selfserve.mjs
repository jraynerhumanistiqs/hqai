#!/usr/bin/env node
// scripts/eval-selfserve.mjs
//
// Automated runner for the self-serve sales-flow eval suite (eval.json at
// the repo root). Plain Node (18+, global fetch) - no dependencies.
//
// Usage:
//   node scripts/eval-selfserve.mjs [baseUrl]
//   EVAL_BASE_URL=http://localhost:3000 node scripts/eval-selfserve.mjs
//   npm run eval:selfserve [-- http://localhost:3000]
//
// Exits 0 only when every case passes. Redirect cases are fetched with
// redirect: 'manual' so the raw status + Location header can be asserted.
//
// Assertion types (each strictly binary pass/fail):
//   status             { equals } | { oneOf: [...] }
//   redirect-location  { contains } | { equals }   (Location header)
//   json-field         { field, equals } | { field, contains }
//   json-field-one-of  { field, oneOf: [...] }
//   body-contains      { value }
//   body-not-contains  { value }
//   header-contains    { header, value }
//
// Body handling: an object body is JSON.stringified; a string body is sent
// raw (used for malformed-JSON cases). The literal token __PAD_<n>__
// anywhere in a body expands to n 'x' characters (oversized-payload case).

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const suitePath = join(__dirname, '..', 'eval.json')

const suite = JSON.parse(readFileSync(suitePath, 'utf8'))
const baseUrl = (process.argv[2] || process.env.EVAL_BASE_URL || suite.baseUrl || 'http://localhost:3000')
  .replace(/\/+$/, '')

const PAD_RE = /__PAD_(\d+)__/g
function expandPads(s) {
  return s.replace(PAD_RE, (_, n) => 'x'.repeat(Number(n)))
}

function buildBody(body) {
  if (body === undefined || body === null) return undefined
  const raw = typeof body === 'string' ? body : JSON.stringify(body)
  return expandPads(raw)
}

function getField(obj, path) {
  // Supports dotted paths ("a.b.c") for nested JSON fields.
  return path.split('.').reduce((o, k) => (o && typeof o === 'object' ? o[k] : undefined), obj)
}

function checkAssertion(a, ctx) {
  const { status, headers, bodyText, json, jsonError } = ctx
  switch (a.type) {
    case 'status': {
      if (Array.isArray(a.oneOf)) {
        return a.oneOf.includes(status)
          ? { pass: true }
          : { pass: false, detail: `status ${status} not in [${a.oneOf.join(', ')}]` }
      }
      return status === a.equals
        ? { pass: true }
        : { pass: false, detail: `expected status ${a.equals}, got ${status}` }
    }
    case 'redirect-location': {
      const loc = headers.get('location') || ''
      if (!loc) return { pass: false, detail: 'no Location header on response' }
      if (a.equals !== undefined) {
        return loc === a.equals
          ? { pass: true }
          : { pass: false, detail: `Location "${loc}" !== "${a.equals}"` }
      }
      return loc.includes(a.contains)
        ? { pass: true }
        : { pass: false, detail: `Location "${loc}" does not contain "${a.contains}"` }
    }
    case 'json-field': {
      if (jsonError) return { pass: false, detail: `response is not JSON (${jsonError})` }
      const v = getField(json, a.field)
      if (a.equals !== undefined) {
        return v === a.equals
          ? { pass: true }
          : { pass: false, detail: `field "${a.field}" = ${JSON.stringify(v)}, expected ${JSON.stringify(a.equals)}` }
      }
      if (a.contains !== undefined) {
        return typeof v === 'string' && v.includes(a.contains)
          ? { pass: true }
          : { pass: false, detail: `field "${a.field}" = ${JSON.stringify(v)} does not contain "${a.contains}"` }
      }
      return { pass: false, detail: 'json-field assertion needs equals or contains' }
    }
    case 'json-field-one-of': {
      if (jsonError) return { pass: false, detail: `response is not JSON (${jsonError})` }
      const v = getField(json, a.field)
      return Array.isArray(a.oneOf) && a.oneOf.includes(v)
        ? { pass: true }
        : { pass: false, detail: `field "${a.field}" = ${JSON.stringify(v)} not in ${JSON.stringify(a.oneOf)}` }
    }
    case 'body-contains': {
      return bodyText.includes(a.value)
        ? { pass: true }
        : { pass: false, detail: `body does not contain ${JSON.stringify(a.value)}` }
    }
    case 'body-not-contains': {
      if (!bodyText.includes(a.value)) return { pass: true }
      const i = bodyText.indexOf(a.value)
      const around = bodyText.slice(Math.max(0, i - 60), i + 60).replace(/\s+/g, ' ')
      return { pass: false, detail: `body contains forbidden ${JSON.stringify(a.value)} near: ...${around}...` }
    }
    case 'header-contains': {
      const h = headers.get(a.header) || ''
      return h.toLowerCase().includes(String(a.value).toLowerCase())
        ? { pass: true }
        : { pass: false, detail: `header "${a.header}" = "${h}" does not contain "${a.value}"` }
    }
    default:
      return { pass: false, detail: `unknown assertion type "${a.type}"` }
  }
}

async function runCase(c) {
  const url = baseUrl + c.input.path
  const method = c.input.method || 'GET'
  const body = buildBody(c.input.body)
  const headers = { ...(c.input.headers || {}) }
  if (body !== undefined && !Object.keys(headers).some(h => h.toLowerCase() === 'content-type')) {
    headers['Content-Type'] = 'application/json'
  }

  let res
  try {
    res = await fetch(url, { method, headers, body, redirect: 'manual' })
  } catch (err) {
    return {
      id: c.id, name: c.name, category: c.category, pass: false,
      failures: [`request failed: ${err.message}`],
    }
  }

  const bodyText = await res.text()
  let json, jsonError
  try {
    json = JSON.parse(bodyText)
  } catch (err) {
    jsonError = err.message
  }

  const ctx = { status: res.status, headers: res.headers, bodyText, json, jsonError }
  const failures = []
  for (const a of c.assertions) {
    const r = checkAssertion(a, ctx)
    if (!r.pass) failures.push(`[${a.type}] ${r.detail}`)
  }
  return { id: c.id, name: c.name, category: c.category, pass: failures.length === 0, failures }
}

function pad(s, n) {
  s = String(s)
  return s.length >= n ? s : s + ' '.repeat(n - s.length)
}

async function main() {
  console.log(`\nSuite: ${suite.suite} v${suite.version}`)
  console.log(`Base URL: ${baseUrl}`)
  console.log(`Cases: ${suite.cases.length}\n`)

  // Sanity ping so a dead server fails fast with a clear message.
  try {
    await fetch(baseUrl + '/', { method: 'HEAD', redirect: 'manual' })
  } catch (err) {
    console.error(`Cannot reach ${baseUrl} (${err.message}). Start the dev server first: npm run dev`)
    process.exit(2)
  }

  const results = []
  for (const c of suite.cases) {
    results.push(await runCase(c)) // sequential: keeps dev-server compile noise deterministic
  }

  const idW = Math.max(4, ...results.map(r => r.id.length))
  const catW = Math.max(8, ...results.map(r => r.category.length))
  console.log(`${pad('ID', idW)}  ${pad('CATEGORY', catW)}  ${pad('RESULT', 6)}  NAME`)
  console.log('-'.repeat(idW + catW + 60))
  for (const r of results) {
    console.log(`${pad(r.id, idW)}  ${pad(r.category, catW)}  ${pad(r.pass ? 'PASS' : 'FAIL', 6)}  ${r.name}`)
    if (!r.pass) {
      for (const f of r.failures) console.log(`${' '.repeat(idW + catW + 4)}-> ${f}`)
    }
  }

  const passed = results.filter(r => r.pass).length
  const failed = results.length - passed
  console.log('-'.repeat(idW + catW + 60))
  console.log(`\n${passed}/${results.length} passed, ${failed} failed\n`)
  process.exit(failed === 0 ? 0 : 1)
}

main().catch(err => {
  console.error('Runner crashed:', err)
  process.exit(2)
})
