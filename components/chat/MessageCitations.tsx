'use client'
import React from 'react'
import type { Citation } from '@/lib/parse-citations'

interface MessageCitationsProps {
  citations: Citation[]
}

export default function MessageCitations({ citations }: MessageCitationsProps) {
  if (!citations || citations.length === 0) return null

  // De-duplicate by n (keeps first occurrence) and sort numerically
  const seen = new Set<number>()
  const list = citations
    .filter(c => {
      if (seen.has(c.n)) return false
      seen.add(c.n)
      return true
    })
    .sort((a, b) => a.n - b.n)

  return (
    <div className="border-t border-border pt-2 mt-3 text-xs text-mid">
      <p className="font-bold uppercase tracking-wider text-[10px] text-muted mb-1.5">
        Sources
      </p>
      <ol className="space-y-1">
        {list.map(c => (
          <li key={c.n} className="leading-snug">
            <span className="font-bold text-charcoal">{c.n}.</span>{' '}
            {c.url ? (
              <a
                href={c.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-mid hover:text-charcoal underline underline-offset-2"
              >
                {c.label}
              </a>
            ) : (
              <span>{c.label}</span>
            )}
          </li>
        ))}
      </ol>
    </div>
  )
}
