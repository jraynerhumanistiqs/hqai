'use client'
import { useState } from 'react'

interface Topic {
  id: string
  emoji: string
  title: string
  questions: string[]
}

const TOPICS: Topic[] = [
  {
    id: 'employment_law_2026',
    emoji: '⚖️',
    title: 'Employment Law & Entitlements',
    questions: [
      'When does Payday Super start?',
      'What is the Right to Disconnect?',
      'What are the new rules for casual conversion?',
      'Is superannuation paid on parental leave?',
    ],
  },
  {
    id: 'recruitment_talent',
    emoji: '👋',
    title: 'Recruitment & Talent Questions',
    questions: [
      // Owner-facing recruitment challenges grounded in AU statute.
      // Sourced from the researcher pass against Fair Work / Migration
      // Act / Anti-Discrimination / Privacy Act for AU SMEs.
      'What pay rate do I have to offer a new hire under the award?',
      "How do I check someone's right to work in Australia before I hire?",
      "What should I put in a job ad so it's not accidentally discriminatory?",
      'What interview questions am I allowed to ask, and which ones land me in trouble?',
      'Do I need a written contract before their first day, and what has to be in it?',
    ],
  },
  {
    id: 'culture_pay_performance',
    emoji: '📈',
    title: 'Workplace Culture, Pay & Performance',
    questions: [
      'How do I handle stress and pressure at work?',
      'What is a reasonable notice period?',
      'What are my rights regarding salary cuts?',
      'How do I request flexible work?',
      'What is a psychosocial risk assessment?',
    ],
  },
  {
    id: 'redundancy_termination',
    emoji: '🚪',
    title: 'Redundancy & Termination',
    questions: [
      'How is redundancy payout calculated in Australia?',
      'What is a genuine redundancy?',
      'What are the new NDA limits in sexual harassment matters?',
    ],
  },
]

interface Props {
  onPick: (question: string) => void
  onSkip: () => void
}

// The picker is a panel under the hero composer, not a screen of its own.
// It used to carry a full page header - an "HQ People - AI Advisor" eyebrow,
// its own greeting and a standfirst - from when it WAS the first screen. The
// hero owns all three now, so the panel keeps one quiet label and nothing
// else. That took `userName`, `greeting` and `bizName` with it.
export default function TopicPicker({ onPick, onSkip }: Props) {
  const [selected, setSelected] = useState<Topic | null>(null)

  return (
    <div className="w-full">
      <p className="mb-3 text-center text-xs font-bold uppercase tracking-wider text-ink-muted">
        {selected ? 'Pick the question that fits' : 'Browse by topic'}
      </p>

      {!selected ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {TOPICS.map(t => (
              <button
                key={t.id}
                onClick={() => setSelected(t)}
                // Tokenised Nov 2026. These four used to be a hardcoded
                // bg-white / #1F1F1F pair that stayed light in BOTH themes.
                // That held while the picker was the whole first screen;
                // under the dark hero it reads as a white slab dropped into
                // the page. Same card family as the composer above it now:
                // elevated surface, hairline border, border lifts on hover.
                className="rounded-2xl border border-border bg-bg-elevated p-5 text-left shadow-card transition-all hover:border-border-strong hover:shadow-modal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
              >
                <p className="text-sm font-bold leading-tight text-ink">{t.title}</p>
              </button>
            ))}
          </div>
          <div className="text-center mt-6">
            <button
              onClick={onSkip}
              className="rounded text-sm font-bold text-ink-soft underline underline-offset-2 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
            >
              Close topics
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl bg-bg-soft px-4 py-3">
            <p className="text-sm font-bold text-ink">
              {selected.title}
            </p>
            <button
              onClick={() => setSelected(null)}
              className="shrink-0 text-xs text-ink-soft underline hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 rounded"
            >
              Back to topics
            </button>
          </div>
          <div className="space-y-2">
            {selected.questions.map((q, i) => (
              <button
                key={i}
                onClick={() => onPick(q)}
                className="w-full rounded-2xl border border-border bg-bg-elevated px-4 py-3 text-left text-sm text-ink shadow-card transition-all hover:border-border-strong hover:shadow-modal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
              >
                {q}
              </button>
            ))}
            <button
              onClick={onSkip}
              className="w-full rounded-2xl border border-dashed border-border bg-bg-elevated px-4 py-3 text-left text-sm text-ink-soft transition-colors hover:border-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
            >
              Other - let me write my own question
            </button>
          </div>
        </>
      )}
    </div>
  )
}
