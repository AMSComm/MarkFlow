import React, { useEffect, useRef } from 'react'
import { useSearchStore } from '../../stores/searchStore'
import {
  ChevronDown,
  ChevronUp,
  ChevronRight,
  X,
  CaseSensitive,
  WholeWord,
  Regex,
  Replace,
} from 'lucide-react'

export const FloatingSearchBar: React.FC = () => {
  const {
    isOpen,
    showReplace,
    searchTerm,
    replaceTerm,
    caseSensitive,
    wholeWord,
    useRegex,
    matchCount,
    currentMatchIndex,
    closeSearch,
    toggleReplace,
    setSearchTerm,
    setReplaceTerm,
    toggleCaseSensitive,
    toggleWholeWord,
    toggleRegex,
    triggerFindNext,
    triggerFindPrev,
    triggerReplace,
    triggerReplaceAll,
  } = useSearchStore()

  const findInputRef = useRef<HTMLInputElement>(null)
  const replaceInputRef = useRef<HTMLInputElement>(null)

  // Focus and select input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        if (findInputRef.current) {
          findInputRef.current.focus()
          findInputRef.current.select()
        }
      }, 30)
    }
  }, [isOpen])

  // Focus replace input when showReplace opens if find input already has text
  useEffect(() => {
    if (isOpen && showReplace) {
      setTimeout(() => {
        if (replaceInputRef.current && document.activeElement !== findInputRef.current) {
          replaceInputRef.current.focus()
        }
      }, 30)
    }
  }, [isOpen, showReplace])

  if (!isOpen) return null

  const handleFindKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    try {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        closeSearch()
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (e.shiftKey) {
          triggerFindPrev()
        } else {
          triggerFindNext()
        }
      } else if (e.altKey && e.key.toLowerCase() === 'c') {
        e.preventDefault()
        toggleCaseSensitive()
      } else if (e.altKey && e.key.toLowerCase() === 'w') {
        e.preventDefault()
        toggleWholeWord()
      } else if (e.altKey && e.key.toLowerCase() === 'r') {
        e.preventDefault()
        toggleRegex()
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'h') {
        e.preventDefault()
        toggleReplace()
      }
    } catch (err) {
      console.warn('Find keydown error:', err)
    }
  }

  const handleReplaceKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    try {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        closeSearch()
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (e.metaKey || e.ctrlKey || (e.altKey && e.shiftKey)) {
          triggerReplaceAll()
        } else {
          triggerReplace()
        }
      }
    } catch (err) {
      console.warn('Replace keydown error:', err)
    }
  }

  const matchLabel = () => {
    if (!searchTerm) return ''
    if (matchCount === 0) return 'No matches'
    return `${currentMatchIndex > 0 ? currentMatchIndex : 1} of ${matchCount}`
  }

  return (
    <div
      role="search"
      aria-label="In-file search and replace"
      className="absolute top-3 right-4 z-40 flex flex-col gap-1.5 rounded-lg border border-[#1e293b] bg-[#0f172a]/95 p-2 shadow-2xl shadow-black/70 backdrop-blur-md transition-all select-none w-80 md:w-96"
    >
      {/* Row 1: Find Input & Controls */}
      <div className="flex items-center gap-1">
        {/* Toggle Replace Expand */}
        <button
          type="button"
          onClick={toggleReplace}
          className="flex h-6 w-6 items-center justify-center rounded text-slate-400 hover:bg-[#1e293b] hover:text-slate-200 transition-colors"
          title={showReplace ? 'Collapse Replace' : 'Expand Replace (Ctrl+H)'}
        >
          {showReplace ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>

        {/* Find Input with inline modifier toggles */}
        <div className="relative flex flex-1 items-center rounded border border-[#1e293b] bg-[#090d16] px-2 py-0.5 focus-within:border-[#0ea5e9]">
          <input
            ref={findInputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleFindKeyDown}
            placeholder="Find in file..."
            className="w-full bg-transparent font-mono text-xs text-[#f8fafc] placeholder-[#64748b] focus:outline-none"
            autoComplete="off"
            spellCheck="false"
          />

          {/* Modifier buttons */}
          <div className="flex items-center gap-0.5 pl-1 shrink-0">
            <button
              type="button"
              onClick={toggleCaseSensitive}
              className={`flex h-5 w-5 items-center justify-center rounded transition-colors ${
                caseSensitive
                  ? 'bg-[#0ea5e9]/20 text-[#38bdf8] font-bold'
                  : 'text-[#64748b] hover:text-[#94a3b8] hover:bg-[#1e293b]'
              }`}
              title="Match Case (Alt+C)"
            >
              <CaseSensitive size={13} />
            </button>

            <button
              type="button"
              onClick={toggleWholeWord}
              className={`flex h-5 w-5 items-center justify-center rounded transition-colors ${
                wholeWord
                  ? 'bg-[#0ea5e9]/20 text-[#38bdf8] font-bold'
                  : 'text-[#64748b] hover:text-[#94a3b8] hover:bg-[#1e293b]'
              }`}
              title="Match Whole Word (Alt+W)"
            >
              <WholeWord size={13} />
            </button>

            <button
              type="button"
              onClick={toggleRegex}
              className={`flex h-5 w-5 items-center justify-center rounded transition-colors ${
                useRegex
                  ? 'bg-[#0ea5e9]/20 text-[#38bdf8] font-bold'
                  : 'text-[#64748b] hover:text-[#94a3b8] hover:bg-[#1e293b]'
              }`}
              title="Use Regular Expression (Alt+R)"
            >
              <Regex size={13} />
            </button>
          </div>
        </div>

        {/* Match Count Badge */}
        {searchTerm && (
          <span
            className={`text-[11px] font-mono shrink-0 px-1 ${
              matchCount === 0 ? 'text-rose-400 font-medium' : 'text-[#94a3b8]'
            }`}
          >
            {matchLabel()}
          </span>
        )}

        {/* Previous Match */}
        <button
          type="button"
          onClick={triggerFindPrev}
          disabled={matchCount === 0}
          className="flex h-6 w-6 items-center justify-center rounded text-slate-400 hover:bg-[#1e293b] hover:text-slate-200 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
          title="Previous Match (Shift+Enter)"
        >
          <ChevronUp size={14} />
        </button>

        {/* Next Match */}
        <button
          type="button"
          onClick={triggerFindNext}
          disabled={matchCount === 0}
          className="flex h-6 w-6 items-center justify-center rounded text-slate-400 hover:bg-[#1e293b] hover:text-slate-200 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
          title="Next Match (Enter)"
        >
          <ChevronDown size={14} />
        </button>

        {/* Close Button */}
        <button
          type="button"
          onClick={closeSearch}
          className="flex h-6 w-6 items-center justify-center rounded text-slate-400 hover:bg-[#1e293b] hover:text-rose-400 transition-colors"
          title="Close (Escape)"
        >
          <X size={14} />
        </button>
      </div>

      {/* Row 2: Replace Input & Action Buttons (Collapsible) */}
      {showReplace && (
        <div className="flex items-center gap-1.5 pl-7 animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="flex flex-1 items-center rounded border border-[#1e293b] bg-[#090d16] px-2 py-0.5 focus-within:border-[#0ea5e9]">
            <input
              ref={replaceInputRef}
              type="text"
              value={replaceTerm}
              onChange={(e) => setReplaceTerm(e.target.value)}
              onKeyDown={handleReplaceKeyDown}
              placeholder="Replace with..."
              className="w-full bg-transparent font-mono text-xs text-[#f8fafc] placeholder-[#64748b] focus:outline-none"
              autoComplete="off"
              spellCheck="false"
            />
          </div>

          {/* Replace Button */}
          <button
            type="button"
            onClick={triggerReplace}
            disabled={matchCount === 0}
            className="flex items-center gap-1 rounded border border-[#1e293b] bg-[#1e293b] px-2 py-1 text-[11px] font-medium text-slate-200 hover:bg-[#334155] hover:border-[#334155] disabled:opacity-30 disabled:hover:bg-[#1e293b] transition-colors shrink-0"
            title="Replace Current (Enter)"
          >
            <Replace size={11} />
            <span>Replace</span>
          </button>

          {/* Replace All Button */}
          <button
            type="button"
            onClick={triggerReplaceAll}
            disabled={matchCount === 0}
            className="rounded border border-[#1e293b] bg-[#1e293b] px-2 py-1 text-[11px] font-medium text-slate-200 hover:bg-[#334155] hover:border-[#334155] disabled:opacity-30 disabled:hover:bg-[#1e293b] transition-colors shrink-0"
            title="Replace All (Cmd+Enter)"
          >
            All
          </button>
        </div>
      )}
    </div>
  )
}
