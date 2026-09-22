import { useEffect, useState, useRef } from 'react'
import { useWorkspaceStore } from './stores/workspaceStore'
import { AppHeader } from './components/layout/AppHeader'
import { TabBar } from './components/tabs/TabBar'
import { FileTree } from './components/explorer/FileTree'
import { SplitWorkspace } from './components/layout/SplitWorkspace'
import { SideInspector } from './components/sidepanel/SideInspector'
import { StatusBar } from './components/layout/StatusBar'
import { QuickSwitcher } from './components/explorer/QuickSwitcher'
import { ResizeHandle } from './components/common/ResizeHandle'
import { TableOfContents } from './components/outline/TableOfContents'
import { UploadCloud } from 'lucide-react'

export function App() {
  const asideRef = useRef<HTMLElement>(null)
  const {
    initWorkspace,
    isSidebarOpen,
    sidebarWidth,
    changeSidebarWidth,
    setSidebarWidth,
    isOutlineOpen,
    outlineRatio,
    changeOutlineRatio,
    setOutlineRatio,
    toggleSidebar,
    toggleQuickSwitcher,
    saveActiveFile,
    tabs,
    activeTabId,
    closeTab,
    setViewMode,
    inspector,
    closeInspector,
    openInspector,
    openDroppedFiles,
  } = useWorkspaceStore()

  const [isDragOver, setIsDragOver] = useState(false)

  useEffect(() => {
    initWorkspace()
  }, [initWorkspace])

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey

      if (isMod && e.key.toLowerCase() === 'p') {
        e.preventDefault()
        toggleQuickSwitcher()
      } else if (isMod && e.key.toLowerCase() === 'b') {
        e.preventDefault()
        toggleSidebar()
      } else if (isMod && e.key.toLowerCase() === 's') {
        e.preventDefault()
        saveActiveFile()
      } else if (isMod && e.key.toLowerCase() === 'w') {
        e.preventDefault()
        if (activeTabId) {
          closeTab(activeTabId)
        }
      } else if (isMod && e.key === '1') {
        e.preventDefault()
        setViewMode('editor')
      } else if (isMod && e.key === '2') {
        e.preventDefault()
        setViewMode('split')
      } else if (isMod && e.key === '3') {
        e.preventDefault()
        setViewMode('preview')
      } else if (isMod && (e.key === '\\' || e.key === '|')) {
        e.preventDefault()
        if (inspector.isOpen) {
          closeInspector()
        } else {
          openInspector('doc', '/architecture.md')
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [
    activeTabId,
    closeInspector,
    closeTab,
    inspector.isOpen,
    openInspector,
    saveActiveFile,
    setViewMode,
    toggleQuickSwitcher,
    toggleSidebar,
    tabs,
  ])

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    // Only turn off when leaving the main viewport
    if (e.relatedTarget === null) {
      setIsDragOver(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      openDroppedFiles(Array.from(e.dataTransfer.files))
    }
  }

  const handleOutlineResize = (deltaY: number) => {
    const totalHeight = asideRef.current?.clientHeight || window.innerHeight
    if (totalHeight <= 0) return
    const deltaPercent = (deltaY / totalHeight) * 100
    changeOutlineRatio(-deltaPercent)
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="relative flex h-screen w-screen flex-col overflow-hidden bg-[#090d16] text-slate-100 font-sans select-none"
    >
      {/* Drag & Drop Overlay */}
      {isDragOver && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-cyan-950/80 backdrop-blur-xs border-2 border-dashed border-cyan-400">
          <UploadCloud size={48} className="text-cyan-400 animate-bounce mb-3" />
          <h3 className="text-lg font-semibold text-slate-100">Drop Markdown files to open</h3>
          <p className="text-xs text-cyan-200 mt-1">Files will be imported into your active workspace</p>
        </div>
      )}

      {/* Top Application Header */}
      <AppHeader />

      {/* Main Workspace Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar: File Tree & Table of Contents */}
        {isSidebarOpen && (
          <div className="flex h-full shrink-0">
            <aside
              ref={asideRef}
              style={{ width: `${sidebarWidth}px` }}
              className="flex h-full flex-col overflow-hidden bg-[#0f172a]"
            >
              {isOutlineOpen ? (
                <>
                  <div
                    style={{ height: `${100 - outlineRatio}%` }}
                    className="flex min-h-[100px] flex-col overflow-hidden"
                  >
                    <FileTree />
                  </div>
                  <ResizeHandle
                    direction="vertical"
                    onResize={handleOutlineResize}
                    onDoubleClick={() => setOutlineRatio(50)}
                    title="Drag to resize Outline / Explorer (Double-click for 50/50 split)"
                  />
                  <div
                    style={{ height: `${outlineRatio}%` }}
                    className="flex min-h-[80px] flex-col overflow-hidden"
                  >
                    <TableOfContents />
                  </div>
                </>
              ) : (
                <>
                  <div className="flex-1 overflow-hidden">
                    <FileTree />
                  </div>
                  <TableOfContents />
                </>
              )}
            </aside>
            <ResizeHandle
              onResize={(deltaX) => changeSidebarWidth(deltaX)}
              onDoubleClick={() => setSidebarWidth(224)}
              title="Drag to resize Explorer (Double-click for default 224px)"
            />
          </div>
        )}

        {/* Center Canvas: Tab Bar + Editor & Preview */}
        <main className="flex flex-1 flex-col overflow-hidden">
          <TabBar />
          <SplitWorkspace />
        </main>

        {/* Right Sidebar: Side Link Preview Inspector */}
        <SideInspector />
      </div>

      {/* Bottom Status Bar */}
      <StatusBar />

      {/* Quick Switcher Modal (Ctrl+P / Cmd+P) */}
      <QuickSwitcher />
    </div>
  )
}

export default App
