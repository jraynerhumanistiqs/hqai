import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import TeamRegister from '@/components/people/TeamRegister'

export const dynamic = 'force-dynamic'

// The employee register - HQ People's first system-of-record surface.
//
// Auth-gated like the rest of the dashboard. All data access is business-scoped
// through the API routes, and RLS enforces the same boundary at the database:
// these rows hold personal information about people who are not users of the
// product, so isolation is a hard requirement rather than a convention.

export default async function TeamPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
      <TeamRegister />
    </div>
  )
}
