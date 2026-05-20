// Public root route - simple auth gate during the pilot.
//
// Behaviour:
//   - Authenticated visitors are redirected to /dashboard.
//   - Unauthenticated visitors are redirected to /login.
//
// The marketing landing page lives at /landing-page until the
// product is ready for public launch, at which point this route
// can be flipped back to render the landing page directly. This
// gives the internal testing team a no-friction path: type
// humanistiqs.ai, get straight to the login screen.

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export const metadata = {
  title: 'HQ.ai',
  // The root route is a redirect - never index it.
  robots: { index: false, follow: false },
}

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/dashboard')
  redirect('/login')
}
