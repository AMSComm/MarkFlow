import { useEffect } from 'react'
import { useWorkspaceStore } from './stores/workspaceStore'
import { AppHeader } from './components/layout/AppHeader'
import { TabBar } from './components/tabs/TabBar'
import { FileTree } from './components/explorer/FileTree'
import { SplitWorkspace } from './components/layout/SplitWorkspace'
import { SideInspector } from './components/sidepanel/SideInspector'
import { StatusBar } from './components/layout/StatusBar'
import { QuickSwitcher } from './components/explorer/QuickSwitcher'

export function App() {
  const {
    initWorkspace,
    isSidebarOpen,
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
  } = useWorkspaceStore()

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

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[#090d16] text-slate-100 font-sans select-none">
      {/* Top Application Header */}
      <AppHeader />

      {/* Main Workspace Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar: File Tree */}
        {isSidebarOpen && (
          <aside className="w-56 shrink-0 overflow-hidden">
            <FileTree />
          </aside>
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
