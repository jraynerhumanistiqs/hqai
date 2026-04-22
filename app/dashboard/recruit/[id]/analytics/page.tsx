import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { redirect, notFound } from 'next/navigation'
import { AnalyticsTiles } from '@/components/recruit/AnalyticsTiles'

export default async function AnalyticsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: session } = await supabaseAdmin
    .from('prescreen_sessions')
    .select('id, company, role_title')
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle()
  if (!session) notFound()

  return (
    <div className="h-full overflow-y-auto bg-bg">
      <div className="max-w-5xl mx-auto px-4 sm:px-8 py-6 sm:py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-black">{session.role_title}</h1>
            <p className="text-sm text-mid">{session.company} &middot; Analytics</p>
          </div>
          <Link
            href="/dashboard/recruit"
            className="text-xs font-bold px-4 py-2 rounded-full border border-border bg-white text-black hover:bg-light transition-colors"
          >Back to role</Link>
        </div>

        <AnalyticsTiles sessionId={session.id} />
      </div>
    </div>
  )
}
