import { create } from 'zustand'
import { getFileSystemAdapter } from '../adapters'
import type { FileEntry } from '../adapters/adapter.interface'

export interface EditorTab {
  id: string
  path: string
  title: string
  content: string
  initialContent: string
  isDirty: boolean
}

export type ViewMode = 'split' | 'editor' | 'preview'

export interface InspectorState {
  isOpen: boolean
  type: 'doc' | 'web' | null
  pathOrUrl: string | null
  title: string
  content: string
  loading: boolean
}

export interface WorkspaceState {
  tabs: EditorTab[]
  activeTabId: string | null
  fileTree: FileEntry[]
  expandedFolders: Set<string>
  isSidebarOpen: boolean
  viewMode: ViewMode
  inspector: InspectorState
  isQuickSwitcherOpen: boolean
  statusMessage: string

  // Actions
  initWorkspace: () => Promise<void>
  refreshFileTree: () => Promise<void>
  openFile: (path: string) => Promise<void>
  closeTab: (tabId: string) => void
  setActiveTab: (tabId: string) => void
  updateContent: (tabId: string, content: string) => void
  saveTab: (tabId: string) => Promise<void>
  saveActiveFile: () => Promise<void>
  createFile: (path: string) => Promise<void>
  deleteFile: (path: string) => Promise<void>
  toggleFolder: (path: string) => void
  toggleSidebar: () => void
  setViewMode: (mode: ViewMode) => void
  openInspector: (type: 'doc' | 'web', pathOrUrl: string) => Promise<void>
  closeInspector: () => void
  toggleQuickSwitcher: (open?: boolean) => void
  setStatusMessage: (msg: string) => void
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  tabs: [],
  activeTabId: null,
  fileTree: [],
  expandedFolders: new Set(['/notes']),
  isSidebarOpen: true,
  viewMode: 'split',
  inspector: {
    isOpen: false,
    type: null,
    pathOrUrl: null,
    title: '',
    content: '',
    loading: false,
  },
  isQuickSwitcherOpen: false,
  statusMessage: 'Ready',

  initWorkspace: async () => {
    const adapter = getFileSystemAdapter()
    try {
      const files = await adapter.listDirectory('/')
      set({ fileTree: files })

      // Open /welcome.md by default if available
      const welcomePath = '/welcome.md'
      try {
        await get().openFile(welcomePath)
      } catch {
        // Fallback to first markdown file if exists
        const first = files.find((f) => !f.isDirectory && f.name.endsWith('.md'))
        if (first) {
          await get().openFile(first.path)
        }
      }
    } catch (err) {
      console.error('Failed to initialize workspace:', err)
      set({ statusMessage: 'Workspace init failed' })
    }
  },

  refreshFileTree: async () => {
    const adapter = getFileSystemAdapter()
    try {
      const files = await adapter.listDirectory('/')
      set({ fileTree: files })
    } catch (err) {
      console.error('Failed to refresh file tree:', err)
    }
  },

