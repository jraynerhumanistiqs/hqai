'use client'

// Home-page chat tile. Oct 2026 - the home was rebuilt as a tile grid, so
// the composer is now ONE TILE among the navigation tiles rather than a
// full-width chat-first hero. It is sized by the grid (auto-rows-fr), so it
// stretches to whatever the tallest tile in the row is.
//
// Submit behaviour is unchanged: the text is pushed to
// /dashboard/people/advisor?prompt=... which auto-sends the seeded prompt
// (see app/dashboard/people/advisor/page.tsx). Enter sends, Shift+Enter
// inserts a newline.
//
// Dropped in the tile rebuild:
//   - the HQ People / HQ Recruit stream toggle. Recruit was never a chat -
//     that branch launched the three recruit tools, and those tools are now
//     first-class tiles on the home grid, so the toggle only hid them.
//   - the four starter chips. They do not fit a tile, and the advisor's own
//     empty state already offers suggestions (SUGGESTIONS_PEOPLE in
//     components/chat/ChatInterface.tsx), so nothing is lost.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { RiSparkling2Line, RiArrowRightLine } from '@remixicon/react'

function advisorHref(prompt: string) {
  return `/dashboard/people/advisor?prompt=${encodeURIComponent(prompt.trim())}`
}

export function ChatComposer({ firstName: _firstName }: { firstName?: string }) {
  const [text, setText] = useState('')
  const router = useRouter()

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
    <form
      aria-label="Ask HQ"
      onSubmit={e => { e.preventDefault(); ask(text) }}
      className="group flex h-full flex-col rounded-3xl border border-border bg-bg-elevated p-5 shadow-card transition-colors focus-within:border-ink/30"
    >
      <div className="mb-3 flex items-center gap-2.5">
        <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-2xl bg-bg-soft text-ink-soft">
          <RiSparkling2Line className="h-[18px] w-[18px]" aria-hidden />
        </span>
        <span className="font-display text-base font-bold tracking-tight text-ink">Ask HQ</span>
      </div>

      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={onKeyDown}
        rows={2}
        placeholder="Leave, performance, awards, a tricky conversation..."
        aria-label="Ask your AI Advisor a question"
        className="min-h-[56px] w-full flex-1 resize-none bg-transparent text-sm leading-relaxed text-ink outline-none placeholder-ink-muted"
      />

      <div className="mt-3 flex items-center justify-between gap-2">
        <p className="text-[10px] text-ink-muted">Enter to send</p>
        <button
          type="submit"
          disabled={!canSend}
          aria-label="Send to AI Advisor"
          className="inline-flex flex-shrink-0 items-center gap-1 rounded-full bg-accent px-3.5 py-1.5 text-xs font-bold text-ink-on-accent transition-colors hover:bg-accent-hover disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
        >
          Ask HQ
          <RiArrowRightLine className="h-3.5 w-3.5" aria-hidden />
        </button>
      </div>
    </form>
  )
}

export default ChatComposer
