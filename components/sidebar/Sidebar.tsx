'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface SidebarProps {
  userName: string
  bizName: string
  advisorName: string
  plan: string
}

const NAV = [
  { href: '/dashboard', label: 'Home', icon: HomeIcon, exact: true },
  { href: '/dashboard/people', label: 'HQ People', icon: PeopleIcon, badge: 'HR' },
  { href: '/dashboard/recruit', label: 'HQ Recruit', icon: RecruitIcon },
  { href: '/dashboard/documents', label: 'Documents', icon: DocsIcon },
]

const TOOLS = [
  { href: '/dashboard/awards', label: 'Award Interpreter', icon: AwardIcon },
  { href: '/dashboard/performance', label: 'Performance', icon: PerfIcon },
  { href: '/dashboard/settings', label: 'Settings', icon: SettingsIcon },
]

export default function Sidebar({ userName, bizName, advisorName, plan }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href
    return pathname.startsWith(href)
  }

  const planLabel: Record<string, string> = {
    essentials: 'Essentials', growth: 'Growth', scale: 'Scale'
  }

  return (
    <aside className="w-[252px] flex-shrink-0 bg-ink flex flex-col overflow-hidden">
      {/* Logo */}
      <div className="px-5 pt-6 pb-4 border-b border-white/8">
        <div className="flex items-center gap-2.5 mb-1">
          <div className="w-8 h-8 bg-teal2 rounded-lg flex items-center justify-center text-white font-serif text-sm">HQ</div>
          <span className="font-serif text-lg text-white tracking-tight">HQ.ai</span>
        </div>
        <p className="text-[10px] text-white/30 uppercase tracking-widest pl-[42px]">by Humanistiqs</p>
      </div>

      {/* Business pill */}
      <div className="px-4 pt-4 pb-2">
        <div className="bg-white/6 rounded-lg px-3 py-2.5 flex items-center gap-2">
          <div className="w-5 h-5 bg-teal/30 rounded-md flex items-center justify-center flex-shrink-0">
            <span className="text-[10px] text-teal3 font-medium">{bizName[0]?.toUpperCase()}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-white/80 truncate">{bizName}</p>
            <p className="text-[10px] text-white/35">{planLabel[plan] || 'Growth'} plan</p>
          </div>
        </div>
      </div>

      {/* Main nav */}
      <nav className="px-2 mt-2">
        <p className="text-[10px] font-medium text-white/25 uppercase tracking-widest px-2 mb-1.5">Modules</p>
        {NAV.map(({ href, label, icon: Icon, badge, exact }) => (
          <Link key={href} href={href}
            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg mb-0.5 text-sm transition-all group
              ${isActive(href, exact)
                ? 'bg-white/11 text-white'
                : 'text-white/50 hover:bg-white/7 hover:text-white/80'}`}>
            <Icon active={isActive(href, exact)} />
            <span className="flex-1">{label}</span>
            {badge && (
              <span className="text-[10px] font-medium bg-teal2/80 text-white px-2 py-0.5 rounded-full">{badge}</span>
            )}
          </Link>
        ))}
      </nav>

      {/* Tools nav */}
      <nav className="px-2 mt-4">
        <p className="text-[10px] font-medium text-white/25 uppercase tracking-widest px-2 mb-1.5">Tools</p>
        {TOOLS.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href}
            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg mb-0.5 text-sm transition-all
              ${isActive(href)
                ? 'bg-white/11 text-white'
                : 'text-white/50 hover:bg-white/7 hover:text-white/80'}`}>
            <Icon active={isActive(href)} />
            <span>{label}</span>
          </Link>
        ))}
      </nav>

      {/* Footer */}
      <div className="mt-auto px-3 pb-4 space-y-2">
        {/* Advisor card */}
        <div className="bg-teal/15 border border-teal/20 rounded-xl p-3">
          <p className="text-[10px] text-white/35 uppercase tracking-wider mb-2">Your advisor</p>
          <div className="flex items-center gap-2 mb-2">
            <div className="relative">
              <div className="w-7 h-7 bg-teal2/40 rounded-full flex items-center justify-center text-xs font-medium text-teal3">
                {advisorName[0]}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-400 rounded-full border border-ink animate-pulse" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">{advisorName}</p>
              <p className="text-[10px] text-white/40">Senior HR Advisor</p>
            </div>
          </div>
          <Link href="/dashboard/booking"
            className="block w-full text-center bg-teal hover:bg-teal2 text-white text-xs font-medium py-1.5 rounded-lg transition-colors">
            Book a call
          </Link>
        </div>

        {/* Sign out */}
        <button onClick={signOut}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-white/35 hover:text-white/60 text-xs transition-colors">
          <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd"/>
          </svg>
          Sign out
        </button>
      </div>
    </aside>
  )
}

// Icons
function HomeIcon({ active }: { active: boolean }) {
  return <svg className={`w-4 h-4 flex-shrink-0 ${active ? 'opacity-100' : 'opacity-60'}`} viewBox="0 0 20 20" fill="currentColor">
    <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"/>
  </svg>
}
function PeopleIcon({ active }: { active: boolean }) {
  return <svg className={`w-4 h-4 flex-shrink-0 ${active ? 'opacity-100' : 'opacity-60'}`} viewBox="0 0 20 20" fill="currentColor">
    <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/>
  </svg>
}
function RecruitIcon({ active }: { active: boolean }) {
  return <svg className={`w-4 h-4 flex-shrink-0 ${active ? 'opacity-100' : 'opacity-60'}`} viewBox="0 0 20 20" fill="currentColor">
    <path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z"/>
  </svg>
}
function DocsIcon({ active }: { active: boolean }) {
  return <svg className={`w-4 h-4 flex-shrink-0 ${active ? 'opacity-100' : 'opacity-60'}`} viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd"/>
  </svg>
}
function AwardIcon({ active }: { active: boolean }) {
  return <svg className={`w-4 h-4 flex-shrink-0 ${active ? 'opacity-100' : 'opacity-60'}`} viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.233.616 1.738 5.42a1 1 0 01-.285 1.05A3.989 3.989 0 0115 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.715-5.349L11 6.477V16h2a1 1 0 110 2H7a1 1 0 110-2h2V6.477L6.237 7.582l1.715 5.349a1 1 0 01-.285 1.05A3.989 3.989 0 015 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.738-5.42-1.233-.617a1 1 0 01.894-1.788l1.599.799L9 4.323V3a1 1 0 011-1z" clipRule="evenodd"/>
  </svg>
}
function PerfIcon({ active }: { active: boolean }) {
  return <svg className={`w-4 h-4 flex-shrink-0 ${active ? 'opacity-100' : 'opacity-60'}`} viewBox="0 0 20 20" fill="currentColor">
    <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z"/>
  </svg>
}
function SettingsIcon({ active }: { active: boolean }) {
  return <svg className={`w-4 h-4 flex-shrink-0 ${active ? 'opacity-100' : 'opacity-60'}`} viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd"/>
  </svg>
}
