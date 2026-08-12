import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { LocalGreeting } from '@/components/dashboard/LocalGreeting'
import { EmptyState } from '@/components/ui/EmptyState'
import { StatusPill } from '@/components/ui/StatusPill'
import { buttonVariants } from '@/components/ui/button'

export default async function DashboardHome() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*, businesses(*)')
    .eq('id', user.id)
    .single()

  const business = profile?.businesses as any
  const firstName = (profile?.full_name || '').split(' ')[0] || 'there'

  // Fetch recent conversations - use OR to catch conversations created both
  // with business_id and with user_id (covers cases where business_id was
  // null at creation time, or where the user didn't have a business yet).
  // NB `escalated` is intentionally NOT selected: the column is defined in
  // schema.sql but is not present on the live DB, so selecting it made the
  // whole query fail (PostgREST: "column conversations.escalated does not
  // exist") - which silently rendered an empty panel before DASH-09, and a
  // false error card after it. Following the repo's "retry-without an
  // unapplied migration" pattern, we drop it; the Escalated indicator simply
  // stays off until the column is added to the DB. Re-add it to both selects
  // once the migration lands.
  const convoQuery = business?.id
    ? supabase
        .from('conversations')
        .select('id, title, module, created_at')
        .or(`business_id.eq.${business.id},user_id.eq.${user.id}`)
        .order('created_at', { ascending: false })
        .limit(5)
    : supabase
        .from('conversations')
        .select('id, title, module, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5)

  // DASH-09 - keep the query error so an outage renders a distinct error
  // state, not the friendly "nothing here yet" empty state (which hid
  // failures behind a false-empty).
  const { data: recentConvos, error: convoErr } = await convoQuery

  // Fetch recent documents
  const docQuery = supabase
    .from('documents')
    .select('id, title, type, created_at')
    .order('created_at', { ascending: false })
    .limit(5)

  if (business?.id) {
    docQuery.eq('business_id', business.id)
  }

  const { data: recentDocs, error: docErr } = await docQuery

  // DASH-09 companion - surface the real cause server-side (observability)
  // while the client only ever sees the calm error card.
  if (convoErr) console.error('[dashboard] recent conversations query failed:', convoErr.message)
  if (docErr) console.error('[dashboard] recent documents query failed:', docErr.message)

  const hasConversations = !convoErr && recentConvos && recentConvos.length > 0
  const hasDocs = !docErr && recentDocs && recentDocs.length > 0

  // Normalise em/en dashes in any string coming from DB to plain hyphens
  const normaliseDashes = (s: string | null | undefined) =>
    (s || '').replace(/[\u2014\u2013]/g, '-')

  return (
    // The whole dashboard now honours the product light/dark theme
    // (defaults to dark, toggle in the sidebar). The June 2026 spike that
    // hard-scoped this one screen to data-app="marketing" is retired - the
    // product .dark tokens already mirror the marketing palette, so this
    // page reads near-black + Wattle Gold + Schibsted in dark and clean
    // white in light, in step with every other dashboard surface.
    <div className="flex-1 overflow-y-auto bg-bg text-ink">
      {/* Tightened vertical rhythm - previous gap-8/10 left the
          greeting feeling stranded above the first card row. Half the
          gap and smaller top padding pulls everything together. */}
      <div className="min-h-full max-w-6xl mx-auto px-4 sm:px-8 pt-4 sm:pt-6 pb-8 sm:pb-10 flex flex-col gap-5 sm:gap-6">

        {/* Welcome */}
        <LocalGreeting firstName={firstName} bizName={business?.name || 'HQ.ai'} />

        {/* Quick Actions - headings only with hover tooltip */}
        <div>
          <h2 className="font-display text-lg sm:text-xl font-bold tracking-tight text-ink mb-4">Quick actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <QuickAction
              href="/dashboard/people"
              title="HQ People"
              desc="HR advice, compliance, Fair Work guidance"
              icon={<PeopleIcon />}
            />
            <QuickAction
              href="/dashboard/recruit"
              title="HQ Recruit"
              desc="Job ads, screening, interview questions"
              icon={<RecruitIcon />}
            />
            <QuickAction
              href="/dashboard/settings"
              title="Settings"
              desc="Business profile, team, billing"
              icon={<SettingsIcon />}
            />
          </div>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-[320px]">

          {/* Recent Conversations */}
          <div className="flex flex-col">
            <h2 className="font-display text-lg sm:text-xl font-bold tracking-tight text-ink mb-4">Recent conversations</h2>
            <div className="bg-bg-elevated border border-border rounded-3xl flex-1 flex flex-col transition-colors">
              {convoErr ? (
                <EmptyState
                  className="flex-1"
                  tone="bg-danger/10 text-danger"
                  icon={<AlertIcon />}
                  title="Couldn't load your conversations"
                  description="Something went wrong reaching your recent activity. Refresh to try again."
                />
              ) : hasConversations ? (
                <ul className="divide-y divide-border">
                  {recentConvos!.map((c: any) => (
                    <li key={c.id} className="px-5 py-4 hover:bg-bg-soft transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${c.escalated ? 'bg-warning' : 'bg-ink'}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-ink truncate">{normaliseDashes(c.title)}</p>
                          <p className="text-xs text-ink-muted">
                            {c.module === 'recruit' ? 'HQ Recruit' : 'HQ People'} &middot; {formatDate(c.created_at)}
                          </p>
                        </div>
                        {c.escalated && <StatusPill tone="warning" label="Escalated" />}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState
                  className="flex-1"
                  tone="bg-clay-soft text-clay-ink dark:text-clay"
                  icon={<ChatIcon />}
                  title="No conversations yet"
                  description="Ask your AI Advisor an HR question to get started."
                  action={
                    <Link href="/dashboard/people" className={buttonVariants({ size: 'md' })}>
                      Start your first chat
                    </Link>
                  }
                />
              )}
            </div>
          </div>

          {/* Recent Documents */}
          <div className="flex flex-col">
            <h2 className="font-display text-lg sm:text-xl font-bold tracking-tight text-ink mb-4">Recent documents</h2>
            <div className="bg-bg-elevated border border-border rounded-3xl flex-1 flex flex-col transition-colors">
              {docErr ? (
                <EmptyState
                  className="flex-1"
                  tone="bg-danger/10 text-danger"
                  icon={<AlertIcon />}
                  title="Couldn't load your documents"
                  description="Something went wrong reaching your recent documents. Refresh to try again."
                />
              ) : hasDocs ? (
                <ul className="divide-y divide-border">
                  {recentDocs!.map((d: any) => (
                    <li key={d.id}>
                      <Link href="/dashboard/documents"
                        className="block px-5 py-4 hover:bg-bg-soft transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset rounded-3xl">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-ink/10 rounded-lg flex items-center justify-center flex-shrink-0">
                            <DocsIcon />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-ink truncate">{normaliseDashes(d.title)}</p>
                            <p className="text-xs text-ink-muted">{normaliseDashes(d.type) || 'Document'} &middot; {formatDate(d.created_at)}</p>
                          </div>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState
                  className="flex-1"
                  tone="bg-bg-soft text-ink-muted"
                  icon={<DocsEmptyIcon />}
                  title="No documents yet"
                  description="Documents are auto-saved when HQ generates them."
                />
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

function QuickAction({ href, title, desc, icon }: { href: string; title: string; desc: string; icon: React.ReactNode }) {
  return (
    <div className="relative group">
      <Link href={href}
        className="block bg-bg-elevated border border-border rounded-3xl p-6 transition-all hover:-translate-y-0.5 hover:border-ink/30
                   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-bg-soft rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-ink/10 transition-colors">
            {icon}
          </div>
          <p className="font-display text-lg font-bold tracking-tight text-ink">{title}</p>
        </div>
      </Link>
      {/* Info bubble on hover */}
      <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-full mt-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="bg-ink text-bg-elevated text-[11px] font-medium px-3 py-2 rounded-lg whitespace-nowrap shadow-float">
          {desc}
        </div>
      </div>
    </div>
  )
}

function formatDate(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHrs = Math.floor(diffMins / 60)
  if (diffHrs < 24) return `${diffHrs}h ago`
  const diffDays = Math.floor(diffHrs / 24)
  if (diffDays < 7) return `${diffDays}d ago`
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
}

// Icons
function PeopleIcon() {
  return <svg className="w-5 h-5 text-ink" viewBox="0 0 20 20" fill="currentColor">
    <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/>
  </svg>
}
function RecruitIcon() {
  return <svg className="w-5 h-5 text-ink" viewBox="0 0 20 20" fill="currentColor">
    <path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z"/>
  </svg>
}
function DocsIcon() {
  return <svg className="w-4 h-4 text-ink" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd"/>
  </svg>
}
function SettingsIcon() {
  return <svg className="w-5 h-5 text-ink" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd"/>
  </svg>
}
// Empty / error state icons (sized for the EmptyState tile)
function ChatIcon() {
  return <svg className="w-7 h-7" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.84 8.84 0 01-3.11-.56c-.32.12-1.03.4-2.26.8a.5.5 0 01-.64-.62c.34-1.02.53-1.72.57-2.09C2.9 14.29 2 12.24 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7z" clipRule="evenodd"/>
  </svg>
}
function DocsEmptyIcon() {
  return <svg className="w-7 h-7" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd"/>
  </svg>
}
function AlertIcon() {
  return <svg className="w-7 h-7" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
  </svg>
}
