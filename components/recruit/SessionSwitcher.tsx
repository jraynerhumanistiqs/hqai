'use client'
import type { PrescreenSession } from '@/lib/recruit-types'

interface Props {
  sessions: PrescreenSession[]
  activeSession: PrescreenSession | null
  onSelect: (s: PrescreenSession) => void
}

export function SessionSwitcher({ sessions, activeSession, onSelect }: Props) {
  if (!sessions.length) return null

  return (
    <div className="bg-[#111111] border border-[#222] rounded-2xl p-5 mb-4">
      <p className="text-[10px] font-bold text-[#fd7325] uppercase tracking-widest mb-3">Sessions</p>
      <div className="space-y-1.5">
        {sessions.map(s => (
          <button
            key={s.id}
            onClick={() => onSelect(s)}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-colors ${
              activeSession?.id === s.id
                ? 'bg-[#fd7325]/15 border border-[#fd7325]/30'
                : 'bg-[#0a0a0a] border border-[#1a1a1a] hover:border-[#333]'
            }`}
          >
            <div className="min-w-0">
              <p className={`text-sm font-bold truncate ${activeSession?.id === s.id ? 'text-[#fd7325]' : 'text-white'}`}>
                {s.role_title}
              </p>
              <p className="text-xs text-gray-500 truncate">{s.company}</p>
            </div>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ml-3 flex-shrink-0 ${
              s.status === 'active' ? 'bg-green-500/15 text-green-400' : 'bg-gray-700 text-gray-500'
            }`}>
              {s.status}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
