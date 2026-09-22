import React from 'react'
import { useWorkspaceStore } from '../../stores/workspaceStore'
import { X, FileText, Plus, AlertTriangle } from 'lucide-react'

export const TabBar: React.FC = () => {
  const { tabs, activeTabId, setActiveTab, closeTab, createFile } = useWorkspaceStore()

  const handleNewFile = () => {
    const filename = prompt('Enter new file name (e.g., notes.md):', 'untitled.md')
    if (filename) {
      const cleanPath = filename.startsWith('/') ? filename : `/${filename}`
      createFile(cleanPath)
    }
  }

  return (
    <div className="flex h-9 w-full select-none items-center border-b border-[#1e293b] bg-[#0f172a] px-2 text-xs">
      <div className="flex flex-1 items-center gap-1 overflow-x-auto no-scrollbar">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId
          return (
            <div
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`group flex h-7 max-w-[200px] min-w-[100px] cursor-pointer items-center gap-1.5 rounded-t px-2.5 transition-all border-b-2 ${
                isActive
                  ? 'border-cyan-500 bg-[#1e293b] text-slate-100 font-medium'
                  : 'border-transparent text-slate-400 hover:bg-[#162032] hover:text-slate-200'
              }`}
            >
              {tab.hasExternalConflict ? (
                <AlertTriangle size={13} className="text-amber-400 shrink-0 animate-pulse" />
              ) : (
                <FileText size={13} className={isActive ? 'text-cyan-400' : 'text-slate-500'} />
              )}
              <span className="truncate flex-1">{tab.title}</span>

              {tab.hasExternalConflict ? (
                <span
                  className="h-2 w-2 rounded-full bg-amber-400 animate-ping shrink-0"
                  title="Conflict: Modified externally!"
                />
              ) : (
                tab.isDirty && (
                  <span
                    className="h-2 w-2 rounded-full bg-amber-400 group-hover:hidden"
                    title="Unsaved changes"
                  />
                )
              )}

              <button
                onClick={(e) => {
                  e.stopPropagation()
                  closeTab(tab.id)
                }}
                className={`rounded p-0.5 text-slate-400 hover:bg-slate-700 hover:text-slate-100 ${
                  tab.isDirty ? 'hidden group-hover:block' : 'opacity-0 group-hover:opacity-100'
                }`}
                title="Close tab (Ctrl+W)"
              >
                <X size={12} />
              </button>
            </div>
          )
        })}

        <button
          onClick={handleNewFile}
          className="flex h-7 w-7 items-center justify-center rounded text-slate-400 hover:bg-[#1e293b] hover:text-slate-200"
          title="New Markdown File"
        >
          <Plus size={14} />
        </button>
      </div>
    </div>
  )
}
