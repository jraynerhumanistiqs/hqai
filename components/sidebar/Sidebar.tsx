'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Modal from '@/components/ui/Modal'

type AppRole = 'owner' | 'test_admin' | 'member'

interface SidebarProps {
  userName: string
  bizName: string
  bizLogoUrl?: string | null
  advisorName: string
  plan: string
  role?: AppRole
  flags?: Record<string, boolean>
  onClose?: () => void
}

const COLLAPSE_STORAGE_KEY = 'hqai:sidebar-collapsed'
const WIDTH_STORAGE_KEY    = 'hqai:sidebar-width'
const DEFAULT_WIDTH = 232
const MIN_WIDTH = 200
const MAX_WIDTH = 360
const COLLAPSED_WIDTH = 68

export default function Sidebar({ userName, bizName, bizLogoUrl, advisorName, plan, role, flags, onClose }: SidebarProps) {
  const flag = (k: string) => flags?.[k] ?? false
  const isInternal = role === 'owner' || role === 'test_admin'
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  // User-resizable width when expanded - so long role titles in the
  // recruit sub-list aren't truncated. Persisted to localStorage and
  // clamped to a sane range.
  const [width, setWidth] = useState<number>(DEFAULT_WIDTH)
  useEffect(() => {
    try {
      const v = window.localStorage.getItem(WIDTH_STORAGE_KEY)
      const n = v ? parseInt(v, 10) : NaN
      if (Number.isFinite(n) && n >= MIN_WIDTH && n <= MAX_WIDTH) setWidth(n)
    } catch { /* no-op */ }
  }, [])
  // Drag-resize handle. Pointer-based for trackpad + mouse.
  const dragRef = useRef<{ startX: number; startWidth: number } | null>(null)
  function onResizeStart(e: React.PointerEvent) {
    e.preventDefault()
    dragRef.current = { startX: e.clientX, startWidth: width }
    const onMove = (ev: PointerEvent) => {
      if (!dragRef.current) return
      const next = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, dragRef.current.startWidth + (ev.clientX - dragRef.current.startX)))
      setWidth(next)
    }
    const onUp = () => {
      try {
        if (dragRef.current) window.localStorage.setItem(WIDTH_STORAGE_KEY, String(width))
      } catch { /* no-op */ }
      dragRef.current = null
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }
  // Persist after each settle.
  useEffect(() => {
    try { window.localStorage.setItem(WIDTH_STORAGE_KEY, String(width)) } catch { /* no-op */ }
  }, [width])

  // Collapsible sidebar - hydration-safe (always starts expanded on
  // first render so SSR + first paint match). The persisted value is
  // applied client-side on mount. Mobile is always expanded; the
  // collapse only applies at >=lg.
  const [collapsed, setCollapsed] = useState(false)
  useEffect(() => {
    try {
      const v = window.localStorage.getItem(COLLAPSE_STORAGE_KEY)
      if (v === '1') setCollapsed(true)
    } catch { /* no-op */ }
  }, [])
  function toggleCollapsed() {
    setCollapsed(c => {
      const next = !c
      try { window.localStorage.setItem(COLLAPSE_STORAGE_KEY, next ? '1' : '0') } catch { /* no-op */ }
      return next
    })
  }

  const [peopleOpen, setPeopleOpen] = useState(false)
  const [recruitOpen, setRecruitOpen] = useState(false)
  const [docsOpen, setDocsOpen] = useState(false)
  // Tools is now a collapsible parent containing the (mostly coming-soon)
  // Compliance / Leadership / Business sub-sections. Keeps the sidebar
  // tidy until those modules actually ship.
  const [toolsOpen, setToolsOpen] = useState(false)
  const [complianceOpen, setComplianceOpen] = useState(false)
  const [leadershipOpen, setLeadershipOpen] = useState(false)
  const [businessOpen, setBusinessOpen] = useState(false)

  // When the sidebar collapses to icons-only, force every submenu
  // closed so the vertical stack stays compact and clicks on a parent
  // icon don't open an invisible dropdown.
  useEffect(() => {
    if (collapsed) {
      setPeopleOpen(false)
      setRecruitOpen(false)
      setDocsOpen(false)
      setToolsOpen(false)
      setComplianceOpen(false)
      setLeadershipOpen(false)
      setBusinessOpen(false)
    }
  }, [collapsed])

  // Helper used by the parent dropdown buttons. Clicking a parent in
  // collapsed mode SHOULD expand the sidebar back out AND open that
  // submenu so the user sees something useful instead of an empty
  // dropdown hidden behind the icon-rail width.
  function toggleSubmenu(currentOpen: boolean, setOpen: (b: boolean) => void) {
    if (collapsed) {
      setCollapsed(false)
      try { window.localStorage.setItem(COLLAPSE_STORAGE_KEY, '0') } catch { /* no-op */ }
      setOpen(true)
      return
    }
    setOpen(!currentOpen)
  }
  const [showPartnerPopup, setShowPartnerPopup] = useState(false)
  const [supportType, setSupportType] = useState<'hr' | 'recruitment' | null>(null)
  const [supportSummary, setSupportSummary] = useState('')
  const [supportSending, setSupportSending] = useState(false)
  const [supportSent, setSupportSent] = useState(false)
  const [supportError, setSupportError] = useState<string | null>(null)

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
    setSupportType(null)
    setSupportSummary('')
    setSupportSent(false)
    setSupportError(null)
    setShowPartnerPopup(true)
  }

  async function submitSupportRequest() {
    if (!supportType || !supportSummary.trim()) {
      setSupportError('Add a short summary of what you need')
      return
    }
    setSupportSending(true)
    setSupportError(null)
    try {
      const res = await fetch('/api/support/contact-advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          support_type: supportType,
          summary: supportSummary.trim(),
        }),
      })
      if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new Error(text || `HTTP ${res.status}`)
      }
      setSupportSent(true)
    } catch (err) {
      setSupportError(err instanceof Error ? err.message : 'Could not send')
    }
    setSupportSending(false)
  }

  // When collapsed (desktop only), child labels are hidden via this
  // data attribute -- driven through CSS for a single re-paint. Mobile
  // never collapses (the drawer pattern needs the labels).
  // Width: user-resizable when expanded (200-360px), locked to 68px
  // when collapsed. Set inline so the value can come from React state.
  const widthPx = collapsed ? COLLAPSED_WIDTH : width

  return (
    <aside
      data-collapsed={collapsed ? 'true' : 'false'}
      className="relative flex-shrink-0 bg-bg flex flex-col overflow-hidden h-full group/sidebar transition-[width] duration-200 ease-out border-r border-border"
      style={{ width: `${widthPx}px` }}
    >
      {/* Drag handle - the 4px strip on the right edge. Only visible
          and active at >=lg AND when the sidebar is expanded (no
          point resizing the 68px icon rail). Cursor changes to
          col-resize on hover so users notice it. */}
      {!collapsed && (
        <button
          onPointerDown={onResizeStart}
          aria-label="Resize sidebar"
          title="Drag to resize"
          className="hidden lg:block absolute top-0 right-0 z-20 h-full w-1.5 cursor-col-resize bg-transparent hover:bg-bg-soft active:bg-border transition-colors"
        />
      )}
      {/* Top bar - mobile close + desktop collapse toggle.
          The collapse button stays visible at >=lg and gives the user
          control over whether the sidebar shows labels or just icons. */}
      <div className="flex items-center justify-between px-2.5 pt-3">
        {/* Desktop collapse toggle */}
        <button
          type="button"
          onClick={toggleCollapsed}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-pressed={collapsed}
          className="hidden lg:inline-flex w-8 h-8 items-center justify-center rounded-lg hover:bg-bg-soft transition-colors text-ink-muted hover:text-ink-soft relative z-30"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            {collapsed ? (
              <path fillRule="evenodd" d="M7.293 4.293a1 1 0 011.414 0l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414-1.414L11.586 10 7.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/>
            ) : (
              <path fillRule="evenodd" d="M12.707 4.293a1 1 0 010 1.414L8.414 10l4.293 4.293a1 1 0 01-1.414 1.414l-5-5a1 1 0 010-1.414l5-5a1 1 0 011.414 0z" clipRule="evenodd"/>
            )}
          </svg>
        </button>
        {/* Mobile close - the brand logo used to sit here too; moved
            to the footer above the advisor support callout. */}
        {onClose ? (
          <button onClick={onClose} className="lg:hidden w-8 h-8 flex items-center justify-center rounded-lg hover:bg-bg-soft transition-colors" aria-label="Close menu">
            <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor" className="text-ink-muted" aria-hidden="true">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/>
            </svg>
          </button>
        ) : <span aria-hidden className="lg:hidden w-8 h-8" />}
      </div>

      {/* Business pill - hidden in collapsed mode to keep the rail
          tight. The brand logo at the footer carries enough identity
          for the collapsed state. */}
      <div className="px-3 pt-3 pb-1.5 sidebar-collapsible-hide">
        <div className="bg-bg-soft rounded-lg px-2.5 py-2 flex items-center gap-2 min-h-[40px]">
          {bizLogoUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={bizLogoUrl}
              alt={bizName}
              className="max-h-7 max-w-full w-auto h-auto object-contain"
            />
          ) : (
            <p className="flex-1 min-w-0 text-[13px] font-normal text-ink uppercase truncate">
              {bizName}
            </p>
          )}
        </div>
      </div>

      {/* Scrollable nav area. Groups are separated by gap-7 with gap-0.5
          between items inside a group. Top-level items are h-9, px-3,
          rounded-full at 13px - the premium-minimal nav pattern. */}
      {/* Scroll area: Workspace fills the top, Account + Support pinned
          via mt-auto to the bottom so the Contact HQ Advisor button
          doesn't push off-screen when Workspace is tall. Tightened
          gap from 7 to 4 to keep the three groups visually grouped
          without needing to scroll. */}
      <div className="flex-1 overflow-y-auto scrollbar-thin px-2 mt-2 flex flex-col gap-4">
        {/* Workspace group ------------------------------------------------ */}
        <div className="flex flex-col gap-0.5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-muted px-3 mb-1 sidebar-collapsible-hide">Workspace</p>

        {/* Home */}
        <Link href="/dashboard" title="Home" aria-label="Home"
          className={`flex items-center gap-2.5 h-9 px-3 rounded-full text-[13px] transition-all group
            ${isActive('/dashboard', true)
              ? 'bg-ink text-bg-elevated font-semibold'
              : 'text-ink-soft hover:bg-bg-soft hover:text-ink'}`}>
          <HomeIcon active={isActive('/dashboard', true)} />
          <span className="flex-1">Home</span>
        </Link>

        {/* HQ People dropdown */}
        <button onClick={() => toggleSubmenu(peopleOpen, setPeopleOpen)} title="HQ People" aria-label="HQ People"
          className={`w-full flex items-center gap-2.5 h-9 px-3 rounded-full text-[13px] transition-all
            ${isActive('/dashboard/people') || isActive('/dashboard/templates')
              ? 'bg-ink text-bg-elevated font-semibold'
              : 'text-ink-soft hover:bg-bg-soft hover:text-ink'}`}>
          <PeopleIcon active={isActive('/dashboard/people')} />
          <span className="flex-1 text-left">HQ People</span>
          <ChevronIcon open={peopleOpen} />
        </button>
        {peopleOpen && (
          <div className="ml-6 space-y-0.5">
            {/* B0.2 - HQ People is split into AI Advisor (chat) and
                AI Administrator (doc engine). Separate nav items so
                each tool reads as a named product surface. The
                Administrator engine ships across Weeks 3-5. */}
            <Link href="/dashboard/people/advisor"
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[13px] transition-all
                ${isActive('/dashboard/people/advisor') ? 'bg-ink text-bg-elevated' : 'text-ink hover:bg-bg-soft'}`}>
              AI Advisor
            </Link>
            <Link href="/dashboard/people/administrator"
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[13px] transition-all
                ${isActive('/dashboard/people/administrator') ? 'bg-ink text-bg-elevated' : 'text-ink hover:bg-bg-soft'}`}>
              AI Administrator
            </Link>
            <Link href="/dashboard/templates"
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[13px] transition-all
                ${isActive('/dashboard/templates') ? 'bg-ink text-bg-elevated' : 'text-ink hover:bg-bg-soft'}`}>
              HR Templates
            </Link>
          </div>
        )}

        {/* HQ Recruit dropdown */}
        <button onClick={() => toggleSubmenu(recruitOpen, setRecruitOpen)} title="HQ Recruit" aria-label="HQ Recruit"
          className={`w-full flex items-center gap-2.5 h-9 px-3 rounded-full text-[13px] transition-all
            ${isActive('/dashboard/recruit')
              ? 'bg-ink text-bg-elevated font-semibold'
              : 'text-ink-soft hover:bg-bg-soft hover:text-ink'}`}>
          <RecruitIcon active={isActive('/dashboard/recruit')} />
          <span className="flex-1 text-left">HQ Recruit</span>
          <ChevronIcon open={recruitOpen} />
        </button>
        {recruitOpen && (
          <div className="ml-6 space-y-0.5">
            <Link href="/dashboard/recruit/campaign-coach"
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[13px] transition-all
                ${isActive('/dashboard/recruit/campaign-coach') ? 'bg-ink text-bg-elevated' : 'text-ink hover:bg-bg-soft'}`}>
              Campaign Coach
            </Link>
            {/* The standalone CV Scoring Agent has merged into the
                Shortlist Agent as Step 1. CV scoring now lives inside a
                role. This entry stays for the ad-hoc "I just want to
                score a CV, no role yet" use case and points at the same
                /cv-screening route running without a role anchor. */}
            <Link href="/dashboard/recruit/shortlist"
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[13px] transition-all
                ${isActive('/dashboard/recruit/shortlist') ? 'bg-ink text-bg-elevated' : 'text-ink hover:bg-bg-soft'}`}>
              Shortlist Agent
              <InfoTooltip text="Full hiring workflow - score, prescreen, shortlist and decide inside one role." />
            </Link>
            <Link href="/dashboard/recruit/cv-screening"
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[13px] transition-all
                ${isActive('/dashboard/recruit/cv-screening') ? 'bg-ink text-bg-elevated' : 'text-ink-soft hover:bg-bg-soft hover:text-ink'}`}>
              Quick CV score
              <InfoTooltip text="Score one or more CVs without setting up a role first." />
            </Link>
            <Link href="/dashboard/recruit/templates"
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[13px] transition-all
                ${isActive('/dashboard/recruit/templates') ? 'bg-ink text-bg-elevated' : 'text-ink hover:bg-bg-soft'}`}>
              Recruitment Templates
            </Link>
          </div>
        )}

        {/* Documents dropdown */}
        <button onClick={() => toggleSubmenu(docsOpen, setDocsOpen)} title="Documents" aria-label="Documents"
          className={`w-full flex items-center gap-2.5 h-9 px-3 rounded-full text-[13px] transition-all
            ${isActive('/dashboard/documents', true)
              ? 'bg-ink text-bg-elevated font-semibold'
              : 'text-ink-soft hover:bg-bg-soft hover:text-ink'}`}>
          <DocsIcon active={isActive('/dashboard/documents')} />
          <span className="flex-1 text-left">Documents</span>
          <ChevronIcon open={docsOpen} />
        </button>
        {docsOpen && (
          <div className="ml-6 space-y-0.5">
            <Link href="/dashboard/documents"
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[13px] transition-all
                ${isActive('/dashboard/documents') ? 'bg-ink text-bg-elevated' : 'text-ink hover:bg-bg-soft'}`}>
              <span>My Documents</span>
            </Link>
          </div>
        )}

        {/* Tools - single collapsible parent wrapping the (active-only)
            sub-tools (Compliance / Leadership / Business). Only shown
            when a feature flag is set OR the user is internal staff;
            active customers don't see a "coming soon" tease. */}
        {(flag('compliance_audit') || flag('compliance_assessment') || flag('awards_interpreter')
          || flag('team_development') || flag('strategy_coach') || isInternal) && (
          <>
            <button onClick={() => toggleSubmenu(toolsOpen, setToolsOpen)} title="Tools" aria-label="Tools"
              className={`w-full flex items-center gap-2.5 h-9 px-3 rounded-full text-[13px] transition-all
                ${isActive('/dashboard/compliance') || isActive('/dashboard/awards')
                  || isActive('/dashboard/performance') || isActive('/dashboard/leadership')
                  || isActive('/dashboard/business')
                  ? 'bg-ink text-bg-elevated font-semibold'
                  : 'text-ink-soft hover:bg-bg-soft hover:text-ink'}`}>
              <ToolsIcon active={toolsOpen} />
              <span className="flex-1 text-left">Tools</span>
              <ChevronIcon open={toolsOpen} />
            </button>
            {toolsOpen && (
              <div className="ml-3 mb-1 space-y-0.5">
                {/* Compliance */}
                {(isInternal || flag('compliance_audit') || flag('compliance_assessment') || flag('awards_interpreter')) && (
                  <>
                    <button onClick={() => setComplianceOpen(!complianceOpen)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg mb-0.5 text-sm font-bold transition-all
                        ${isActive('/dashboard/compliance') || isActive('/dashboard/awards')
                          ? 'bg-ink text-bg-elevated'
                          : 'text-ink-soft hover:bg-bg-soft hover:text-ink'}`}>
                      <ShieldIcon active={isActive('/dashboard/compliance') || isActive('/dashboard/awards')} />
                      <span className="flex-1 text-left">Compliance</span>
                      <ChevronIcon open={complianceOpen} />
                    </button>
                    {complianceOpen && (
                      <div className="ml-6 space-y-0.5">
                        {(isInternal || flag('compliance_audit')) && (
                          <Link href="/dashboard/compliance/audit"
                            className={`block px-3 py-1.5 rounded-lg text-[13px] transition-all
                              ${isActive('/dashboard/compliance/audit') ? 'bg-ink text-bg-elevated' : 'text-ink hover:bg-bg-soft'}`}>
                            Workplace Compliance Audit
                          </Link>
                        )}
                        {(isInternal || flag('awards_interpreter')) && (
                          <Link href="/dashboard/awards"
                            className={`block px-3 py-1.5 rounded-lg text-[13px] transition-all
                              ${isActive('/dashboard/awards') ? 'bg-ink text-bg-elevated' : 'text-ink hover:bg-bg-soft'}`}>
                            Award Interpreter
                          </Link>
                        )}
                      </div>
                    )}
                  </>
                )}

                {/* Leadership */}
                {(isInternal || flag('team_development')) && (
                  <>
                    <button onClick={() => setLeadershipOpen(!leadershipOpen)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg mb-0.5 text-sm font-bold transition-all
                        ${isActive('/dashboard/performance') || isActive('/dashboard/leadership')
                          ? 'bg-ink text-bg-elevated'
                          : 'text-ink-soft hover:bg-bg-soft hover:text-ink'}`}>
                      <LeaderIcon active={isActive('/dashboard/performance') || isActive('/dashboard/leadership')} />
                      <span className="flex-1 text-left">Leadership</span>
                      <ChevronIcon open={leadershipOpen} />
                    </button>
                    {leadershipOpen && (
                      <div className="ml-6 space-y-0.5">
                        <Link href="/dashboard/performance"
                          className={`block px-3 py-1.5 rounded-lg text-[13px] transition-all
                            ${isActive('/dashboard/performance') ? 'bg-ink text-bg-elevated' : 'text-ink hover:bg-bg-soft'}`}>
                          Performance Management
                        </Link>
                        <Link href="/dashboard/leadership/development"
                          className={`block px-3 py-1.5 rounded-lg text-[13px] transition-all
                            ${isActive('/dashboard/leadership/development') ? 'bg-ink text-bg-elevated' : 'text-ink hover:bg-bg-soft'}`}>
                          Team Development
                        </Link>
                        <Link href="/dashboard/leadership/coaching"
                          className={`block px-3 py-1.5 rounded-lg text-[13px] transition-all
                            ${isActive('/dashboard/leadership/coaching') ? 'bg-ink text-bg-elevated' : 'text-ink hover:bg-bg-soft'}`}>
                          Coaching
                        </Link>
                      </div>
                    )}
                  </>
                )}

                {/* Business */}
                {(isInternal || flag('strategy_coach')) && (
                  <>
                    <button onClick={() => setBusinessOpen(!businessOpen)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg mb-0.5 text-sm font-bold transition-all
                        ${isActive('/dashboard/business')
                          ? 'bg-ink text-bg-elevated'
                          : 'text-ink-soft hover:bg-bg-soft hover:text-ink'}`}>
                      <BusinessIcon active={isActive('/dashboard/business')} />
                      <span className="flex-1 text-left">Business</span>
                      <ChevronIcon open={businessOpen} />
                    </button>
                    {businessOpen && (
                      <div className="ml-6 space-y-0.5">
                        <Link href="/dashboard/business/strategy-coach"
                          className={`block px-3 py-1.5 rounded-lg text-[13px] transition-all
                            ${isActive('/dashboard/business/strategy-coach') ? 'bg-ink text-bg-elevated' : 'text-ink hover:bg-bg-soft'}`}>
                          Strategy Coach
                        </Link>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </>
        )}

        {/* Read-only watermark for test_admin - text-heavy, hidden in
            the collapsed icon-rail view. */}
        {role === 'test_admin' && (
          <div className="mt-3 mx-2 px-3 py-2 rounded-lg bg-bg-soft text-ink-soft text-[11px] leading-snug sidebar-collapsible-hide">
            <p className="font-bold uppercase tracking-wider mb-0.5">Read-only access</p>
            <p>You can view every surface. Owner approval is required for any save, edit, or send action.</p>
          </div>
        )}
        </div>{/* end Workspace group */}

        {/* Account + Support are pinned to the bottom of the scroll
            area via mt-auto so the Contact HQ Advisor button is
            always visible without scrolling, regardless of how many
            workspace items are above. The internal gap between
            Account and Support is tight (gap-3) so they read as one
            footer-group. */}
        <div className="mt-auto flex flex-col gap-3">

        {/* Account group ------------------------------------------------- */}
        <div className="flex flex-col gap-0.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-muted px-3 mb-1 sidebar-collapsible-hide">Account</p>
          <Link href="/dashboard/settings" title="Settings" aria-label="Settings"
            className={`flex items-center gap-2.5 h-9 px-3 rounded-full text-[13px] transition-all
              ${isActive('/dashboard/settings')
                ? 'bg-ink text-bg-elevated font-semibold'
                : 'text-ink-soft hover:bg-bg-soft hover:text-ink'}`}>
            <SettingsIcon active={isActive('/dashboard/settings')} />
            <span>Settings</span>
          </Link>
          <button onClick={signOut} title="Sign out" aria-label="Sign out"
            className="w-full flex items-center gap-2.5 h-9 px-3 rounded-full text-[13px] text-ink-soft hover:bg-bg-soft hover:text-ink transition-all">
            <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className="flex-shrink-0 opacity-60">
              <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd"/>
            </svg>
            <span>Sign out</span>
          </button>
        </div>

        {/* Support group ------------------------------------------------- */}
        <div className="flex flex-col gap-0.5 sidebar-collapsible-hide">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-muted px-3 mb-1">Support</p>
          <div className="px-1">
            <p className="text-[11px] text-ink-soft leading-snug mb-1.5">
              Need more specific support from a human?
            </p>
            <button
              type="button"
              onClick={handleContactPartner}
              className="block w-full text-center h-9 rounded-full bg-accent text-ink-on-accent text-[12px] font-semibold px-4 hover:bg-accent-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
            >
              Contact HQ Advisor
            </button>
          </div>
        </div>
        </div>{/* end pinned Account+Support footer cluster */}
      </div>{/* end scroll area */}

      {/* Footer brand mark + version stamp. Logo at the bottom is the
          quiet identity anchor; the v0.4 stamp tells testers which
          preview build they're looking at. */}
      <div className="px-2.5 pb-3 pt-3 flex-shrink-0 border-t border-border space-y-2">
        <Link href="/dashboard" onClick={() => onClose?.()} aria-label="Go to dashboard home" className="flex items-center justify-start px-1 pt-1 sidebar-collapsible-hide">
          <Image src="/logo-black.svg" alt="HQ.ai" width={1760} height={570} className="w-[86px] max-w-full h-auto" priority />
        </Link>
        <p className="px-1 text-[10px] uppercase tracking-[0.14em] text-ink-muted sidebar-collapsible-hide">v0.4 preview</p>
      </div>

      {/* Contact HQ Advisor - HR / Recruitment decision-tree modal */}
      <Modal
        open={showPartnerPopup}
        onClose={() => !supportSending && setShowPartnerPopup(false)}
        title="Contact HQ Advisor"
        eyebrow="Human support"
        size="max-w-md"
        dismissable={!supportSending}
      >
        <p className="text-sm text-ink-soft mb-5 -mt-2">
          Your Humanistiqs advisor handles complex matters where AI shouldn't.
        </p>

        {supportSent ? (
          <div className="text-center py-4">
            <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-success/10 text-success flex items-center justify-center">
              <svg className="w-6 h-6" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                <path d="M5 10.5l3.5 3.5L15 6.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <p className="font-sans font-bold text-ink text-base mb-2">Request sent</p>
            <p className="text-sm text-ink-soft">Your Humanistiqs advisor will be in touch within their next available slot.</p>
            <button onClick={() => setShowPartnerPopup(false)}
              className="mt-5 bg-accent text-ink-on-accent text-sm font-bold rounded-full px-4 py-2 hover:bg-accent-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30">
              Done
            </button>
          </div>
        ) : !supportType ? (
          <div className="space-y-3">
            <p className="font-mono text-[11px] uppercase tracking-[0.06em] text-ink-muted">Which area do you need support in?</p>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setSupportType('hr')}
                className="bg-bg-soft hover:bg-border rounded-2xl px-4 py-5 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30">
                <div className="w-9 h-9 mx-auto mb-2 rounded-lg bg-warning/10 text-warning flex items-center justify-center">
                  <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/>
                  </svg>
                </div>
                <p className="text-sm font-bold text-ink">HR Support</p>
                <p className="text-xs text-ink-soft mt-0.5">Compliance, performance, complex cases</p>
              </button>
              <button onClick={() => setSupportType('recruitment')}
                className="bg-bg-soft hover:bg-border rounded-2xl px-4 py-5 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30">
                <div className="w-9 h-9 mx-auto mb-2 rounded-lg bg-info/10 text-info flex items-center justify-center">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="12" cy="12" r="9" />
                    <circle cx="12" cy="12" r="4" />
                    <circle cx="12" cy="12" r="0.6" fill="currentColor" />
                  </svg>
                </div>
                <p className="text-sm font-bold text-ink">Recruitment Support</p>
                <p className="text-xs text-ink-soft mt-0.5">Search, executive hires, retained briefs</p>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-bg-soft rounded-2xl px-4 py-3 flex items-center justify-between">
              <p className="text-sm font-bold text-ink flex items-center gap-2">
                <span className={`w-6 h-6 rounded-md flex items-center justify-center ${supportType === 'hr' ? 'bg-warning/10 text-warning' : 'bg-info/10 text-info'}`}>
                  {supportType === 'hr' ? (
                    <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/>
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <circle cx="12" cy="12" r="9" />
                      <circle cx="12" cy="12" r="4" />
                      <circle cx="12" cy="12" r="0.6" fill="currentColor" />
                    </svg>
                  )}
                </span>
                {supportType === 'hr' ? 'HR Support' : 'Recruitment Support'}
              </p>
              <button onClick={() => setSupportType(null)}
                className="text-xs text-ink-soft hover:text-ink underline">
                Change
              </button>
            </div>
            <div>
              <label className="block font-sans text-xs font-bold text-ink-soft mb-1.5">
                Quick summary
              </label>
              <textarea
                value={supportSummary}
                onChange={e => setSupportSummary(e.target.value)}
                rows={5}
                placeholder={
                  supportType === 'hr'
                    ? 'e.g. Need help with a performance management process for an underperforming senior staff member.'
                    : 'e.g. Need help recruiting an Operations Manager. Brisbane-based, $120-140k, urgent.'
                }
                className="w-full bg-bg-soft rounded-2xl px-4 py-3 text-sm text-ink outline-none focus:bg-bg-elevated focus:ring-2 focus:ring-accent/30 resize-none leading-relaxed transition-colors"
              />
            </div>
            {supportError && (
              <div className="bg-danger/10 text-danger text-sm rounded-2xl px-4 py-3">{supportError}</div>
            )}
            <div className="flex gap-2 pt-1">
              <button onClick={() => setShowPartnerPopup(false)}
                disabled={supportSending}
                className="flex-1 bg-bg-elevated border border-border text-ink text-sm font-bold rounded-full px-4 py-2.5 hover:bg-bg-soft disabled:opacity-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30">
                Cancel
              </button>
              <button onClick={submitSupportRequest}
                disabled={supportSending || !supportSummary.trim()}
                className="flex-1 bg-accent text-ink-on-accent text-sm font-bold rounded-full px-4 py-2.5 hover:bg-accent-hover disabled:opacity-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30">
                {supportSending ? 'Sending...' : 'Send to advisor'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </aside>
  )
}

// Reusable tooltip that positions below instead of left (prevents cut-off)
function InfoTooltip({ text }: { text: string }) {
  return (
    <span className="relative group ml-auto">
      <svg className="w-4 h-4 text-ink-muted hover:text-ink-soft cursor-help" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/>
      </svg>
      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-ink text-bg-elevated text-[10px] px-2.5 py-1.5 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-lg">
        {text}
      </span>
    </span>
  )
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg className={`w-4 h-4 transition-transform sidebar-collapsible-hide ${open ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd"/>
    </svg>
  )
}

// Icons
function HomeIcon({ active }: { active: boolean }) {
  return <svg className={`w-5 h-5 flex-shrink-0 ${active ? 'opacity-100' : 'opacity-60'}`} viewBox="0 0 20 20" fill="currentColor">
    <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"/>
  </svg>
}
function PeopleIcon({ active }: { active: boolean }) {
  return <svg className={`w-5 h-5 flex-shrink-0 ${active ? 'opacity-100' : 'opacity-60'}`} viewBox="0 0 20 20" fill="currentColor">
    <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/>
  </svg>
}
function RecruitIcon({ active }: { active: boolean }) {
  // Briefcase-with-magnifier pattern - reads universally as "search
  // for hires" / recruitment. Distinct from the multi-person PeopleIcon
  // used by HQ People so the two sidebar entries do not blur together.
  return <svg className={`w-5 h-5 flex-shrink-0 ${active ? 'opacity-100' : 'opacity-60'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {/* Briefcase body */}
    <rect x="2.5" y="7.5" width="14" height="11" rx="1.5"/>
    {/* Handle */}
    <path d="M7 7.5V5.5a1.5 1.5 0 0 1 1.5 -1.5h2A1.5 1.5 0 0 1 12 5.5V7.5"/>
    {/* Magnifier circle */}
    <circle cx="17" cy="14" r="3.2"/>
    {/* Magnifier handle */}
    <line x1="19.3" y1="16.3" x2="21.5" y2="18.5"/>
  </svg>
}
function DocsIcon({ active }: { active: boolean }) {
  return <svg className={`w-5 h-5 flex-shrink-0 ${active ? 'opacity-100' : 'opacity-60'}`} viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd"/>
  </svg>
}
function ShieldIcon({ active }: { active: boolean }) {
  return <svg className={`w-5 h-5 flex-shrink-0 ${active ? 'opacity-100' : 'opacity-60'}`} viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
  </svg>
}
function LeaderIcon({ active }: { active: boolean }) {
  return <svg className={`w-5 h-5 flex-shrink-0 ${active ? 'opacity-100' : 'opacity-60'}`} viewBox="0 0 20 20" fill="currentColor">
    <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z"/>
  </svg>
}
function BusinessIcon({ active }: { active: boolean }) {
  return <svg className={`w-5 h-5 flex-shrink-0 ${active ? 'opacity-100' : 'opacity-60'}`} viewBox="0 0 20 20" fill="currentColor">
    <path d="M4 4a2 2 0 00-2 2v9a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm2 3a1 1 0 011-1h6a1 1 0 010 2H7a1 1 0 01-1-1zm0 3a1 1 0 011-1h6a1 1 0 010 2H7a1 1 0 01-1-1zm0 3a1 1 0 011-1h3a1 1 0 010 2H7a1 1 0 01-1-1z"/>
  </svg>
}
function SearchIcon({ active }: { active: boolean }) {
  return <svg className={`w-5 h-5 flex-shrink-0 ${active ? 'opacity-100' : 'opacity-60'}`} viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd"/>
  </svg>
}
function ToolsIcon({ active }: { active: boolean }) {
  return <svg className={`w-5 h-5 flex-shrink-0 ${active ? 'opacity-100' : 'opacity-60'}`} viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732l-3.354 1.935-1.18 4.455a1 1 0 01-1.933 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732l3.354-1.935 1.18-4.455A1 1 0 0112 2z" clipRule="evenodd"/>
  </svg>
}
function SettingsIcon({ active }: { active: boolean }) {
  return <svg className={`w-5 h-5 flex-shrink-0 ${active ? 'opacity-100' : 'opacity-60'}`} viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd"/>
  </svg>
}
function TrashIcon() {
  return <svg className="w-4 h-4 flex-shrink-0 opacity-60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z"/>
  </svg>
}
