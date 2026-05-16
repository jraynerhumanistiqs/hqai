// B0.2 - HQ People is being split into AI Advisor and AI Administrator.
// /dashboard/people now redirects to the AI Advisor surface so existing
// links (sidebar history items, in-app callbacks, marketing pages)
// continue to work without breaking. The canonical advisor route lives
// at /dashboard/people/advisor; the new AI Administrator surface is at
// /dashboard/people/administrator. See docs/research/2026-05-16_ai-doc
// -creation-teardown.md section 0 / brief Part B0 for the split.

import { redirect } from 'next/navigation'

export default async function PeopleIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ prompt?: string }>
}) {
  const params = await searchParams
  // Preserve ?prompt= passthrough so seed prompts from elsewhere in the
  // product still reach the AI Advisor chat.
  const target = params.prompt
    ? `/dashboard/people/advisor?prompt=${encodeURIComponent(params.prompt)}`
    : '/dashboard/people/advisor'
  redirect(target)
}
