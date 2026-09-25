import { useEffect, useState, useRef } from 'react'
import { useWorkspaceStore } from './stores/workspaceStore'
import { useSettingsStore } from './stores/settingsStore'
import { useSearchStore } from './stores/searchStore'
import { AppHeader } from './components/layout/AppHeader'
import { TabBar } from './components/tabs/TabBar'
import { FileTree } from './components/explorer/FileTree'
import { SplitWorkspace } from './components/layout/SplitWorkspace'
import { SideInspector } from './components/sidepanel/SideInspector'
import { StatusBar } from './components/layout/StatusBar'
import { QuickSwitcher } from './components/explorer/QuickSwitcher'
import { ResizeHandle } from './components/common/ResizeHandle'
import { TableOfContents } from './components/outline/TableOfContents'
import { ErrorBoundary } from './components/common/ErrorBoundary'
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
    openDroppedFilePaths,
    checkForExternalFileChanges,
  } = useWorkspaceStore()
  const { zoomIn, zoomOut, resetZoom } = useSettingsStore()

  const [isDragOver, setIsDragOver] = useState(false)

  useEffect(() => {
    initWorkspace()
  }, [initWorkspace])

  // Tauri Desktop Native Drag-and-Drop & File Association Open listeners
  useEffect(() => {
    let unlistenDrop: (() => void) | undefined
    let unlistenBatchOpen: (() => void) | undefined
    let unlistenSingleOpen: (() => void) | undefined

    const setupTauriListeners = async () => {
      const isTauri =
        typeof window !== 'undefined' &&
        Boolean(
          (window as unknown as { isTauri?: boolean }).isTauri ||
            (window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__ ||
            (window as unknown as { __TAURI__?: unknown }).__TAURI__
        )
      if (!isTauri) return

      try {
        const { getCurrentWebview } = await import('@tauri-apps/api/webview')
        const webview = getCurrentWebview()
        unlistenDrop = await webview.onDragDropEvent((event) => {
          if (event.payload.type === 'enter' || event.payload.type === 'over') {
            setIsDragOver(true)
          } else if (event.payload.type === 'leave') {
            setIsDragOver(false)
          } else if (event.payload.type === 'drop') {
            setIsDragOver(false)
            const paths = event.payload.paths
            if (paths && paths.length > 0) {
              openDroppedFilePaths(paths)
            }
          }
        })
      } catch (err) {
        console.warn('Tauri onDragDropEvent listener not available:', err)
      }

      try {
        const { listen } = await import('@tauri-apps/api/event')
        unlistenBatchOpen = await listen<string[]>('open-file-paths', (event) => {
          if (event.payload && event.payload.length > 0) {
            openDroppedFilePaths(event.payload)
          }
        })
        unlistenSingleOpen = await listen<string>('open-file-path', (event) => {
          if (event.payload) {
            openDroppedFilePaths([event.payload])
          }
        })

        // Drain any files that arrived before the listeners were registered
        const { invoke } = await import('@tauri-apps/api/core')
        const pending = await invoke<string[]>('get_opened_files')
        if (pending && pending.length > 0) {
          openDroppedFilePaths(pending)
        }
      } catch (err) {
        console.warn('Tauri file association listener not available:', err)
      }
    }

    setupTauriListeners()
    return () => {
      if (unlistenDrop) unlistenDrop()
      if (unlistenBatchOpen) unlistenBatchOpen()
      if (unlistenSingleOpen) unlistenSingleOpen()
    }
  }, [openDroppedFilePaths])

  // Periodic & window focus listener for external file changes
  useEffect(() => {
    const handleFocus = () => {
      checkForExternalFileChanges()
    }

    window.addEventListener('focus', handleFocus)
    const timer = setInterval(() => {
      checkForExternalFileChanges()
    }, 5000)

    return () => {
      window.removeEventListener('focus', handleFocus)
      clearInterval(timer)
    }
  }, [checkForExternalFileChanges])

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey

      if (isMod && e.key.toLowerCase() === 'p') {
        e.preventDefault()
        toggleQuickSwitcher()
      } else if (isMod && e.key.toLowerCase() === 'f' && !e.altKey) {
        e.preventDefault()
        useSearchStore.getState().openSearch({ showReplace: false })
      } else if (isMod && (e.key.toLowerCase() === 'h' || (e.altKey && e.key.toLowerCase() === 'f'))) {
        e.preventDefault()
        useSearchStore.getState().openSearch({ showReplace: true })
      } else if (e.key === 'Escape' && useSearchStore.getState().isOpen) {
        e.preventDefault()
        useSearchStore.getState().closeSearch()
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
      } else if (isMod && (e.key === '=' || e.key === '+')) {
        e.preventDefault()
        zoomIn()
      } else if (isMod && (e.key === '-' || e.key === '_')) {
        e.preventDefault()
        zoomOut()
      } else if (isMod && e.key === '0') {
        e.preventDefault()
        resetZoom()
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
    resetZoom,
    saveActiveFile,
    setViewMode,
    toggleQuickSwitcher,
    toggleSidebar,
    tabs,
    zoomIn,
    zoomOut,
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

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)

    // 1. Check if dropped files have native OS paths (Desktop / Tauri)
    const fileList = Array.from(e.dataTransfer.files || [])
    const nativePaths = fileList
      .map((f) => (f as unknown as { path?: string }).path)
      .filter((p): p is string => Boolean(p))

    if (nativePaths.length > 0) {
      await openDroppedFilePaths(nativePaths)
      return
    }

    // 2. Check for directory drop in browser via File System Access API
    const items = Array.from(e.dataTransfer.items || [])
    for (const item of items) {
      // @ts-expect-error - File System Access API
      if (typeof item.getAsFileSystemHandle === 'function') {
        try {
          // @ts-expect-error - File System Access API
          const handle = await item.getAsFileSystemHandle()
          if (handle && handle.kind === 'directory') {
            const { NativeBrowserFileSystemAdapter, setFileSystemAdapter } = await import(
              './adapters'
            )
            const nativeAdapter = new NativeBrowserFileSystemAdapter(handle)
            setFileSystemAdapter(nativeAdapter)
            const dirFiles = await nativeAdapter.listDirectory('/')
            useWorkspaceStore.setState({ fileTree: dirFiles, tabs: [], activeTabId: null })
            const first = dirFiles.find(
              (f) => !f.isDirectory && (f.name.endsWith('.md') || f.name.endsWith('.markdown'))
            )
            if (first) {
              await useWorkspaceStore.getState().openFile(first.path)
            }
            useWorkspaceStore.setState({ statusMessage: `Opened folder: ${handle.name}` })
            return
          }
        } catch {}
      }
    }

    // 3. Fallback standard file drop
    if (fileList.length > 0) {
      openDroppedFiles(fileList)
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
        <ErrorBoundary fallbackTitle="Side Inspector encountered an issue">
          <SideInspector />
        </ErrorBoundary>
      </div>

      {/* Bottom Status Bar */}
      <StatusBar />

      {/* Quick Switcher Modal (Ctrl+P / Cmd+P) */}
      <QuickSwitcher />
    </div>
  )
}

export default App
