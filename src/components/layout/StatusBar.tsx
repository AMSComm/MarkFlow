import React, { useMemo } from 'react'
import { useWorkspaceStore } from '../../stores/workspaceStore'
import { useSettingsStore } from '../../stores/settingsStore'
import { CheckCircle2, ShieldCheck, Cpu } from 'lucide-react'

export const StatusBar: React.FC = () => {
  const { tabs, activeTabId, statusMessage } = useWorkspaceStore()
  const { vimMode } = useSettingsStore()

  const activeTab = tabs.find((t) => t.id === activeTabId)

  const stats = useMemo(() => {
    if (!activeTab) return { lines: 0, words: 0, chars: 0 }
    const text = activeTab.content
    const lines = text.split('\n').length
    const words = text.trim() ? text.trim().split(/\s+/).length : 0
    const chars = text.length
    return { lines, words, chars }
  }, [activeTab?.content])

  const environmentLabel = useMemo(() => {
    if (typeof window !== 'undefined' && (window.__TAURI_INTERNALS__ || window.__TAURI__)) {
      return 'Tauri v2 Desktop'
    }
    if (typeof window !== 'undefined' && window.location.port === '8080') {
      return 'Docker Go Server'
    }
    return 'Web Standalone'
  }, [])

  return (
    <footer className="flex h-6 select-none items-center justify-between border-t border-[#1e293b] bg-[#090d16] px-3 text-[11px] text-slate-400">
      {/* Left */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1 text-slate-300">
          <CheckCircle2 size={12} className="text-emerald-400" />
          <span>{statusMessage}</span>
        </div>

        {activeTab && (
          <span className="hidden sm:inline text-slate-500">
            {stats.lines} lines · {stats.words} words · {stats.chars} chars
          </span>
        )}
      </div>

      {/* Right */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1 text-slate-400" title="Engine Target">
          <Cpu size={12} className="text-cyan-400" />
          <span>{environmentLabel}</span>
        </div>

        <div className="flex items-center gap-1 text-emerald-400 font-mono text-[10px]">
          <ShieldCheck size={12} />
          <span>Zero-Lag Engine</span>
        </div>

        {vimMode && (
          <span className="rounded bg-emerald-950 px-1.5 py-0.2 text-[10px] font-bold text-emerald-400 border border-emerald-800">
            VIM
          </span>
        )}
      </div>
    </footer>
  )
}
