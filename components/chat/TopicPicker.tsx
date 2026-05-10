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
    title: 'Employment Law & Entitlements (2026)',
    questions: [
      'When does Payday Super start?',
      'What is the Right to Disconnect?',
      'What are the new rules for casual conversion?',
      'Is superannuation paid on parental leave?',
    ],
  },
  {
    id: 'hiring_interview',
    emoji: '👋',
    title: 'Hiring & Interview Questions',
    questions: [
      "What's a strong way to answer 'Tell me about yourself'?",
      "How should I assess 'Why do you want to work here?'",
      'How do I handle salary expectations conversations?',
      "How do I respond to 'Why are you leaving your current role?'",
      'How do I evaluate behavioural interview answers?',
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
  userName?: string
  greeting: string
  bizName?: string
  onPick: (question: string) => void
  onSkip: () => void
}

export default function TopicPicker({ userName, greeting, onPick, onSkip }: Props) {
  const [selected, setSelected] = useState<Topic | null>(null)

  return (
    <div className="max-w-3xl mx-auto px-2 pt-6 pb-4">
      <div className="text-center mb-8">
        <h2 className="font-display text-2xl sm:text-3xl font-bold text-charcoal tracking-tight mb-2">
          {userName ? `${greeting}, ${userName}` : greeting}
        </h2>
        <p className="text-sm text-mid max-w-lg mx-auto leading-relaxed">
          {selected
            ? 'Pick the question that fits, or write your own below.'
            : 'Pick a topic to get started, or jump straight into your own question.'}
        </p>
      </div>

      {!selected ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {TOPICS.map(t => (
              <button
                key={t.id}
                onClick={() => setSelected(t)}
                className="bg-white shadow-card hover:shadow-modal rounded-2xl p-5 text-left transition-shadow"
              >
                <div className="text-2xl mb-2">{t.emoji}</div>
                <p className="text-sm font-bold text-charcoal leading-tight">{t.title}</p>
              </button>
            ))}
          </div>
          <div className="text-center mt-6">
            <button
              onClick={onSkip}
              className="text-sm font-bold text-mid hover:text-charcoal underline underline-offset-2"
            >
              Something else - let me write my own question
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="bg-light rounded-2xl px-4 py-3 mb-4 flex items-center justify-between">
            <p className="text-sm font-bold text-charcoal">
              {selected.emoji} {selected.title}
            </p>
            <button
              onClick={() => setSelected(null)}
              className="text-xs text-mid hover:text-charcoal underline"
            >
              Back to topics
            </button>
          </div>
          <div className="space-y-2">
            {selected.questions.map((q, i) => (
              <button
                key={i}
                onClick={() => onPick(q)}
                className="w-full bg-white shadow-card hover:shadow-modal rounded-2xl px-4 py-3 text-left text-sm text-charcoal transition-shadow"
              >
                {q}
              </button>
            ))}
            <button
              onClick={onSkip}
              className="w-full bg-white border border-dashed border-border hover:border-charcoal rounded-2xl px-4 py-3 text-left text-sm text-mid transition-colors"
            >
              Other - let me write my own question
            </button>
          </div>
        </>
      )}
    </div>
  )
}
