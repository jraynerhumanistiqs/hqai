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
  onClose?: () => void
}

export default function Sidebar({ userName, bizName, advisorName, plan, onClose }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [peopleOpen, setPeopleOpen] = useState(false)
  const [recruitOpen, setRecruitOpen] = useState(false)
  const [docsOpen, setDocsOpen] = useState(false)
  const [complianceOpen, setComplianceOpen] = useState(false)
  const [leadershipOpen, setLeadershipOpen] = useState(false)
  const [recruitmentToolsOpen, setRecruitmentToolsOpen] = useState(false)
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
    <aside className="w-[252px] flex-shrink-0 bg-[#000000] flex flex-col overflow-hidden h-full">
      {/* Logo */}
      <div className="px-5 pt-6 pb-4 border-b border-white/8 flex items-center justify-between">
        <Image src="/logo.svg" alt="HQ.ai" width={150} height={150} className="opacity-90 w-[120px] h-auto" />
        {onClose && (
          <button onClick={onClose} className="lg:hidden w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors" aria-label="Close menu">
            <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor" className="text-white/50">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/>
            </svg>
          </button>
        )}
      </div>

      {/* Business pill */}
      <div className="px-4 pt-4 pb-2">
        <div className="bg-white/6 rounded-lg px-3 py-2.5 flex items-center gap-2">
          <div className="w-5 h-5 bg-white/20 rounded-md flex items-center justify-center flex-shrink-0">
            <span className="text-[10px] text-white font-medium">{bizName[0]?.toUpperCase()}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-white/80 truncate font-display">{bizName}</p>
            <p className="text-[10px] text-white/35">{planLabel[plan] || 'Growth'} plan</p>
          </div>
        </div>
      </div>

      {/* Scrollable nav area */}
      <div className="flex-1 overflow-y-auto scrollbar-thin px-2 mt-2">
        {/* Modules */}
        <p className="text-[10px] font-bold text-white uppercase tracking-widest px-2 mb-1.5 font-display">Modules</p>

        {/* Home */}
        <Link href="/dashboard"
          className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg mb-0.5 text-sm font-bold transition-all group
            ${isActive('/dashboard', true)
              ? 'bg-white/11 text-white'
              : 'text-white/50 hover:bg-white/7 hover:text-white/80'}`}>
          <HomeIcon active={isActive('/dashboard', true)} />
          <span className="flex-1">Home</span>
        </Link>

        {/* HQ People dropdown */}
        <button onClick={() => setPeopleOpen(!peopleOpen)}
          className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg mb-0.5 text-sm font-bold transition-all
            ${isActive('/dashboard/people') || isActive('/dashboard/templates')
              ? 'bg-white/11 text-white'
              : 'text-white/50 hover:bg-white/7 hover:text-white/80'}`}>
          <PeopleIcon active={isActive('/dashboard/people')} />
          <span className="flex-1 text-left">HQ People</span>
          <ChevronIcon open={peopleOpen} />
        </button>
        {peopleOpen && (
          <div className="ml-6 space-y-0.5">
            <Link href="/dashboard/people"
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all
                ${isActive('/dashboard/people') ? 'bg-white/11 text-white' : 'text-white/40 hover:bg-white/7 hover:text-white/70'}`}>
              Chat with {advisorName || 'HQ'}
            </Link>
            <Link href="/dashboard/templates"
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all
                ${isActive('/dashboard/templates') ? 'bg-white/11 text-white' : 'text-white/40 hover:bg-white/7 hover:text-white/70'}`}>
              HR Templates
            </Link>
          </div>
        )}

        {/* HQ Recruit dropdown */}
        <button onClick={() => setRecruitOpen(!recruitOpen)}
          className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg mb-0.5 text-sm font-bold transition-all
            ${isActive('/dashboard/recruit')
              ? 'bg-white/11 text-white'
              : 'text-white/50 hover:bg-white/7 hover:text-white/80'}`}>
          <RecruitIcon active={isActive('/dashboard/recruit')} />
          <span className="flex-1 text-left">HQ Recruit</span>
          <ChevronIcon open={recruitOpen} />
        </button>
        {recruitOpen && (
          <div className="ml-6 space-y-0.5">
            <Link href="/dashboard/recruit"
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all
                ${isActive('/dashboard/recruit') ? 'bg-white/11 text-white' : 'text-white/40 hover:bg-white/7 hover:text-white/70'}`}>
              Dashboard
            </Link>
          </div>
        )}

        {/* Documents dropdown */}
        <button onClick={() => setDocsOpen(!docsOpen)}
          className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg mb-0.5 text-sm font-bold transition-all
            ${isActive('/dashboard/documents')
              ? 'bg-white/11 text-white'
              : 'text-white/50 hover:bg-white/7 hover:text-white/80'}`}>
          <DocsIcon active={isActive('/dashboard/documents')} />
          <span className="flex-1 text-left">Documents</span>
          <ChevronIcon open={docsOpen} />
        </button>
        {docsOpen && (
          <div className="ml-6 space-y-0.5">
            <Link href="/dashboard/documents"
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all
                ${isActive('/dashboard/documents') ? 'bg-white/11 text-white' : 'text-white/40 hover:bg-white/7 hover:text-white/70'}`}>
              <span>My Documents</span>
              <InfoTooltip text="Documents your HQ.ai Advisor has created in chat" />
            </Link>
            <Link href="/dashboard/templates"
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all
                ${isActive('/dashboard/templates') ? 'bg-white/11 text-white' : 'text-white/40 hover:bg-white/7 hover:text-white/70'}`}>
              <span>Templates</span>
              <InfoTooltip text="Best practice templates curated by HQ.ai experts (subscribers only)" />
            </Link>
          </div>
        )}

        {/* Tools — 3 categories */}
        <p className="text-[10px] font-bold text-white uppercase tracking-widest px-2 mb-1.5 mt-4 font-display">Tools</p>

        {/* Compliance */}
        <button onClick={() => setComplianceOpen(!complianceOpen)}
          className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg mb-0.5 text-sm font-bold transition-all
            ${isActive('/dashboard/compliance') || isActive('/dashboard/awards')
              ? 'bg-white/11 text-white'
              : 'text-white/50 hover:bg-white/7 hover:text-white/80'}`}>
          <ShieldIcon active={isActive('/dashboard/compliance') || isActive('/dashboard/awards')} />
          <span className="flex-1 text-left">Compliance</span>
          <ChevronIcon open={complianceOpen} />
        </button>
        {complianceOpen && (
          <div className="ml-6 space-y-0.5">
            <Link href="/dashboard/compliance/assessment"
              className={`block px-3 py-2 rounded-lg text-xs font-bold transition-all
                ${isActive('/dashboard/compliance/assessment') ? 'bg-white/11 text-white' : 'text-white/40 hover:bg-white/7 hover:text-white/70'}`}>
              Workplace Compliance Assessment
            </Link>
            <Link href="/dashboard/compliance/audit"
              className={`block px-3 py-2 rounded-lg text-xs font-bold transition-all
                ${isActive('/dashboard/compliance/audit') ? 'bg-white/11 text-white' : 'text-white/40 hover:bg-white/7 hover:text-white/70'}`}>
              Workplace Compliance Audit
            </Link>
            <Link href="/dashboard/awards"
              className={`block px-3 py-2 rounded-lg text-xs font-bold transition-all
                ${isActive('/dashboard/awards') ? 'bg-white/11 text-white' : 'text-white/40 hover:bg-white/7 hover:text-white/70'}`}>
              Award Interpreter
            </Link>
          </div>
        )}

        {/* Leadership */}
        <button onClick={() => setLeadershipOpen(!leadershipOpen)}
          className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg mb-0.5 text-sm font-bold transition-all
            ${isActive('/dashboard/performance') || isActive('/dashboard/leadership')
              ? 'bg-white/11 text-white'
              : 'text-white/50 hover:bg-white/7 hover:text-white/80'}`}>
          <LeaderIcon active={isActive('/dashboard/performance') || isActive('/dashboard/leadership')} />
          <span className="flex-1 text-left">Leadership</span>
          <ChevronIcon open={leadershipOpen} />
        </button>
        {leadershipOpen && (
          <div className="ml-6 space-y-0.5">
            <Link href="/dashboard/performance"
              className={`block px-3 py-2 rounded-lg text-xs font-bold transition-all
                ${isActive('/dashboard/performance') ? 'bg-white/11 text-white' : 'text-white/40 hover:bg-white/7 hover:text-white/70'}`}>
              Performance Management
            </Link>
            <Link href="/dashboard/leadership/development"
              className={`block px-3 py-2 rounded-lg text-xs font-bold transition-all
                ${isActive('/dashboard/leadership/development') ? 'bg-white/11 text-white' : 'text-white/40 hover:bg-white/7 hover:text-white/70'}`}>
              Performance Development
            </Link>
            <Link href="/dashboard/leadership/coaching"
              className={`block px-3 py-2 rounded-lg text-xs font-bold transition-all
                ${isActive('/dashboard/leadership/coaching') ? 'bg-white/11 text-white' : 'text-white/40 hover:bg-white/7 hover:text-white/70'}`}>
              Coaching
            </Link>
          </div>
        )}

        {/* Recruitment Tools */}
        <button onClick={() => setRecruitmentToolsOpen(!recruitmentToolsOpen)}
          className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg mb-0.5 text-sm font-bold transition-all
            ${isActive('/dashboard/recruitment-tools')
              ? 'bg-white/11 text-white'
              : 'text-white/50 hover:bg-white/7 hover:text-white/80'}`}>
          <SearchIcon active={isActive('/dashboard/recruitment-tools')} />
          <span className="flex-1 text-left">Recruitment</span>
          <ChevronIcon open={recruitmentToolsOpen} />
        </button>
        {recruitmentToolsOpen && (
          <div className="ml-6 space-y-0.5">
            <Link href="/dashboard/recruitment-tools/shortlist"
              className={`block px-3 py-2 rounded-lg text-xs font-bold transition-all
                ${isActive('/dashboard/recruitment-tools/shortlist') ? 'bg-white/11 text-white' : 'text-white/40 hover:bg-white/7 hover:text-white/70'}`}>
              Shortlist Agent
            </Link>
            <Link href="/dashboard/recruitment-tools/screening"
              className={`block px-3 py-2 rounded-lg text-xs font-bold transition-all
                ${isActive('/dashboard/recruitment-tools/screening') ? 'bg-white/11 text-white' : 'text-white/40 hover:bg-white/7 hover:text-white/70'}`}>
              Candidate Screening
            </Link>
            <Link href="/dashboard/recruitment-tools/campaign-coach"
              className={`block px-3 py-2 rounded-lg text-xs font-bold transition-all
                ${isActive('/dashboard/recruitment-tools/campaign-coach') ? 'bg-white/11 text-white' : 'text-white/40 hover:bg-white/7 hover:text-white/70'}`}>
              Campaign Coach
            </Link>
          </div>
        )}

        {/* Settings */}
        <Link href="/dashboard/settings"
          className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg mb-0.5 text-sm font-bold transition-all mt-2
            ${isActive('/dashboard/settings')
              ? 'bg-white/11 text-white'
              : 'text-white/50 hover:bg-white/7 hover:text-white/80'}`}>
          <SettingsIcon active={isActive('/dashboard/settings')} />
          <span>Settings</span>
        </Link>
      </div>

      {/* Footer */}
      <div className="px-3 pb-4 space-y-2 flex-shrink-0">
        {/* Advisor card */}
        <div className="bg-[#111111] border border-[#222222] rounded-xl p-3">
          <p className="text-[10px] text-white/60 font-bold uppercase tracking-wider mb-2">Your HQ.ai Advisor</p>
          <div className="flex items-center gap-2 mb-2">
            <div className="relative">
              <div className="w-7 h-7 bg-white/20 rounded-full flex items-center justify-center text-xs font-medium text-white">
                {advisorName[0]}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-400 rounded-full border border-[#000000] animate-pulse" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">{advisorName}</p>
            </div>
          </div>
          <button onClick={handleContactPartner}
            className="block w-full text-center bg-white/10 hover:bg-white/20 text-white text-xs font-bold py-1.5 rounded-lg transition-colors">
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
                className="flex-1 py-2.5 bg-black hover:bg-[#1a1a1a] text-white rounded-xl text-sm font-bold text-center transition-colors">
                Book a call
              </Link>
            </div>
          </div>
        </div>
      )}
    </aside>
  )
}

// Reusable tooltip that positions below instead of left (prevents cut-off)
function InfoTooltip({ text }: { text: string }) {
  return (
    <span className="relative group ml-auto">
      <svg className="w-3.5 h-3.5 text-white/25 hover:text-white/50 cursor-help" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/>
      </svg>
      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-[#222222] text-white text-[10px] px-2.5 py-1.5 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-lg">
        {text}
      </span>
    </span>
  )
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd"/>
    </svg>
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
function ShieldIcon({ active }: { active: boolean }) {
  return <svg className={`w-4 h-4 flex-shrink-0 ${active ? 'opacity-100' : 'opacity-60'}`} viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
  </svg>
}
function LeaderIcon({ active }: { active: boolean }) {
  return <svg className={`w-4 h-4 flex-shrink-0 ${active ? 'opacity-100' : 'opacity-60'}`} viewBox="0 0 20 20" fill="currentColor">
    <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z"/>
  </svg>
}
function SearchIcon({ active }: { active: boolean }) {
  return <svg className={`w-4 h-4 flex-shrink-0 ${active ? 'opacity-100' : 'opacity-60'}`} viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd"/>
  </svg>
}
function SettingsIcon({ active }: { active: boolean }) {
  return <svg className={`w-4 h-4 flex-shrink-0 ${active ? 'opacity-100' : 'opacity-60'}`} viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd"/>
  </svg>
}
