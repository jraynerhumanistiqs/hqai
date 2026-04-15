import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

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

  // Fetch recent documents
  const { data: recentDocs } = await supabase
    .from('documents')
    .select('id, title, type, created_at')
    .eq('business_id', business?.id)
    .order('created_at', { ascending: false })
    .limit(5)

  // Fetch recent conversations
  const { data: recentConvos } = await supabase
    .from('conversations')
    .select('id, title, module, created_at, escalated')
    .eq('business_id', business?.id)
    .order('created_at', { ascending: false })
    .limit(5)

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="flex-1 overflow-y-auto bg-[#000000]">
      <div className="max-w-4xl mx-auto px-6 py-10">

        {/* Welcome */}
        <div className="mb-10">
          <h1 className="font-display text-h1 font-bold text-white uppercase tracking-wide">
            {greeting}, {firstName}
          </h1>
          <p className="text-body text-gray-400">
            Welcome to {business?.name || 'HQ.ai'} — here&apos;s what&apos;s happening.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="mb-10">
          <h2 className="font-display text-lg font-bold text-white uppercase tracking-wider mb-3">Quick actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <QuickAction
              href="/dashboard/people"
              title="Ask HQ People"
              desc="HR advice, compliance, Fair Work guidance"
              icon={<PeopleIcon />}
            />
            <QuickAction
              href="/dashboard/recruit"
              title="Ask HQ Recruit"
              desc="Job ads, screening, interview questions"
              icon={<RecruitIcon />}
            />
            <QuickAction
              href="/dashboard/documents"
              title="View documents"
              desc="Contracts, policies, and templates"
              icon={<DocsIcon />}
            />
            <QuickAction
              href="/dashboard/awards"
              title="Award interpreter"
              desc="Modern Award rates, entitlements, NES"
              icon={<AwardIcon />}
            />
            <QuickAction
              href="/dashboard/performance"
              title="Performance tools"
              desc="Reviews, PIPs, coaching frameworks"
              icon={<PerfIcon />}
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Recent Conversations */}
          <div>
            <h2 className="font-display text-lg font-bold text-white uppercase tracking-wider mb-3">Recent conversations</h2>
            <div className="bg-[#111111] rounded-xl border border-[#222222]">
              {recentConvos && recentConvos.length > 0 ? (
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
                  <p className="text-sm text-gray-500">No conversations yet</p>
                  <Link href="/dashboard/people" className="text-sm text-[#fd7325] font-medium hover:underline mt-1 inline-block">
                    Start your first chat
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Recent Documents */}
          <div>
            <h2 className="font-display text-lg font-bold text-white uppercase tracking-wider mb-3">Recent documents</h2>
            <div className="bg-[#111111] rounded-xl border border-[#222222]">
              {recentDocs && recentDocs.length > 0 ? (
                <ul className="divide-y divide-[#222222]">
                  {recentDocs.map((d: any) => (
                    <li key={d.id} className="px-4 py-3 hover:bg-[#1a1a1a] transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-[#fd7325]/15 rounded-lg flex items-center justify-center flex-shrink-0">
                          <DocsIcon />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">{d.title}</p>
                          <p className="text-xs text-gray-500">{d.type || 'Document'} &middot; {formatDate(d.created_at)}</p>
                        </div>
                      </div>
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

        {/* Business Info Card */}
        <div className="mt-8 bg-[#111111] rounded-xl border border-[#222222] p-5">
          <h2 className="font-display text-lg font-bold text-white uppercase tracking-wider mb-3">Your business</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <InfoItem label="Business" value={business?.name || '—'} />
            <InfoItem label="Industry" value={business?.industry || '—'} />
            <InfoItem label="State" value={business?.state || '—'} />
            <InfoItem label="Employees" value={business?.headcount || '—'} />
          </div>
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

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-sm font-medium text-white mt-0.5">{value}</p>
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
function AwardIcon() {
  return <svg className="w-4 h-4 text-[#fd7325]" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.233.616 1.738 5.42a1 1 0 01-.285 1.05A3.989 3.989 0 0115 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.715-5.349L11 6.477V16h2a1 1 0 110 2H7a1 1 0 110-2h2V6.477L6.237 7.582l1.715 5.349a1 1 0 01-.285 1.05A3.989 3.989 0 015 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.738-5.42-1.233-.617a1 1 0 01.894-1.788l1.599.799L9 4.323V3a1 1 0 011-1z" clipRule="evenodd"/>
  </svg>
}
function PerfIcon() {
  return <svg className="w-4 h-4 text-[#fd7325]" viewBox="0 0 20 20" fill="currentColor">
    <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z"/>
  </svg>
}
function SettingsIcon() {
  return <svg className="w-4 h-4 text-[#fd7325]" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd"/>
  </svg>
}
