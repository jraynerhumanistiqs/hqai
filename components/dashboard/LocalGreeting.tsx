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
    // Runs in the browser → uses the client's local timezone
    setGreeting(getGreeting())
  }, [])

  return (
    <div className="mb-6 sm:mb-10">
      <h1 className="font-display text-2xl sm:text-h1 font-bold text-charcoal uppercase tracking-wide">
        {greeting ? `${greeting}, ${firstName}` : `Welcome, ${firstName}`}
      </h1>
      <p className="text-sm sm:text-body text-mid">
        Welcome to {bizName} - here&apos;s what&apos;s happening.
      </p>
    </div>
  )
}
