import React, { useState, useEffect, useRef } from 'react'
import { useWorkspaceStore } from '../../stores/workspaceStore'
import type { FileEntry } from '../../adapters/adapter.interface'
import { Search, FileText, X } from 'lucide-react'

export const QuickSwitcher: React.FC = () => {
  const { isQuickSwitcherOpen, toggleQuickSwitcher, fileTree, openFile } = useWorkspaceStore()
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  // Flatten all files from fileTree
  const allFiles = React.useMemo(() => {
    const list: FileEntry[] = []
    const traverse = (items: FileEntry[]) => {
      for (const item of items) {
        if (item.isDirectory && item.children) {
          traverse(item.children)
        } else if (!item.isDirectory) {
          list.push(item)
        }
      }
    }
    traverse(fileTree)
    return list
  }, [fileTree])

  const filtered = React.useMemo(() => {
    if (!query.trim()) return allFiles
    const lower = query.toLowerCase()
    return allFiles.filter(
      (f) => f.name.toLowerCase().includes(lower) || f.path.toLowerCase().includes(lower)
    )
  }, [allFiles, query])

  useEffect(() => {
    if (isQuickSwitcherOpen) {
      setQuery('')
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isQuickSwitcherOpen])

  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  if (!isQuickSwitcherOpen) return null

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      toggleQuickSwitcher(false)
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filtered.length))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev - 1 + filtered.length) % Math.max(1, filtered.length))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (filtered[selectedIndex]) {
        openFile(filtered[selectedIndex].path)
        toggleQuickSwitcher(false)
      }
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 pt-20 backdrop-blur-xs"
      onClick={() => toggleQuickSwitcher(false)}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-xl border border-slate-800 bg-[#0f172a] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Input Bar */}
        <div className="flex items-center border-b border-slate-800 px-3 py-2.5">
          <Search size={16} className="text-slate-400 mr-2" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a file name to jump to... (Esc to cancel)"
            className="flex-1 bg-transparent text-sm text-slate-100 placeholder-slate-500 focus:outline-hidden"
          />
          <button
            onClick={() => toggleQuickSwitcher(false)}
            className="rounded p-1 text-slate-400 hover:text-slate-200"
          >
            <X size={14} />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-72 overflow-y-auto p-1.5">
          {filtered.length === 0 ? (
            <div className="p-4 text-center text-xs text-slate-500">No matching files found.</div>
          ) : (
            filtered.map((file, idx) => {
              const isSelected = idx === selectedIndex
              return (
                <div
                  key={file.path}
                  onClick={() => {
                    openFile(file.path)
                    toggleQuickSwitcher(false)
                  }}
                  className={`flex cursor-pointer items-center justify-between rounded px-3 py-2 text-xs transition-colors ${
                    isSelected ? 'bg-cyan-950/60 text-cyan-200' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <FileText size={14} className={isSelected ? 'text-cyan-400' : 'text-slate-500'} />
                    <span className="font-medium truncate">{file.name}</span>
                  </div>
                  <span className="text-[11px] text-slate-500 truncate max-w-[200px]">{file.path}</span>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
