// Client-safe rubric summaries.
//
// This is the ONLY rubric data the CV-screening client should import. It is a
// stripped, client-rendered view (role + criteria {id,label,weight,type,
// hard_gate}) generated from the full server-side library by
// scripts/gen-rubric-summaries.ts. Importing it keeps the heavy library
// (data/rubrics/au-industry-role-rubrics.json + the taxonomy + all server-only
// metadata: anchors, gate_tokens, execution guards, sources, awards, ...) OUT
// of the browser bundle.
//
// Do NOT import lib/cv-screening-rubrics or lib/rubrics-au from client
// components - those pull the full library into the bundle. Regenerate this
// file (npm run gen:rubric-summaries or the tsx script) whenever the rubric
// library changes; a CI check should assert it is in sync.
import type { Rubric } from '../cv-screening-types'
import rawSummaries from '../../data/rubrics/rubric-summaries.json'

export const RUBRIC_SUMMARIES: Rubric[] = rawSummaries as unknown as Rubric[]

export function getRubricSummary(id: string): Rubric | null {
  return RUBRIC_SUMMARIES.find(r => r.rubric_id === id) ?? null
}
