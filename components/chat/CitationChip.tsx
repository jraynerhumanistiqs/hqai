'use client'
import React from 'react'

interface CitationChipProps {
  n: number
  label: string
  url?: string
}

const CHIP_CLASS =
  'inline-flex items-center justify-center align-super bg-light text-charcoal hover:bg-border text-[10px] font-bold px-1.5 py-0 rounded-full min-w-[16px] h-[16px] leading-none mx-0.5 transition-colors no-underline'

export default function CitationChip({ n, label, url }: CitationChipProps) {
  const aria = `Citation: ${label}`
  const title = label

  if (url) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={CHIP_CLASS}
        aria-label={aria}
        title={title}
      >
        {n}
      </a>
    )
  }

  return (
    <span
      className={CHIP_CLASS}
      role="note"
      aria-label={aria}
      title={title}
    >
      {n}
    </span>
  )
}
