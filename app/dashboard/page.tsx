import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { LocalGreeting } from '@/components/dashboard/LocalGreeting'

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

  const { data: recentConvos } = await convoQuery

  // Fetch recent documents
  const docQuery = supabase
    .from('documents')
    .select('id, title, type, created_at')
    .order('created_at', { ascending: false })
    .limit(5)

  if (business?.id) {
    docQuery.eq('business_id', business.id)
  }

  const { data: recentDocs } = await docQuery

  const hasConversations = recentConvos && recentConvos.length > 0

  // Normalise em/en dashes in any string coming from DB to plain hyphens
  const normaliseDashes = (s: string | null | undefined) =>
    (s || '').replace(/[\u2014\u2013]/g, '-')

  return (
    <div className="flex-1 overflow-y-auto bg-bg-elevated">
      {/* Tightened vertical rhythm - previous gap-8/10 left the
          greeting feeling stranded above the first card row. Half the
          gap and smaller top padding pulls everything together. */}
      <div className="min-h-full max-w-6xl mx-auto px-4 sm:px-8 pt-4 sm:pt-6 pb-8 sm:pb-10 flex flex-col gap-5 sm:gap-6">

        {/* Welcome */}
        <LocalGreeting firstName={firstName} bizName={business?.name || 'HQ.ai'} />

        {/* Quick Actions - headings only with hover tooltip */}
        <div>
          <h2 className="font-display text-xl font-bold text-charcoal uppercase tracking-wider mb-4">Quick actions</h2>
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
            <h2 className="font-display text-xl font-bold text-charcoal uppercase tracking-wider mb-4">Recent conversations</h2>
            <div className="bg-bg-elevated border border-black rounded-2xl flex-1 flex flex-col shadow-[0_1px_0_rgba(0,0,0,0.04),0_4px_8px_rgba(0,0,0,0.08),0_16px_32px_-8px_rgba(0,0,0,0.14)] hover:shadow-[0_2px_0_rgba(0,0,0,0.04),0_8px_16px_rgba(0,0,0,0.1),0_24px_48px_-12px_rgba(0,0,0,0.18)] transition-shadow">
              {hasConversations ? (
                <ul className="divide-y divide-border">
                  {recentConvos.map((c: any) => (
                    <li key={c.id} className="px-5 py-4 hover:bg-light transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${c.escalated ? 'bg-warning' : 'bg-black'}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-charcoal truncate">{normaliseDashes(c.title)}</p>
                          <p className="text-xs text-muted">
                            {c.module === 'recruit' ? 'HQ Recruit' : 'HQ People'} &middot; {formatDate(c.created_at)}
                          </p>
                        </div>
                        {c.escalated && (
                          <span className="text-xs bg-warning/10 text-warning px-2 py-0.5 rounded-full font-medium">Escalated</span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center px-6 py-10">
                  <p className="text-sm text-muted mb-4">No conversations yet</p>
                  <Link href="/dashboard/people"
                    className="inline-block bg-accent hover:bg-accent-hover text-ink-on-accent text-sm font-bold px-6 py-2.5 rounded-full transition-colors">
                    Start your first chat
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Recent Documents */}
          <div className="flex flex-col">
            <h2 className="font-display text-xl font-bold text-charcoal uppercase tracking-wider mb-4">Recent documents</h2>
            <div className="bg-bg-elevated border border-black rounded-2xl flex-1 flex flex-col shadow-[0_1px_0_rgba(0,0,0,0.04),0_4px_8px_rgba(0,0,0,0.08),0_16px_32px_-8px_rgba(0,0,0,0.14)] hover:shadow-[0_2px_0_rgba(0,0,0,0.04),0_8px_16px_rgba(0,0,0,0.1),0_24px_48px_-12px_rgba(0,0,0,0.18)] transition-shadow">
              {recentDocs && recentDocs.length > 0 ? (
                <ul className="divide-y divide-border">
                  {recentDocs.map((d: any) => (
                    <li key={d.id}>
                      <Link href="/dashboard/documents" className="block px-5 py-4 hover:bg-light transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-ink/10 rounded-lg flex items-center justify-center flex-shrink-0">
                            <DocsIcon />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-charcoal truncate">{normaliseDashes(d.title)}</p>
                            <p className="text-xs text-muted">{normaliseDashes(d.type) || 'Document'} &middot; {formatDate(d.created_at)}</p>
                          </div>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center px-6 py-10">
                  <p className="text-sm text-muted">No documents yet</p>
                  <p className="text-xs text-muted mt-1">Documents are auto-saved when HQ generates them</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recent News & Information */}
        <div>
          <h2 className="font-display text-xl font-bold text-charcoal uppercase tracking-wider mb-4">Recent applicable news &amp; information</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-5">
            <NewsCard
              image="/news/fair-work-update.jpg"
              title="Fair Work minimum wage increase - what it means for your business"
              date="April 2026"
            />
            <NewsCard
              image="/news/right-to-disconnect.jpg"
              title="Right to Disconnect: 6 months on - compliance checklist for SMEs"
              date="March 2026"
            />
            <NewsCard
              image="/news/casual-conversion.jpg"
              title="Casual conversion changes: updated obligations from 1 January 2026"
              date="February 2026"
            />
          </div>
          <p className="text-xs text-muted mt-3">Curated by your HQ.ai advisory team. Updated regularly.</p>
        </div>

      </div>
    </div>
  )
}

function QuickAction({ href, title, desc, icon }: { href: string; title: string; desc: string; icon: React.ReactNode }) {
  return (
    <div className="relative group">
      <Link href={href}
        className="block bg-bg-elevated border border-black rounded-2xl p-6 transition-all hover:-translate-y-1 shadow-[0_1px_0_rgba(0,0,0,0.04),0_4px_8px_rgba(0,0,0,0.08),0_16px_32px_-8px_rgba(0,0,0,0.14)] hover:shadow-[0_2px_0_rgba(0,0,0,0.04),0_12px_24px_rgba(0,0,0,0.12),0_28px_56px_-12px_rgba(0,0,0,0.22)]">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-ink/8 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-ink/15 transition-colors">
            {icon}
          </div>
          <p className="font-display text-lg font-bold text-charcoal uppercase tracking-wider">{title}</p>
        </div>
      </Link>
      {/* Info bubble on hover */}
      <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-full mt-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="bg-black text-white font-display text-xs font-bold uppercase tracking-wider px-3 py-2 rounded-lg whitespace-nowrap shadow-lg">
          {desc}
        </div>
      </div>
    </div>
  )
}

function NewsCard({ image, title, date }: { image: string; title: string; date: string }) {
  return (
    <div className="bg-bg-elevated border border-black rounded-2xl overflow-hidden transition-all hover:-translate-y-1 shadow-[0_1px_0_rgba(0,0,0,0.04),0_4px_8px_rgba(0,0,0,0.08),0_16px_32px_-8px_rgba(0,0,0,0.14)] hover:shadow-[0_2px_0_rgba(0,0,0,0.04),0_12px_24px_rgba(0,0,0,0.12),0_28px_56px_-12px_rgba(0,0,0,0.22)] group">
      <div className="h-36 bg-light flex items-center justify-center overflow-hidden">
        <svg className="w-10 h-10 text-muted" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M2 5a2 2 0 012-2h8a2 2 0 012 2v10a2 2 0 002 2H4a2 2 0 01-2-2V5zm3 1h6v4H5V6zm6 6H5v2h6v-2z" clipRule="evenodd"/>
          <path d="M15 7h1a2 2 0 012 2v5.5a1.5 1.5 0 01-3 0V7z"/>
        </svg>
      </div>
      <div className="p-4">
        <p className="text-xs text-muted mb-1">{date}</p>
        <p className="text-sm font-medium text-charcoal leading-snug line-clamp-2">{title}</p>
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
