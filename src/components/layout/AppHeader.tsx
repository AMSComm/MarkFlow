import React, { useState } from 'react'
import { useWorkspaceStore } from '../../stores/workspaceStore'
import { useSettingsStore } from '../../stores/settingsStore'
import {
  Sidebar,
  Search,
  Columns,
  Code,
  BookOpen,
  Settings,
  PanelRight,
  Sparkles,
  Save,
} from 'lucide-react'

export const AppHeader: React.FC = () => {
  const {
    toggleSidebar,
    isSidebarOpen,
    viewMode,
    setViewMode,
    toggleQuickSwitcher,
    inspector,
    closeInspector,
    openInspector,
    tabs,
    activeTabId,
    saveActiveFile,
  } = useWorkspaceStore()

  const {
    vimMode,
    toggleVimMode,
    syncScroll,
    toggleSyncScroll,
    wordWrap,
    toggleWordWrap,
    fontSize,
    setFontSize,
  } = useSettingsStore()

  const [showSettings, setShowSettings] = useState(false)

  const activeTab = tabs.find((t) => t.id === activeTabId)

  return (
    <header className="relative flex h-10 select-none items-center justify-between border-b border-[#1e293b] bg-[#090d16] px-3 text-xs">
      {/* Left section: App Brand & Sidebar Toggle */}
      <div className="flex items-center gap-2">
        <button
          onClick={toggleSidebar}
          className={`rounded p-1.5 transition-colors ${
            isSidebarOpen
              ? 'bg-[#1e293b] text-cyan-400'
              : 'text-slate-400 hover:bg-[#1e293b] hover:text-slate-200'
          }`}
          title="Toggle Explorer (Ctrl+B)"
        >
          <Sidebar size={15} />
        </button>

        <div className="flex items-center gap-2 ml-1">
          {/* MarkFlow Icon Squircle */}
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-cyan-500 to-slate-900 shadow-xs">
            <span className="font-bold text-[11px] text-white tracking-tight">M</span>
          </div>
          <span className="font-bold text-sm tracking-tight text-slate-100">
            Mark<span className="text-cyan-400">Flow</span>
          </span>
        </div>

        {activeTab && (
          <div className="ml-3 hidden sm:flex items-center gap-1.5 text-slate-500 text-[11px]">
            <span>/</span>
            <span className="text-slate-300 font-medium truncate max-w-[200px]">
              {activeTab.path}
            </span>
            {activeTab.isDirty && (
              <span className="text-amber-400 font-semibold text-[10px] bg-amber-950/40 px-1 rounded">
                unsaved
              </span>
            )}
          </div>
        )}
      </div>

      {/* Center section: Quick Search & View Mode Toggles */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => toggleQuickSwitcher(true)}
          className="flex items-center gap-2 rounded-md border border-slate-800 bg-[#0f172a] px-2.5 py-1 text-slate-400 hover:border-slate-700 hover:text-slate-200 transition-colors"
          title="Quick Switcher (Ctrl+P)"
        >
          <Search size={13} className="text-slate-400" />
          <span className="text-[11px] hidden md:inline">Jump to file...</span>
          <kbd className="rounded bg-slate-800 px-1 py-0.2 text-[9px] text-slate-400 font-mono">
            ⌘P
          </kbd>
        </button>

        <div className="ml-2 flex items-center rounded-md border border-slate-800 bg-[#0f172a] p-0.5">
          <button
            onClick={() => setViewMode('editor')}
            className={`flex items-center gap-1 rounded px-2 py-1 transition-colors ${
              viewMode === 'editor'
                ? 'bg-[#1e293b] text-cyan-400 font-medium'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Editor Only (Ctrl+1)"
          >
            <Code size={13} />
            <span className="hidden lg:inline text-[11px]">Edit</span>
          </button>
          <button
            onClick={() => setViewMode('split')}
            className={`flex items-center gap-1 rounded px-2 py-1 transition-colors ${
              viewMode === 'split'
                ? 'bg-[#1e293b] text-cyan-400 font-medium'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Split View (Ctrl+2)"
          >
            <Columns size={13} />
            <span className="hidden lg:inline text-[11px]">Split</span>
          </button>
          <button
            onClick={() => setViewMode('preview')}
            className={`flex items-center gap-1 rounded px-2 py-1 transition-colors ${
              viewMode === 'preview'
                ? 'bg-[#1e293b] text-cyan-400 font-medium'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Reader Only (Ctrl+3)"
          >
            <BookOpen size={13} />
            <span className="hidden lg:inline text-[11px]">Read</span>
          </button>
        </div>
      </div>

      {/* Right section: Actions, Inspector toggle, Vim Mode & Settings */}
      <div className="flex items-center gap-1">
        {activeTab?.isDirty && (
          <button
            onClick={() => saveActiveFile()}
            className="flex items-center gap-1 rounded bg-cyan-600/30 border border-cyan-500/40 px-2 py-1 text-cyan-300 hover:bg-cyan-600/50 transition-colors"
            title="Save file (Ctrl+S)"
          >
            <Save size={12} />
            <span className="text-[10px] font-semibold">Save</span>
          </button>
        )}

        {/* Vim Mode Toggle Badge */}
        <button
          onClick={toggleVimMode}
          className={`flex items-center gap-1 rounded px-2 py-1 text-[11px] font-mono transition-colors border ${
            vimMode
              ? 'border-emerald-500/40 bg-emerald-950/40 text-emerald-400 font-bold'
              : 'border-slate-800 bg-[#0f172a] text-slate-500 hover:text-slate-300'
          }`}
          title="Toggle Vim Mode in CodeMirror"
        >
          <Sparkles size={11} className={vimMode ? 'text-emerald-400' : 'text-slate-500'} />
          <span>VIM: {vimMode ? 'ON' : 'OFF'}</span>
        </button>

        {/* Side Inspector Toggle */}
        <button
          onClick={() => {
            if (inspector.isOpen) {
              closeInspector()
            } else {
              openInspector('doc', '/architecture.md')
            }
          }}
          className={`rounded p-1.5 transition-colors ${
            inspector.isOpen
              ? 'bg-[#1e293b] text-cyan-400'
              : 'text-slate-400 hover:bg-[#1e293b] hover:text-slate-200'
          }`}
          title="Toggle Side Preview Inspector (Ctrl+\)"
        >
          <PanelRight size={15} />
        </button>

        {/* Settings Button */}
        <button
          onClick={() => setShowSettings(!showSettings)}
          className={`rounded p-1.5 transition-colors ${
            showSettings
              ? 'bg-[#1e293b] text-slate-100'
              : 'text-slate-400 hover:bg-[#1e293b] hover:text-slate-200'
          }`}
          title="Preferences & Settings"
        >
          <Settings size={15} />
        </button>

        {/* Settings Dropdown Popover */}
        {showSettings && (
          <div className="absolute right-3 top-12 z-50 w-64 rounded-xl border border-slate-800 bg-[#0f172a] p-3 shadow-2xl">
            <h4 className="font-semibold text-slate-200 border-b border-slate-800 pb-1.5 mb-2.5">
              Editor Preferences
            </h4>

            <div className="space-y-2.5 text-xs text-slate-300">
              <label className="flex items-center justify-between cursor-pointer">
                <span>Vim Keybindings</span>
                <input
                  type="checkbox"
                  checked={vimMode}
                  onChange={toggleVimMode}
                  className="rounded bg-slate-800 border-slate-700 text-cyan-500 focus:ring-0"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer">
                <span>Synchronized Scroll</span>
                <input
                  type="checkbox"
                  checked={syncScroll}
                  onChange={toggleSyncScroll}
                  className="rounded bg-slate-800 border-slate-700 text-cyan-500 focus:ring-0"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer">
                <span>Word Wrapping</span>
                <input
                  type="checkbox"
                  checked={wordWrap}
                  onChange={toggleWordWrap}
                  className="rounded bg-slate-800 border-slate-700 text-cyan-500 focus:ring-0"
                />
              </label>

              <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
                <span>Font Size</span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setFontSize(Math.max(11, fontSize - 1))}
                    className="rounded bg-slate-800 px-1.5 py-0.5 text-slate-300 hover:bg-slate-700"
                  >
                    -
                  </button>
                  <span className="font-mono text-xs">{fontSize}px</span>
                  <button
                    onClick={() => setFontSize(Math.min(22, fontSize + 1))}
                    className="rounded bg-slate-800 px-1.5 py-0.5 text-slate-300 hover:bg-slate-700"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