  openFile: async (path: string) => {
    const { tabs } = get()
    const existing = tabs.find((t) => t.path === path)
    if (existing) {
      set({ activeTabId: existing.id })
      return
    }

    const adapter = getFileSystemAdapter()
    try {
      const content = await adapter.readFile(path)
      const parts = path.split('/')
      const title = parts[parts.length - 1] || 'untitled.md'
      const newTab: EditorTab = {
        id: `tab_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        path,
        title,
        content,
        initialContent: content,
        isDirty: false,
      }
      set({
        tabs: [...tabs, newTab],
        activeTabId: newTab.id,
        statusMessage: `Opened ${title}`,
      })
    } catch (err) {
      console.error(`Failed to open file: ${path}`, err)
      set({ statusMessage: `Error opening ${path}` })
    }
  },

  closeTab: (tabId: string) => {
    const { tabs, activeTabId } = get()
    const target = tabs.find((t) => t.id === tabId)
    if (!target) return

    if (target.isDirty) {
      const confirmClose = window.confirm(`File "${target.title}" has unsaved changes. Close anyway?`)
      if (!confirmClose) return
    }

    const nextTabs = tabs.filter((t) => t.id !== tabId)
    let nextActiveId = activeTabId
    if (activeTabId === tabId) {
      const idx = tabs.findIndex((t) => t.id === tabId)
      if (nextTabs.length > 0) {
        nextActiveId = nextTabs[Math.max(0, idx - 1)].id
      } else {
        nextActiveId = null
      }
    }

    set({ tabs: nextTabs, activeTabId: nextActiveId })
  },

  setActiveTab: (tabId: string) => {
    set({ activeTabId: tabId })
  },

  updateContent: (tabId: string, content: string) => {
    set((state) => ({
      tabs: state.tabs.map((tab) =>
        tab.id === tabId
          ? {
              ...tab,
              content,
              isDirty: content !== tab.initialContent,
            }
          : tab
      ),
    }))
  },

  saveTab: async (tabId: string) => {
    const { tabs } = get()
    const target = tabs.find((t) => t.id === tabId)
    if (!target || !target.isDirty) return

    const adapter = getFileSystemAdapter()
    try {
      await adapter.writeFile(target.path, target.content)
      set((state) => ({
        tabs: state.tabs.map((tab) =>
          tab.id === tabId ? { ...tab, initialContent: tab.content, isDirty: false } : tab
        ),
        statusMessage: `Saved ${target.title}`,
      }))
    } catch (err) {
      console.error(`Failed to save ${target.path}:`, err)
      set({ statusMessage: `Error saving ${target.title}` })
    }
  },

  saveActiveFile: async () => {
    const { activeTabId } = get()
    if (activeTabId) {
      await get().saveTab(activeTabId)
    }
  },

  createFile: async (path: string) => {
    const adapter = getFileSystemAdapter()
    try {
      await adapter.createFile(path, `# New File\n\nCreated at ${new Date().toLocaleString()}`)
      await get().refreshFileTree()
      await get().openFile(path)
      set({ statusMessage: `Created ${path}` })
    } catch (err) {
      console.error(`Failed to create file: ${path}`, err)
      alert(`Could not create file: ${(err as Error).message}`)
    }
  },

  deleteFile: async (path: string) => {
    const adapter = getFileSystemAdapter()
    try {
      await adapter.deleteEntry(path)
      // Close tab if open
      const { tabs } = get()
      const openTab = tabs.find((t) => t.path === path)
      if (openTab) {
        get().closeTab(openTab.id)
      }
      await get().refreshFileTree()
      set({ statusMessage: `Deleted ${path}` })
    } catch (err) {
      console.error(`Failed to delete file: ${path}`, err)
      alert(`Could not delete: ${(err as Error).message}`)
    }
  },

  toggleFolder: (path: string) => {
    set((state) => {
      const next = new Set(state.expandedFolders)
      if (next.has(path)) {
        next.delete(path)
      } else {
        next.add(path)
      }
      return { expandedFolders: next }
    })
  },

  toggleSidebar: () => {
    set((state) => ({ isSidebarOpen: !state.isSidebarOpen }))
  },

  setViewMode: (mode: ViewMode) => {
    set({ viewMode: mode })
  },

  openInspector: async (type: 'doc' | 'web', pathOrUrl: string) => {
    set({
      inspector: {
        isOpen: true,
        type,
        pathOrUrl,
        title: pathOrUrl,
        content: '',
        loading: true,
      },
    })

    const adapter = getFileSystemAdapter()
    try {
      if (type === 'doc') {
        const content = await adapter.readFile(pathOrUrl)
        const parts = pathOrUrl.split('/')
        set({
          inspector: {
            isOpen: true,
            type: 'doc',
            pathOrUrl,
            title: parts[parts.length - 1] || pathOrUrl,
            content,
            loading: false,
          },
        })
      } else {
        const article = await adapter.fetchExternalUrl(pathOrUrl)
        set({
          inspector: {
            isOpen: true,
            type: 'web',
            pathOrUrl,
            title: article.title || pathOrUrl,
            content: article.content,
            loading: false,
          },
        })
      }
    } catch (err) {
      set({
        inspector: {
          isOpen: true,
          type,
          pathOrUrl,
          title: pathOrUrl,
          content: `Failed to load preview for ${pathOrUrl}: ${(err as Error).message}`,
          loading: false,
        },
      })
    }
  },

  closeInspector: () => {
    set((state) => ({
      inspector: { ...state.inspector, isOpen: false },
    }))
  },

  toggleQuickSwitcher: (open?: boolean) => {
    set((state) => ({
      isQuickSwitcherOpen: open !== undefined ? open : !state.isQuickSwitcherOpen,
    }))
  },

  setStatusMessage: (msg: string) => {
    set({ statusMessage: msg })
  },
}))
