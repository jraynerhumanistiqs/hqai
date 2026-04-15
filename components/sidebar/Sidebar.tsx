'use client'
import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
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
  { href: '/dashboard/people', label: 'HQ People', icon: PeopleIcon },
  { href: '/dashboard/recruit', label: 'HQ Recruit', icon: RecruitIcon },
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
  const [docsOpen, setDocsOpen] = useState(false)
  const [showPartnerPopup, setShowPartnerPopup] = useState(false)

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

  function handleContactPartner() {
    if (plan === 'free') {
      setShowPartnerPopup(true)
    } else {
      router.push('/dashboard/booking')
    }
  }

  return (
    <aside className="w-[252px] flex-shrink-0 bg-[#000000] flex flex-col overflow-hidden">
      {/* Logo */}
      <div className="px-5 pt-6 pb-4 border-b border-white/8">
        <div className="flex items-center gap-2.5 mb-1">
          {/* TODO: Replace with uploaded logo image when available */}
          <Image src="/logo.svg" alt="HQ.ai" width={32} height={32} className="rounded-lg" />
          <span className="font-serif text-lg text-white tracking-tight">HQ.ai</span>
        </div>
        <p className="text-[10px] text-white/30 uppercase tracking-widest pl-[42px]">by Humanistiqs</p>
      </div>

      {/* Business pill */}
      <div className="px-4 pt-4 pb-2">
        <div className="bg-white/6 rounded-lg px-3 py-2.5 flex items-center gap-2">
          <div className="w-5 h-5 bg-[#fd7325]/30 rounded-md flex items-center justify-center flex-shrink-0">
            <span className="text-[10px] text-[#fd7325] font-medium">{bizName[0]?.toUpperCase()}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-white/80 truncate font-display">{bizName}</p>
            <p className="text-[10px] text-white/35">{planLabel[plan] || 'Growth'} plan</p>
          </div>
        </div>
      </div>

      {/* Main nav */}
      <nav className="px-2 mt-2">
        <p className="text-[10px] font-bold text-white uppercase tracking-widest px-2 mb-1.5 font-display">Modules</p>
        {NAV.map(({ href, label, icon: Icon, exact }) => (
          <Link key={href} href={href}
            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg mb-0.5 text-sm font-bold transition-all group
              ${isActive(href, exact)
                ? 'bg-white/11 text-white'
                : 'text-white/50 hover:bg-white/7 hover:text-white/80'}`}>
            <Icon active={isActive(href, exact)} />
            <span className="flex-1">{label}</span>
          </Link>
        ))}

        {/* Documents dropdown */}
        <button onClick={() => setDocsOpen(!docsOpen)}
          className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg mb-0.5 text-sm font-bold transition-all
            ${isActive('/dashboard/documents') || isActive('/dashboard/templates')
              ? 'bg-white/11 text-white'
              : 'text-white/50 hover:bg-white/7 hover:text-white/80'}`}>
          <DocsIcon active={isActive('/dashboard/documents') || isActive('/dashboard/templates')} />
          <span className="flex-1 text-left">Documents</span>
          <svg className={`w-3 h-3 transition-transform ${docsOpen ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd"/>
          </svg>
        </button>
        {docsOpen && (
          <div className="ml-6 space-y-0.5">
            <Link href="/dashboard/documents"
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all
                ${isActive('/dashboard/documents') ? 'bg-white/11 text-white' : 'text-white/40 hover:bg-white/7 hover:text-white/70'}`}>
              <span>My Documents</span>
              <span className="relative group ml-auto">
                <svg className="w-3.5 h-3.5 text-white/25 hover:text-white/50 cursor-help" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/>
                </svg>
                <span className="absolute left-full ml-2 top-1/2 -translate-y-1/2 bg-[#222222] text-white text-[10px] px-2.5 py-1.5 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                  Documents your HQ.ai Advisor has created in chat
                </span>
              </span>
            </Link>
            <Link href="/dashboard/templates"
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all
                ${isActive('/dashboard/templates') ? 'bg-white/11 text-white' : 'text-white/40 hover:bg-white/7 hover:text-white/70'}`}>
              <span>Templates</span>
              <span className="relative group ml-auto">
                <svg className="w-3.5 h-3.5 text-white/25 hover:text-white/50 cursor-help" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/>
                </svg>
                <span className="absolute left-full ml-2 top-1/2 -translate-y-1/2 bg-[#222222] text-white text-[10px] px-2.5 py-1.5 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                  Best practice templates curated by HQ.ai experts (subscribers only)
                </span>
              </span>
            </Link>
          </div>
        )}
      </nav>

      {/* Tools nav */}
      <nav className="px-2 mt-4">
        <p className="text-[10px] font-bold text-white uppercase tracking-widest px-2 mb-1.5 font-display">Tools</p>
        {TOOLS.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href}
            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg mb-0.5 text-sm font-bold transition-all
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
        <div className="bg-[#111111] border border-[#222222] rounded-xl p-3">
          <p className="text-[10px] text-[#fd7325] font-bold uppercase tracking-wider mb-2">Your HQ.ai Advisor</p>
          <div className="flex items-center gap-2 mb-2">
            <div className="relative">
              <div className="w-7 h-7 bg-[#fd7325]/20 rounded-full flex items-center justify-center text-xs font-medium text-[#fd7325]">
                {advisorName[0]}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-400 rounded-full border border-[#000000] animate-pulse" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">{advisorName}</p>
            </div>
          </div>
          <button onClick={handleContactPartner}
            className="block w-full text-center bg-[#ffffff] hover:bg-gray-100 text-[#fd7325] text-xs font-bold py-1.5 rounded-lg transition-colors">
            Contact HQ Partner
          </button>
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

      {/* Partner popup for free plan */}
      {showPartnerPopup && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setShowPartnerPopup(false)}>
          <div className="bg-[#111111] border border-[#222222] rounded-2xl p-6 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="font-display text-lg font-bold text-white uppercase tracking-wider mb-2">Partner Support</h3>
            <p className="text-sm text-gray-400 mb-4 leading-relaxed">
              Your current subscription does not include HQ Partner support.
            </p>
            <div className="bg-[#1a1a1a] rounded-xl p-4 mb-4">
              <p className="text-xs text-gray-500 mb-1">Hourly rates</p>
              <p className="text-sm font-bold text-white">Phone consultation — $250+GST/hr</p>
            </div>
            <p className="text-sm text-gray-400 mb-4">Would you like to book a call with a HQ Partner?</p>
            <div className="flex gap-3">
              <button onClick={() => setShowPartnerPopup(false)}
                className="flex-1 py-2.5 bg-[#1a1a1a] hover:bg-[#222222] text-gray-400 rounded-xl text-sm font-bold border border-[#333333] transition-colors">
                Maybe later
              </button>
              <Link href="/dashboard/booking" onClick={() => setShowPartnerPopup(false)}
                className="flex-1 py-2.5 bg-[#fd7325] hover:bg-[#e5671f] text-white rounded-xl text-sm font-bold text-center transition-colors">
                Book a call
              </Link>
            </div>
          </div>
        </div>
      )}
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
