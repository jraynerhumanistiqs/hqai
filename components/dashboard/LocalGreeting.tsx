'use client'
import { useState, useEffect } from 'react'
import { PageHeader } from '@/components/dashboard/PageHeader'

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

export function LocalGreeting({ firstName, bizName: _bizName }: { firstName: string; bizName: string }) {
  const [greeting, setGreeting] = useState('')

  useEffect(() => {
    // Runs in the browser - uses the client's local timezone
    setGreeting(getGreeting())
  }, [])

  // DASH-06 - consumes the shared PageHeader so Home and Settings share one
  // eyebrow/h1 grammar. Home controls its own vertical rhythm through the
  // parent flex gap, so the header's default mb-6 is trimmed to mb-1 here.
  return (
    <PageHeader
      className="mb-1"
      eyebrow="Your dashboard"
      title={greeting ? `${greeting}, ${firstName}` : `Welcome, ${firstName}`}
      subtitle="Welcome to your HQ.ai dashboard, jump back in below!"
    />
  )
}
