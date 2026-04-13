'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface SidebarProps {
  userName: string
  bizName: string
  advisorName: string
  plan: string
}

const NAV_MAIN = [
  { href: '/dashboard',          label: 'HQ People',   icon: PeopleIcon,   badge: 'HR', exact: true },
  { href: '/dashboard/recruit',  label: 'HQ Recruit',  icon: RecruitIcon },
  { href: '/dashboard/documents',label: 'Documents',   icon: DocsIcon },
]

const NAV_TOOLS = [
  { href: '/dashboard/awards',      label: 'Award Interpreter', icon: AwardIcon },
  { href: '/dashboard/performance', label: 'Performance',       icon: PerfIcon },
  { href: '/dashboard/settings',    label: 'Settings',          icon: SettingsIcon },
]

export default function Sidebar({ userName, bizName, advisorName, plan }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function signOut() {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href
    return pathname.startsWith(href)
  }

  const planLabel: Record<string, string> = {
    free: 'Free Trial', essentials: 'Essentials', growth: 'Growth', scale: 'Scale'
  }

  return (
    <aside className="w-[248px] flex-shrink-0 bg-[#0A0A0A] flex flex-col h-full overflow-hidden">

      {/* Logo */}
      <div className="px-5 pt-5 pb-4 border-b border-white/8">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-white rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="font-serif text-[11px] font-normal text-[#0A0A0A]">HQ</span>
          </div>
          <div>
            <span className="font-serif text-[15px] text-white tracking-tight">HQ.ai</span>
            <span className="text-[10px] text-white/30 ml-2">by Humanistiqs</span>
          </div>
        </div>
      </div>

      {/* Business context */}
      <div className="px-3 pt-3 pb-1">
        <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-md bg-white/5">
          <div className="w-5 h-5 bg-[#6F8F7A]/30 rounded flex items-center justify-center flex-shrink-0">
            <span className="text-[10px] text-[#6F8F7A] font-medium">{bizName?.[0]?.toUpperCase()}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-medium text-white/80 truncate leading-tight">{bizName}</p>
            <p className="text-[10px] text-white/30 leading-tight">{planLabel[plan] || 'Growth'}</p>
          </div>
        </div>
      </div>

      {/* Main nav */}
      <nav className="px-2 mt-3 flex-1 overflow-y-auto scrollbar-thin">
        <p className="text-[10px] font-medium text-white/20 uppercase tracking-widest px-2.5 mb-1">Modules</p>
        {NAV_MAIN.map(({ href, label, icon: Icon, badge, exact }) => (
          <Link key={href} href={href}
            className={`flex items-center gap-2.5 px-2.5 py-2 rounded-md mb-0.5 text-[13px] transition-all group relative
              ${isActive(href, exact)
                ? 'bg-white/10 text-white'
                : 'text-white/45 hover:bg-white/6 hover:text-white/75'}`}>
            {isActive(href, exact) && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-[#6F8F7A] rounded-full" />
            )}
            <Icon active={isActive(href, exact)} />
            <span className="flex-1 font-medium">{label}</span>
            {badge && (
              <span className="text-[9px] font-medium bg-[#6F8F7A]/20 text-[#6F8F7A] px-1.5 py-0.5 rounded">
                {badge}
              </span>
            )}
          </Link>
        ))}

        <p className="text-[10px] font-medium text-white/20 uppercase tracking-widest px-2.5 mb-1 mt-4">Tools</p>
        {NAV_TOOLS.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href}
            className={`flex items-center gap-2.5 px-2.5 py-2 rounded-md mb-0.5 text-[13px] transition-all relative
              ${isActive(href)
                ? 'bg-white/10 text-white'
                : 'text-white/45 hover:bg-white/6 hover:text-white/75'}`}>
            {isActive(href) && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-[#6F8F7A] rounded-full" />
            )}
            <Icon active={isActive(href)} />
            <span className="font-medium">{label}</span>
          </Link>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-3 pb-4 space-y-2 border-t border-white/8 pt-3">
        {/* Advisor */}
        <div className="bg-[#6F8F7A]/10 border border-[#6F8F7A]/20 rounded-lg px-3 py-2.5">
          <p className="text-[9px] text-white/25 uppercase tracking-widest mb-1.5">Your advisor</p>
          <div className="flex items-center gap-2">
            <div className="relative flex-shrink-0">
              <div className="w-6 h-6 bg-[#6F8F7A]/30 rounded-full flex items-center justify-center">
                <span className="text-[10px] font-medium text-[#6F8F7A]">{advisorName?.[0]}</span>
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-green-400 rounded-full border border-[#0A0A0A]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-medium text-white leading-tight">{advisorName}</p>
              <p className="text-[10px] text-white/35 leading-tight">Available now</p>
            </div>
          </div>
          <a href="https://calendly.com" target="_blank" rel="noreferrer"
            className="mt-2 block w-full text-center bg-[#6F8F7A] hover:bg-[#5A7A65] text-white text-[11px] font-medium py-1.5 rounded-md transition-colors">
            Book a call
          </a>
        </div>

        {/* User + sign out */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-white/10 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-[9px] text-white/60">{userName?.[0]?.toUpperCase() || 'U'}</span>
            </div>
            <span className="text-[11px] text-white/40 truncate max-w-[120px]">{userName || 'Account'}</span>
          </div>
          <button onClick={signOut}
            className="text-[11px] text-white/25 hover:text-white/50 transition-colors px-1">
            Sign out
          </button>
        </div>
      </div>
    </aside>
  )
}

function PeopleIcon({ active }: { active: boolean }) {
  return <svg className={`w-3.5 h-3.5 flex-shrink-0 ${active ? 'opacity-90' : 'opacity-50'}`} viewBox="0 0 20 20" fill="currentColor">
    <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/>
  </svg>
}
function RecruitIcon({ active }: { active: boolean }) {
  return <svg className={`w-3.5 h-3.5 flex-shrink-0 ${active ? 'opacity-90' : 'opacity-50'}`} viewBox="0 0 20 20" fill="currentColor">
    <path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z"/>
  </svg>
}
function DocsIcon({ active }: { active: boolean }) {
  return <svg className={`w-3.5 h-3.5 flex-shrink-0 ${active ? 'opacity-90' : 'opacity-50'}`} viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd"/>
  </svg>
}
function AwardIcon({ active }: { active: boolean }) {
  return <svg className={`w-3.5 h-3.5 flex-shrink-0 ${active ? 'opacity-90' : 'opacity-50'}`} viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.233.616 1.738 5.42a1 1 0 01-.285 1.05A3.989 3.989 0 0115 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.715-5.349L11 6.477V16h2a1 1 0 110 2H7a1 1 0 110-2h2V6.477L6.237 7.582l1.715 5.349a1 1 0 01-.285 1.05A3.989 3.989 0 015 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.738-5.42-1.233-.617a1 1 0 01.894-1.788l1.599.799L9 4.323V3a1 1 0 011-1z" clipRule="evenodd"/>
  </svg>
}
function PerfIcon({ active }: { active: boolean }) {
  return <svg className={`w-3.5 h-3.5 flex-shrink-0 ${active ? 'opacity-90' : 'opacity-50'}`} viewBox="0 0 20 20" fill="currentColor">
    <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z"/>
  </svg>
}
function SettingsIcon({ active }: { active: boolean }) {
  return <svg className={`w-3.5 h-3.5 flex-shrink-0 ${active ? 'opacity-90' : 'opacity-50'}`} viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd"/>
  </svg>
}
