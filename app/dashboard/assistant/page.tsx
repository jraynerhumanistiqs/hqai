import ComingSoon from '@/components/dashboard/ComingSoon'

export const metadata = {
  title: 'AI Assistant - HQ.AI',
}

// Placeholder route so AI Assistant can sit in the sidebar as a first-class
// service tab while it is being built. Swap the body for the real client
// when it ships - the route and the nav entry stay as they are.
export default function AssistantPage() {
  return (
    <ComingSoon
      title="AI Assistant"
      blurb="Your day-to-day helper for the admin around people management - drafting, chasing, summarising and keeping track of what needs doing. It is in active build now and will land in an upcoming release."
    />
  )
}
