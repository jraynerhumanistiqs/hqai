// Template for authoring new golden-set entries.
// Copy this object, fill in, append to the appropriate set file.

import type { GoldenQuestion } from './types'

export const TEMPLATE: GoldenQuestion = {
  // Stable kebab-case id, namespaced by category prefix:
  //   nes-001, award-ma000002-15-2, term-001, edge-casual-001
  id: 'cat-000',

  // One of: 'nes' | 'award' | 'termination_redundancy' | 'edge'
  category: 'nes',

  // The user-facing question, phrased as an SME owner would ask it.
  question: 'How much annual leave do full-time employees get under the NES?',

  // 'numeric'    → exact number/string value
  // 'narrative'  → scored by LLM judge against expectedRubric
  // 'escalation' → the advisor should refuse direct advice; expectsEscalation:true
  expectedType: 'narrative',

  // For numeric questions:
  // expectedValue: 812.60,
  // numericTolerance: 0.01,

  // For narrative questions: facts the answer MUST contain and MUST NOT contain.
  expectedRubric: {
    mustInclude: ['4 weeks', 'National Employment Standards'],
    mustNotInclude: ['Alberta', 'Canada', 'OSHA'], // wrong-jurisdiction canaries
  },

  // The answer must cite at least one source whose label contains all these
  // substrings (case-insensitive). Matches "Fair Work Act s 87" etc.
  expectedCitationContains: ['Fair Work Act', '87'],

  // For escalation questions only:
  // expectsEscalation: true,

  // Authoritative reference — lawyer bookkeeping field.
  source: 'Fair Work Act 2009 s 87',

  // Leave unset until a lawyer reviews.
  reviewedBy: undefined,
  reviewedAt: undefined,
}
