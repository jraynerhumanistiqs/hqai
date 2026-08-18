'use client'

// Chat-first home hero. The dashboard's primary interaction is the AI Advisor
// chat, so the home leads with a composer instead of a grid of cards.
//
// Streams reflect the product's real shape:
//   - People    = the streaming AI Advisor chat (the only free-text chat).
//     Submitting routes to /dashboard/people/advisor?prompt=... which
//     auto-sends the seeded prompt (see app/dashboard/people/advisor/page.tsx).
//   - Recruit   = a tool funnel, NOT a chat. There is no recruit chat surface,
//     so this stream launches the three recruit tools directly rather than
//     pretending to be conversational (which would drop the user's text).

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type Stream = 'people' | 'recruit'

const PEOPLE_STARTERS = [
  'Draft a warning letter',
  'Casual conversion - what are my obligations?',
  'What is the minimum annual leave entitlement?',
  'How do I manage an underperforming employee?',
]

const RECRUIT_TOOLS = [
  { label: 'Write a job ad', href: '/dashboard/recruit/campaign-coach', desc: 'Turn rough notes into a full job ad' },
  { label: 'Score CVs', href: '/dashboard/recruit/cv-screening', desc: 'Rank candidates against role criteria' },
  { label: 'Shortlist candidates', href: '/dashboard/recruit/shortlist', desc: 'Run the full hiring workflow' },
]

function advisorHref(prompt: string) {
  return `/dashboard/people/advisor?prompt=${encodeURIComponent(prompt.trim())}`
}

export function ChatComposer({ firstName }: { firstName?: string }) {
  const [stream, setStream] = useState<Stream>('people')
  const [text, setText] = useState('')
  const router = useRouter()
  const taRef = useRef<HTMLTextAreaElement>(null)

  function ask(prompt: string) {
    const q = prompt.trim()
    if (!q) return
    router.push(advisorHref(q))
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Enter sends; Shift+Enter inserts a newline.
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      ask(text)
    }
  }

  const canSend = text.trim().length > 0

  return (
    <section aria-label="Ask HQ" className="w-full">
      {/* Stream toggle */}
      <div
        role="tablist"
        aria-label="Choose a stream"
        className="inline-flex items-center gap-1 bg-bg-soft rounded-full p-1 mb-3"
      >
        {(['people', 'recruit'] as const).map(s => (
          <button
            key={s}
            role="tab"
            aria-selected={stream === s}
            type="button"
            onClick={() => setStream(s)}
            className={`text-xs font-bold px-4 py-1.5 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 ${
              stream === s ? 'bg-ink text-bg-elevated' : 'text-ink-soft hover:text-ink'
            }`}
          >
            {s === 'people' ? 'HQ People' : 'HQ Recruit'}
          </button>
        ))}
      </div>

      {stream === 'people' ? (
        <>
          {/* Composer - the AI Advisor entry */}
          <form
            onSubmit={e => { e.preventDefault(); ask(text) }}
            className="bg-bg-elevated border border-border rounded-3xl shadow-card p-4 sm:p-5 transition-colors focus-within:border-ink/30"
          >
            <textarea
              ref={taRef}
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={onKeyDown}
              rows={3}
              placeholder={`Ask HQ about your team${firstName ? `, ${firstName}` : ''} - performance, leave, awards, a tricky conversation...`}
              aria-label="Ask your AI Advisor a question"
              className="w-full bg-transparent text-base text-ink placeholder-ink-muted resize-none outline-none leading-relaxed"
            />
            <div className="flex items-center justify-between mt-2">
              <p className="text-[11px] text-ink-muted">Enter to send &middot; Shift + Enter for a new line</p>
              <button
                type="submit"
                disabled={!canSend}
                aria-label="Send to AI Advisor"
                className="inline-flex items-center gap-1.5 bg-accent text-ink-on-accent text-sm font-bold px-4 py-2 rounded-full transition-colors hover:bg-accent-hover disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
              >
                Ask HQ
                <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </form>

          {/* People starter chips - seed the advisor chat */}
          <div className="mt-3 flex flex-wrap gap-2">
            {PEOPLE_STARTERS.map(s => (
              <button
                key={s}
                type="button"
                onClick={() => ask(s)}
                className="rounded-full border border-border bg-bg-soft px-3 py-1.5 text-sm text-ink-soft hover:text-ink hover:border-ink/30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
              >
                {s}
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          {/* Recruit is a tool funnel, not a chat - launch the tools directly. */}
          <div className="bg-bg-elevated border border-border rounded-3xl shadow-card p-4 sm:p-5">
            <p className="text-sm text-ink-soft mb-3">Where do you want to start?</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {RECRUIT_TOOLS.map(t => (
                <Link
                  key={t.href}
                  href={t.href}
                  className="group flex flex-col rounded-2xl border border-border bg-bg-soft p-4 transition-all hover:border-ink/30 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
                >
                  <span className="text-sm font-bold text-ink">{t.label}</span>
                  <span className="text-xs text-ink-muted mt-1 leading-snug">{t.desc}</span>
                  <span className="text-xs font-bold text-clay-ink dark:text-clay mt-2">Open &rarr;</span>
                </Link>
              ))}
            </div>
          </div>
          <p className="mt-3 text-[11px] text-ink-muted">
            New role? Start with Write a job ad - it flows into scoring and shortlisting.
          </p>
        </>
      )}
    </section>
  )
}

export default ChatComposer
