// Quick local probe of chunkAct against the FWA volumes. Not committed.
import mammoth from 'mammoth'
import { chunkAct } from './ingest/chunk'

async function main() {
  for (const file of ['C2026C00141VOL01.docx', 'C2026C00141VOL02.docx', 'C2026C00141VOL03.docx']) {
    const path = `./data/act/${file}`
    const { value } = await mammoth.extractRawText({ path })
    const cleaned = value
      .replace(/Authorised Version[^\n]*\n?/g, '')
      .replace(/Compilation No\.[^\n]*\n?/g, '')
      .replace(/^\s*Fair Work Act 2009\s*$/gm, '')
      .replace(/\n{3,}/g, '\n\n').trim()
    const chunks = chunkAct(cleaned)
    console.log(`\n=== ${file} ===`)
    console.log(`chunks: ${chunks.length}`)
    const tokenSizes = chunks.map(c => c.tokenCount)
    tokenSizes.sort((a, b) => a - b)
    console.log(`token range: min=${tokenSizes[0]} median=${tokenSizes[Math.floor(tokenSizes.length / 2)]} max=${tokenSizes[tokenSizes.length - 1]}`)
    console.log(`avg: ${Math.round(tokenSizes.reduce((s, x) => s + x, 0) / tokenSizes.length)}`)
  }

  console.log('\n--- Probe key sections ---')
  const probes: Array<[string, RegExp]> = [
    ['s 62 (max hours)', /^s 62\s/],
    ['s 70 (parental leave)', /^s 70\s/],
    ['s 87 (annual leave 4 weeks)', /^s 87\s/],
    ['s 96 (personal leave 10 days)', /^s 96\s/],
    ['s 119 (redundancy)', /^s 119\s/],
    ['s 121 (small business)', /^s 121\s/],
  ]

  for (const file of ['C2026C00141VOL01.docx']) {
    const { value } = await mammoth.extractRawText({ path: `./data/act/${file}` })
    const cleaned = value
      .replace(/Authorised Version[^\n]*\n?/g, '')
      .replace(/Compilation No\.[^\n]*\n?/g, '')
      .replace(/^\s*Fair Work Act 2009\s*$/gm, '')
      .replace(/\n{3,}/g, '\n\n').trim()
    const chunks = chunkAct(cleaned)
    for (const [label, re] of probes) {
      const hits = chunks.filter(c => re.test(c.section || ''))
      console.log(`\n${label}: ${hits.length} chunk(s)`)
      hits.forEach((c, i) => {
        console.log(`  [${i}] ${c.tokenCount} tokens — section="${c.section}"`)
        console.log('    ' + c.content.slice(0, 400).replace(/\n/g, '\n    '))
      })
    }
  }
}

main().catch(e => { console.error(e); process.exit(1) })
