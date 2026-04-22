'use client'
import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Sidebar from '@/components/sidebar/Sidebar'
import Image from 'next/image'
import Link from 'next/link'

interface SidebarProps {
  userName: string
  bizName: string
  bizLogoUrl?: string | null
  advisorName: string
  plan: string
}

export default function MobileShell({ sidebarProps, children }: { sidebarProps: SidebarProps; children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false)
  }, [pathname])

  return (
    <div className="flex h-screen overflow-hidden bg-[#000000]">
      {/* Desktop sidebar - always visible */}
      <div className="hidden lg:block flex-shrink-0">
        <Sidebar {...sidebarProps} />
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          {/* Drawer */}
          <div className="absolute inset-y-0 left-0 w-[280px] max-w-[85vw] animate-slide-in">
            <Sidebar {...sidebarProps} onClose={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Mobile top bar */}
        <div className="flex items-center gap-3 px-4 py-2.5 border-b border-[#222222] bg-[#0a0a0a] lg:hidden flex-shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors"
            aria-label="Open menu"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" className="text-white">
              <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd"/>
            </svg>
          </button>
          <Link href="/dashboard" aria-label="Go to dashboard home">
            <Image src="/logo-white.svg" alt="HQ.ai" width={100} height={100} className="opacity-90 h-8 w-auto" />
          </Link>
          <div className="ml-auto flex items-center">
            {sidebarProps.bizLogoUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={sidebarProps.bizLogoUrl}
                alt={sidebarProps.bizName}
                className="max-h-7 max-w-[120px] w-auto h-auto object-contain"
              />
            ) : (
              <span className="text-base font-normal text-white uppercase truncate max-w-[160px] block">
                {sidebarProps.bizName}
              </span>
            )}
          </div>
        </div>

        {children}
      </div>
    </div>
  )
}
