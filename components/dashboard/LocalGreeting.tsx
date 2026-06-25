'use client'
import { useState, useEffect } from 'react'

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

export function LocalGreeting({ firstName, bizName }: { firstName: string; bizName: string }) {
  const [greeting, setGreeting] = useState('')

  useEffect(() => {
    // Runs in the browser - uses the client's local timezone
    setGreeting(getGreeting())
  }, [])

  return (
    <div className="mb-1">
      <p className="mb-3 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.06em] text-clay">
        <span aria-hidden className="h-px w-5 bg-clay" />
        Your dashboard
      </p>
      <h1 className="font-display text-2xl sm:text-h1 font-bold tracking-tight text-ink">
        {greeting ? `${greeting}, ${firstName}` : `Welcome, ${firstName}`}
      </h1>
      <p className="text-sm sm:text-body text-ink-soft mt-1">
        Welcome to your HQ.ai dashboard, jump back in below!
      </p>
    </div>
  )
}
