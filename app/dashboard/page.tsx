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

  // Fetch recent conversations - use user.id fallback if business.id missing
  const convoQuery = supabase
    .from('conversations')
    .select('id, title, module, created_at, escalated')
    .order('created_at', { ascending: false })
    .limit(5)

  if (business?.id) {
    convoQuery.eq('business_id', business.id)
  } else {
    convoQuery.eq('user_id', user.id)
  }

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

  return (
    <div className="flex-1 overflow-y-auto bg-[#000000]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10">

        {/* Welcome — greeting uses client's local time */}
        <LocalGreeting firstName={firstName} bizName={business?.name || 'HQ.ai'} />

        {/* Quick Actions — 3 only */}
        <div className="mb-6 sm:mb-10">
          <h2 className="font-display text-lg font-bold text-white uppercase tracking-wider mb-3">Quick actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-10">

          {/* Recent Conversations */}
          <div className="flex flex-col">
            <h2 className="font-display text-lg font-bold text-white uppercase tracking-wider mb-3">Recent conversations</h2>
            <div className="bg-[#111111] rounded-xl border border-[#222222] flex-1">
              {hasConversations ? (
                <ul className="divide-y divide-[#222222]">
                  {recentConvos.map((c: any) => (
                    <li key={c.id} className="px-4 py-3 hover:bg-[#1a1a1a] transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${c.escalated ? 'bg-warning' : 'bg-accent'}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">{c.title}</p>
                          <p className="text-xs text-gray-500">
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
                <div className="px-4 py-8 text-center">
                  <p className="text-sm text-gray-500 mb-3">No conversations yet</p>
                  <Link href="/dashboard/people"
                    className="inline-block bg-[#fd7325] hover:bg-[#e5671f] text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-colors">
                    Start your first chat
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Recent Documents */}
          <div className="flex flex-col">
            <h2 className="font-display text-lg font-bold text-white uppercase tracking-wider mb-3">Recent documents</h2>
            <div className="bg-[#111111] rounded-xl border border-[#222222] flex-1">
              {recentDocs && recentDocs.length > 0 ? (
                <ul className="divide-y divide-[#222222]">
                  {recentDocs.map((d: any) => (
                    <li key={d.id}>
                      <Link href="/dashboard/documents" className="block px-4 py-3 hover:bg-[#1a1a1a] transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-[#fd7325]/15 rounded-lg flex items-center justify-center flex-shrink-0">
                            <DocsIcon />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">{d.title}</p>
                            <p className="text-xs text-gray-500">{d.type || 'Document'} &middot; {formatDate(d.created_at)}</p>
                          </div>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="px-4 py-8 text-center">
                  <p className="text-sm text-gray-500">No documents yet</p>
                  <p className="text-xs text-gray-600 mt-1">Documents are auto-saved when HQ generates them</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recent News & Information */}
        <div className="mb-6 sm:mb-10">
          <h2 className="font-display text-lg font-bold text-white uppercase tracking-wider mb-3">Recent applicable news &amp; information</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
            <NewsCard
              image="/news/fair-work-update.jpg"
              title="Fair Work minimum wage increase — what it means for your business"
              date="April 2026"
            />
            <NewsCard
              image="/news/right-to-disconnect.jpg"
              title="Right to Disconnect: 6 months on — compliance checklist for SMEs"
              date="March 2026"
            />
            <NewsCard
              image="/news/casual-conversion.jpg"
              title="Casual conversion changes: updated obligations from 1 January 2026"
              date="February 2026"
            />
          </div>
          <p className="text-xs text-gray-600 mt-3">Curated by your HQ.ai advisory team. Updated regularly.</p>
        </div>

      </div>
    </div>
  )
}

function QuickAction({ href, title, desc, icon }: { href: string; title: string; desc: string; icon: React.ReactNode }) {
  return (
    <Link href={href}
      className="group bg-[#ffffff] rounded-xl border border-gray-200 p-4 hover:border-[#fd7325]/40 hover:-translate-y-0.5 transition-all">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 bg-[#fd7325]/15 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-[#fd7325]/25 transition-colors">
          {icon}
        </div>
        <div>
          <p className="text-sm font-bold text-[#000000]">{title}</p>
          <p className="text-xs text-gray-600 mt-0.5">{desc}</p>
        </div>
      </div>
    </Link>
  )
}

function NewsCard({ image, title, date }: { image: string; title: string; date: string }) {
  return (
    <div className="bg-[#111111] rounded-xl border border-[#222222] overflow-hidden hover:border-[#333333] transition-colors group">
      <div className="h-32 bg-[#1a1a1a] flex items-center justify-center overflow-hidden">
        <div className="w-full h-full bg-gradient-to-br from-[#fd7325]/20 to-[#fd7325]/5 flex items-center justify-center">
          <svg className="w-8 h-8 text-[#fd7325]/40" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M2 5a2 2 0 012-2h8a2 2 0 012 2v10a2 2 0 002 2H4a2 2 0 01-2-2V5zm3 1h6v4H5V6zm6 6H5v2h6v-2z" clipRule="evenodd"/>
            <path d="M15 7h1a2 2 0 012 2v5.5a1.5 1.5 0 01-3 0V7z"/>
          </svg>
        </div>
      </div>
      <div className="p-3">
        <p className="text-xs text-gray-500 mb-1">{date}</p>
        <p className="text-sm font-medium text-white leading-snug line-clamp-2">{title}</p>
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
  return <svg className="w-4 h-4 text-[#fd7325]" viewBox="0 0 20 20" fill="currentColor">
    <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/>
  </svg>
}
function RecruitIcon() {
  return <svg className="w-4 h-4 text-[#fd7325]" viewBox="0 0 20 20" fill="currentColor">
    <path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z"/>
  </svg>
}
function DocsIcon() {
  return <svg className="w-4 h-4 text-[#fd7325]" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd"/>
  </svg>
}
function SettingsIcon() {
  return <svg className="w-4 h-4 text-[#fd7325]" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd"/>
  </svg>
}
