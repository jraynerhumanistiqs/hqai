'use client'
import { useState } from 'react'
import ChatInterface from '@/components/chat/ChatInterface'
import { PrescreenDashboard } from '@/components/recruit/PrescreenDashboard'

type Tab = 'advisor' | 'prescreen'

interface Props {
  initialTab: Tab
  userName: string
  bizName: string
  advisorName: string
  industry: string
  state: string
  award: string
}

export default function RecruitTabs({ initialTab, userName, bizName, advisorName, industry, state, award }: Props) {
  const [tab, setTab] = useState<Tab>(initialTab)

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Tab bar */}
      <div className="flex-shrink-0 border-b border-[#222] bg-[#000] px-4 pt-3">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setTab('advisor')}
            className={`text-xs font-bold px-4 py-2 rounded-t-lg transition-colors ${
              tab === 'advisor'
                ? 'bg-[#111] text-white border border-b-0 border-[#333]'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            HQ Recruit AI
          </button>
          <button
            onClick={() => setTab('prescreen')}
            className={`text-xs font-bold px-4 py-2 rounded-t-lg transition-colors flex items-center gap-1.5 ${
              tab === 'prescreen'
                ? 'bg-[#111] text-white border border-b-0 border-[#333]'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#fd7325]" />
            Video Pre-Screen
          </button>
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden">
        {tab === 'advisor' ? (
          <ChatInterface
            module="recruit"
            userName={userName}
            bizName={bizName}
            advisorName={advisorName}
            industry={industry}
            state={state}
            award={award}
          />
        ) : (
          <PrescreenDashboard />
        )}
      </div>
    </div>
  )
}
