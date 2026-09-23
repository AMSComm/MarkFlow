import React, { useMemo } from 'react'
import { useWorkspaceStore } from '../../stores/workspaceStore'
import { useSettingsStore } from '../../stores/settingsStore'
import { CheckCircle2, FileText, Link2 } from 'lucide-react'

export const StatusBar: React.FC = () => {
  const { tabs, activeTabId, statusMessage, hoveredLinkUrl } = useWorkspaceStore()
  const { vimMode, zoomLevel, zoomIn, zoomOut, resetZoom } = useSettingsStore()

  const activeTab = tabs.find((t) => t.id === activeTabId)

  const stats = useMemo(() => {
    if (!activeTab) return { lines: 0, words: 0, chars: 0 }
    const text = activeTab.content
    const lines = text.split('\n').length
    const words = text.trim() ? text.trim().split(/\s+/).length : 0
    const chars = text.length
    return { lines, words, chars }
  }, [activeTab])

  return (
    <footer className="flex h-6 select-none items-center justify-between border-t border-[#1e293b] bg-[#090d16] px-3 text-[11px] text-slate-400">
      {/* Left section: Hovered Link URL OR (Status + Full Active File Path) */}
      <div className="flex items-center gap-3 overflow-hidden">
        {hoveredLinkUrl ? (
          <div
            className="flex items-center gap-1.5 text-cyan-300 font-mono text-[11px] truncate max-w-[70vw]"
            title={hoveredLinkUrl}
          >
            <Link2 size={12} className="text-cyan-400 shrink-0 animate-pulse" />
            <span className="truncate">{hoveredLinkUrl}</span>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-1 text-slate-300 shrink-0">
              <CheckCircle2 size={12} className="text-emerald-400" />
              <span>{statusMessage}</span>
            </div>

            {activeTab && (
              <div
                className="flex items-center gap-1.5 text-slate-300 truncate max-w-[45vw]"
                title={activeTab.path}
              >
                <FileText size={12} className="text-cyan-400 shrink-0" />
                <span className="font-mono text-slate-200 truncate">{activeTab.path}</span>
                {activeTab.isDirty && (
                  <span className="text-[10px] text-amber-400 font-semibold bg-amber-950/60 px-1 rounded border border-amber-800/40 shrink-0">
                    unsaved
                  </span>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Right section: Document stats, UTF-8, Zoom controls, VIM badge */}
      <div className="flex items-center gap-3 shrink-0">
        {activeTab && (
          <span className="hidden md:inline text-slate-500">
            {stats.lines} lines · {stats.words} words · {stats.chars} chars
          </span>
        )}

        <span className="hidden sm:inline text-slate-500 font-mono text-[10px]">UTF-8</span>

        {/* Browser-like Zoom controls */}
        <div
          className="flex items-center gap-0.5 text-slate-400 font-mono text-[10px] bg-slate-900/90 px-1.5 py-0.5 rounded border border-slate-800"
          title="Zoom Controls (Cmd/Ctrl + / - / 0)"
        >
          <button
            onClick={zoomOut}
            className="hover:text-cyan-300 px-1 rounded hover:bg-slate-800 transition-colors"
            title="Zoom Out (Cmd/Ctrl -)"
          >
            -
          </button>
          <button
            onClick={resetZoom}
            className="hover:text-cyan-300 px-1 rounded hover:bg-slate-800 transition-colors cursor-pointer"
            title="Reset Zoom to 100% (Cmd/Ctrl 0)"
          >
            {zoomLevel}%
          </button>
          <button
            onClick={zoomIn}
            className="hover:text-cyan-300 px-1 rounded hover:bg-slate-800 transition-colors"
            title="Zoom In (Cmd/Ctrl +)"
          >
            +
          </button>
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
