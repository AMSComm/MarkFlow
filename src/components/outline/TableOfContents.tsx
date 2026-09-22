import React, { useMemo } from 'react'
import { useWorkspaceStore } from '../../stores/workspaceStore'
import { extractTableOfContents } from '../../utils/tocExtractor'
import { ListCollapse, ChevronDown, ChevronRight, Hash } from 'lucide-react'

export const TableOfContents: React.FC = () => {
  const { tabs, activeTabId, isOutlineOpen, toggleOutline, scrollToLine } = useWorkspaceStore()

  const activeTab = tabs.find((t) => t.id === activeTabId)
  const headings = useMemo(() => {
    if (!activeTab) return []
    return extractTableOfContents(activeTab.content)
  }, [activeTab])

  if (!activeTab) {
    return (
      <div className="flex h-full flex-col border-t border-[#1e293b] bg-[#0b0f19] select-none overflow-hidden">
        <div
          onClick={toggleOutline}
          className="flex h-8 shrink-0 cursor-pointer items-center justify-between px-3 text-slate-400 hover:bg-[#162032] hover:text-slate-200 transition-colors"
        >
          <div className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wider uppercase">
            {isOutlineOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
            <ListCollapse size={13} className="text-cyan-400" />
            <span>Outline</span>
          </div>
          <span className="rounded bg-slate-800/80 px-1.5 py-0.2 text-[10px] font-mono text-slate-500">
            0
          </span>
        </div>
        {isOutlineOpen && (
          <div className="flex flex-1 items-center justify-center p-3 text-center text-[11px] text-slate-500">
            No document open
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      className={`flex flex-col border-t border-[#1e293b] bg-[#0b0f19] select-none overflow-hidden ${
        isOutlineOpen ? 'h-full' : 'shrink-0'
      }`}
    >
      {/* Outline Header */}
      <div
        onClick={toggleOutline}
        className="flex h-8 shrink-0 cursor-pointer items-center justify-between px-3 text-slate-400 hover:bg-[#162032] hover:text-slate-200 transition-colors"
      >
        <div className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wider uppercase">
          {isOutlineOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          <ListCollapse size={13} className="text-cyan-400" />
          <span>Outline</span>
        </div>
        <span className="rounded bg-slate-800/80 px-1.5 py-0.2 text-[10px] font-mono text-slate-400">
          {headings.length}
        </span>
      </div>

      {/* Headings List */}
      {isOutlineOpen && (
        <div className="flex-1 overflow-y-auto p-1.5 text-xs">
          {headings.length === 0 ? (
            <div className="p-3 text-center text-[11px] text-slate-500">
              No headings in active document
            </div>
          ) : (
            headings.map((item) => {
              const indent = (item.level - 1) * 12 + 6
              return (
                <div
                  key={item.id}
                  onClick={() => scrollToLine(item.line)}
                  style={{ paddingLeft: `${indent}px` }}
                  className={`group flex cursor-pointer items-center justify-between rounded py-1 pr-2 transition-colors hover:bg-[#1e293b] ${
                    item.level === 1
                      ? 'font-semibold text-slate-200'
                      : item.level === 2
                      ? 'font-medium text-slate-300'
                      : 'text-slate-400'
                  }`}
                  title={`Line ${item.line}: ${item.text}`}
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <Hash
                      size={11}
                      className={`shrink-0 ${
                        item.level === 1
                          ? 'text-cyan-400'
                          : item.level === 2
                          ? 'text-sky-400'
                          : 'text-slate-500'
                      }`}
                    />
                    <span className="truncate group-hover:text-cyan-300">{item.text}</span>
                  </div>
                  <span className="text-[9px] font-mono text-slate-600 opacity-0 group-hover:opacity-100">
                    L{item.line}
                  </span>
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
