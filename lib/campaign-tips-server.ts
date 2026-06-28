// Server-only seed reader for the Campaign Coach Tip Bot. Reads the canonical
// JSON (the source of truth) from disk. Kept out of lib/campaign-tips.ts so
// that client bundles (the TipBot component) never pull in fs/path.

import { promises as fs } from 'fs'
import path from 'path'
import type { RecruitmentTip } from './campaign-tips'

let _cache: RecruitmentTip[] | null = null

export async function readSeedTips(): Promise<RecruitmentTip[]> {
  if (_cache) return _cache
  const p = path.join(process.cwd(), 'docs', 'research', 'recruitment-research', 'recruitment-tips.json')
  const raw = await fs.readFile(p, 'utf8')
  const data = JSON.parse(raw)
  _cache = Array.isArray(data) ? data : (data.tips ?? data.data ?? [])
  return _cache!
}
