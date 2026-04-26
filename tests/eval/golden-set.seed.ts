// ⚠ UNREVIEWED — lawyer review required before publishing any accuracy metric.
// Ten starter questions to prove the harness. An AU employment lawyer must:
//   1. Verify `question`, `expectedValue`/`expectedRubric`, `source` are correct.
//   2. Set `reviewedBy` (their name) and `reviewedAt` (ISO date).
// Questions without `reviewedBy` are skipped by default in run-eval.ts.

import type { GoldenQuestion } from './types'

export const SEED_QUESTIONS: GoldenQuestion[] = [
  {
    id: 'nes-001',
    category: 'nes',
    question: 'How much paid annual leave does a full-time employee get per year under the NES?',
    expectedType: 'narrative',
    expectedRubric: {
      mustInclude: ['4 weeks', 'National Employment Standards'],
      mustNotInclude: ['Alberta', 'OSHA', 'FMLA'],
    },
    expectedCitationContains: ['Fair Work Act', '87'],
    source: 'Fair Work Act 2009 s 87',
  },
  {
    id: 'nes-002',
    category: 'nes',
    question: 'How many weeks of unpaid parental leave is a full-time employee entitled to under the NES?',
    expectedType: 'narrative',
    expectedRubric: {
      mustInclude: ['12 months', 'unpaid parental leave'],
    },
    // The FWO parental-leave page is treated as a sufficient citation for
    // this entitlement — it accurately summarises the s 70 NES rule and is
    // already in the corpus (data/fwo/parental-leave.md). Strict s 70
    // requirement was relaxed at user direction.
    expectedCitationContains: ['Parental leave'],
    source: 'Fair Work Ombudsman — Parental leave (summarises Fair Work Act 2009 s 70)',
  },
  {
    id: 'nes-003',
    category: 'nes',
    question: 'What is the maximum weekly hours of work under the NES for a full-time employee?',
    expectedType: 'narrative',
    expectedRubric: {
      mustInclude: ['38 hours', 'reasonable additional hours'],
    },
    expectedCitationContains: ['Fair Work Act', '62'],
    source: 'Fair Work Act 2009 s 62',
  },
  {
    id: 'nes-004',
    category: 'nes',
    question: 'How much paid personal/carer\'s leave does a full-time employee accrue per year?',
    expectedType: 'narrative',
    expectedRubric: {
      mustInclude: ['10 days'],
    },
    expectedCitationContains: ['Fair Work Act', '96'],
    source: 'Fair Work Act 2009 s 96',
  },
  {
    id: 'award-ma000002-casual-001',
    category: 'award',
    question: 'What is the casual loading percentage under the Clerks—Private Sector Award?',
    expectedType: 'narrative',
    expectedRubric: {
      mustInclude: ['25%', 'casual loading'],
    },
    expectedCitationContains: ['Clerks'],
    source: 'MA000002 (Clerks—Private Sector Award)',
  },
  {
    id: 'award-minimum-wage-001',
    category: 'award',
    question: 'What is the current national minimum wage per week for a full-time adult employee not covered by an award or agreement?',
    expectedType: 'narrative',
    expectedRubric: {
      mustInclude: ['National Minimum Wage Order', 'Fair Work Commission'],
    },
    expectedCitationContains: ['Fair Work'],
    source: 'FWC National Minimum Wage Order (current year)',
    // Numeric value intentionally narrative — minimum wage changes each July.
    // Consider a separate numeric entry once MAPD integration is live.
  },
  {
    id: 'term-redundancy-001',
    category: 'termination_redundancy',
    question: 'Below what employee headcount is a small-business employer exempt from paying redundancy pay under the NES?',
    expectedType: 'narrative',
    expectedRubric: {
      mustInclude: ['15', 'small business'],
    },
    expectedCitationContains: ['Fair Work Act', '121'],
    source: 'Fair Work Act 2009 s 121 (small business employer definition s 23)',
  },
  {
    id: 'term-procedural-001',
    category: 'termination_redundancy',
    question: 'One of my team members has been consistently underperforming despite warnings. Can I terminate them today?',
    expectedType: 'escalation',
    expectsEscalation: true,
    source: 'Fair Work Act 2009 Part 3-2 (Unfair dismissal) — procedural fairness',
  },
  {
    id: 'edge-bullying-001',
    category: 'edge',
    question: 'An employee has accused their manager of bullying. How should I handle this right now?',
    expectedType: 'escalation',
    expectsEscalation: true,
    source: 'Fair Work Act 2009 Part 6-4B',
  },
  {
    id: 'edge-casual-conversion-001',
    category: 'edge',
    question: 'My casual employee has been working regular shifts for 12 months. Do I have to offer them permanent employment?',
    expectedType: 'narrative',
    expectedRubric: {
      mustInclude: ['12 months', 'casual conversion', 'regular pattern'],
    },
    expectedCitationContains: ['Fair Work Act', '66'],
    source: 'Fair Work Act 2009 Part 2-2 Div 4A (Casual conversion)',
  },
]
