#!/usr/bin/env node
// Render docs/PILOT-TESTING-GUIDE.html → docs/PILOT-TESTING-GUIDE.pdf.
//
// Run: node scripts/build-pilot-guide-pdf.mjs
//
// Uses the same puppeteer-core + @sparticuz/chromium stack that the
// AI Administrator PDF export route uses, so the local build works
// without installing a full Chromium download.

import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __filename = fileURLToPath(import.meta.url)
const __dirname  = dirname(__filename)
const ROOT       = resolve(__dirname, '..')

const HTML_PATH = resolve(ROOT, 'docs/PILOT-TESTING-GUIDE.html')
const PDF_PATH  = resolve(ROOT, 'docs/PILOT-TESTING-GUIDE.pdf')

async function main() {
  console.log('[pilot-guide-pdf] reading', HTML_PATH)
  const html = await readFile(HTML_PATH, 'utf-8')

  // Local-first: hand puppeteer-core an installed Chrome / Edge so
  // we don't need to download the Sparticuz Linux binary on Windows.
  // Falls back to the Sparticuz path (the prod-route stack) if no
  // local browser is found.
  const puppeteer = await import('puppeteer-core')

  const localCandidates = [
    process.env.CHROME_PATH,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
  ].filter(Boolean)

  const { existsSync } = await import('node:fs')
  let executablePath
  for (const p of localCandidates) {
    if (existsSync(p)) { executablePath = p; break }
  }

  let launchOpts
  if (executablePath) {
    console.log('[pilot-guide-pdf] using local browser:', executablePath)
    launchOpts = {
      executablePath,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      headless: true,
    }
  } else {
    console.log('[pilot-guide-pdf] no local browser found, trying Sparticuz chromium')
    const chromiumMod = await import('@sparticuz/chromium')
    const chromium = chromiumMod.default
    launchOpts = {
      args:            chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath:  await chromium.executablePath(),
      headless:        chromium.headless,
    }
  }

  const browser = await puppeteer.default.launch(launchOpts)

  try {
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'networkidle0' })
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' },
    })
    await writeFile(PDF_PATH, pdf)
    console.log('[pilot-guide-pdf] wrote', PDF_PATH, '(' + pdf.length + ' bytes)')
  } finally {
    await browser.close()
  }
}

main().catch(err => {
  console.error('[pilot-guide-pdf] failed:', err)
  process.exit(1)
})
