import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { LocalGreeting } from '@/components/dashboard/LocalGreeting'
import { ChatComposer } from '@/components/dashboard/ChatComposer'
import { EmptyState } from '@/components/ui/EmptyState'
import { StatusPill } from '@/components/ui/StatusPill'

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
  const convoQuery = business?.id
    ? supabase
        .from('conversations')
        .select('id, title, module, created_at, escalated')
        .or(`business_id.eq.${business.id},user_id.eq.${user.id}`)
        .order('created_at', { ascending: false })
        .limit(5)
    : supabase
        .from('conversations')
        .select('id, title, module, created_at, escalated')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5)

  // DASH-09 - keep the query error so a genuine outage renders a distinct
  // error state, not the friendly "nothing here yet" empty state.
  const { data: recentConvos, error: convoErr } = await convoQuery

  // Open escalations - the highest-value "outstanding" signal now that the
  // escalated column exists. Feeds the Next actions rail.
  const escQuery = business?.id
    ? supabase
        .from('conversations')
        .select('id, title, module, created_at, escalation_summary')
        .eq('escalated', true)
        .or(`business_id.eq.${business.id},user_id.eq.${user.id}`)
        .order('created_at', { ascending: false })
        .limit(5)
    : supabase
        .from('conversations')
        .select('id, title, module, created_at, escalation_summary')
        .eq('escalated', true)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5)
  const { data: openEscalations } = await escQuery

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

  if (convoErr) console.error('[dashboard] recent conversations query failed:', convoErr.message)
  if (docErr) console.error('[dashboard] recent documents query failed:', docErr.message)

  const hasConversations = !convoErr && recentConvos && recentConvos.length > 0
  const hasDocs = !docErr && recentDocs && recentDocs.length > 0
  const escalations = openEscalations && openEscalations.length > 0 ? openEscalations : []

  // Normalise em/en dashes in any string coming from DB to plain hyphens
  const normaliseDashes = (s: string | null | undefined) =>
    (s || '').replace(/[—–]/g, '-')

  return (
    <div className="flex-1 overflow-y-auto bg-bg text-ink">
      <div className="min-h-full max-w-6xl mx-auto px-4 sm:px-8 pt-4 sm:pt-6 pb-8 sm:pb-10 flex flex-col gap-6 sm:gap-7">

        {/* Welcome */}
        <LocalGreeting firstName={firstName} bizName={business?.name || 'HQ.ai'} />

        {/* Chat-first hero - the composer leads the home */}
        <ChatComposer firstName={firstName} />

        {/* Next actions - open escalations (only shown when there are any) */}
        {escalations.length > 0 && (
          <div>
            <h2 className="font-display text-lg sm:text-xl font-bold tracking-tight text-ink mb-3">Next actions</h2>
            <div className="bg-bg-elevated border border-border rounded-3xl divide-y divide-border transition-colors">
              {escalations.map((e: any) => (
                <div key={e.id} className="flex items-start gap-3 px-5 py-4">
                  <span className="mt-0.5 w-8 h-8 rounded-lg bg-warning/10 text-warning flex items-center justify-center flex-shrink-0">
                    <AlertIcon />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-ink truncate">{normaliseDashes(e.title) || 'Escalated conversation'}</p>
                      <StatusPill tone="warning" label="Consultant reviewing" />
                    </div>
                    {e.escalation_summary && (
                      <p className="text-xs text-ink-muted mt-0.5 line-clamp-1">{normaliseDashes(e.escalation_summary)}</p>
                    )}
                    <p className="text-xs text-ink-muted mt-0.5">
                      {e.module === 'recruit' ? 'HQ Recruit' : 'HQ People'} &middot; {formatDate(e.created_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Recent Conversations */}
          <div className="flex flex-col">
            <h2 className="font-display text-lg sm:text-xl font-bold tracking-tight text-ink mb-4">Recent conversations</h2>
            <div className="bg-bg-elevated border border-border rounded-3xl flex-1 flex flex-col transition-colors min-h-[220px]">
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
                        {/* Non-escalated dot carries the eyebrow gold; escalated keeps warning. */}
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${c.escalated ? 'bg-warning' : 'bg-clay-ink dark:bg-clay'}`} />
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
                  description="Ask HQ a question in the box above to get started."
                />
              )}
            </div>
          </div>

          {/* Recent Documents */}
          <div className="flex flex-col">
            <h2 className="font-display text-lg sm:text-xl font-bold tracking-tight text-ink mb-4">Recent documents</h2>
            <div className="bg-bg-elevated border border-border rounded-3xl flex-1 flex flex-col transition-colors min-h-[220px]">
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

        {/* Slim shortcuts - the quick-action cards, demoted now the composer leads */}
        <div className="flex flex-wrap items-center gap-2">
          <Shortcut href="/dashboard/people" label="HQ People" />
          <Shortcut href="/dashboard/recruit" label="HQ Recruit" />
          <Shortcut href="/dashboard/documents" label="Documents" />
          <Shortcut href="/dashboard/settings" label="Settings" />
        </div>

      </div>
    </div>
  )
}

function Shortcut({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      // Filled inverse pill: near-black in light (bg-ink = #111), inverting to
      // near-white in dark; the label uses the opposite surface so it stays
      // legible in both themes.
      className="inline-flex items-center rounded-full bg-ink text-bg-elevated px-4 py-2 text-sm font-medium transition-colors hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
    >
      {label}
    </Link>
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

// Empty / error / rail state icons
function ChatIcon() {
  return <svg className="w-7 h-7" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.84 8.84 0 01-3.11-.56c-.32.12-1.03.4-2.26.8a.5.5 0 01-.64-.62c.34-1.02.53-1.72.57-2.09C2.9 14.29 2 12.24 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7z" clipRule="evenodd"/>
  </svg>
}
function DocsIcon() {
  return <svg className="w-4 h-4 text-clay-ink dark:text-clay" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd"/>
  </svg>
}
function DocsEmptyIcon() {
  return <svg className="w-7 h-7" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd"/>
  </svg>
}
function AlertIcon() {
  return <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
  </svg>
}
