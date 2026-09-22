import { create } from 'zustand'
import { getFileSystemAdapter, setFileSystemAdapter, NativeBrowserFileSystemAdapter } from '../adapters'
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
  sidebarWidth: number
  splitRatio: number
  inspectorWidth: number
  outlineRatio: number
  viewMode: ViewMode
  inspector: InspectorState
  isQuickSwitcherOpen: boolean
  statusMessage: string
  isOutlineOpen: boolean
  targetScrollLine: number | null

  // Actions
  initWorkspace: () => Promise<void>
  refreshFileTree: () => Promise<void>
  openLocalDirectory: () => Promise<void>
  openDroppedFiles: (files: File[]) => Promise<void>
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
  toggleOutline: () => void
  scrollToLine: (line: number | null) => void
  setSidebarWidth: (width: number) => void
  changeSidebarWidth: (delta: number) => void
  setSplitRatio: (ratio: number) => void
  changeSplitRatio: (deltaPercent: number) => void
  setInspectorWidth: (width: number) => void
  changeInspectorWidth: (delta: number) => void
  setOutlineRatio: (ratio: number) => void
  changeOutlineRatio: (deltaPercent: number) => void
  resetPanelSizes: () => void
  setViewMode: (mode: ViewMode) => void
  openInspector: (type: 'doc' | 'web', pathOrUrl: string) => Promise<void>
  closeInspector: () => void
  toggleQuickSwitcher: (open?: boolean) => void
  setStatusMessage: (msg: string) => void
}

const loadSavedPanelSizes = () => {
  try {
    const raw = localStorage.getItem('markflow_panel_sizes_v1')
    if (raw) return JSON.parse(raw)
  } catch {
    // fallback
  }
  return { sidebarWidth: 224, splitRatio: 50, inspectorWidth: 380, outlineRatio: 50 }
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => {
  const initialSizes = loadSavedPanelSizes()

  return {
    tabs: [],
    activeTabId: null,
    fileTree: [],
    expandedFolders: new Set(['/notes']),
    isSidebarOpen: true,
    sidebarWidth: initialSizes.sidebarWidth ?? 224,
    splitRatio: initialSizes.splitRatio ?? 50,
    inspectorWidth: initialSizes.inspectorWidth ?? 380,
    outlineRatio: initialSizes.outlineRatio ?? 50,
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
    isOutlineOpen: true,
    targetScrollLine: null,

    toggleOutline: () => set((state) => ({ isOutlineOpen: !state.isOutlineOpen })),

    scrollToLine: (line: number | null) => set({ targetScrollLine: line }),

    openLocalDirectory: async () => {
      // Check for browser File System Access API
      if ('showDirectoryPicker' in window) {
        try {
          // @ts-expect-error - File System Access API
          const handle = await window.showDirectoryPicker({ mode: 'readwrite' })
          const nativeAdapter = new NativeBrowserFileSystemAdapter(handle)
          setFileSystemAdapter(nativeAdapter)

          const files = await nativeAdapter.listDirectory('/')
          set({ fileTree: files, tabs: [], activeTabId: null })

          const firstMd = files.find(
            (f) => !f.isDirectory && (f.name.endsWith('.md') || f.name.endsWith('.markdown'))
          )
          if (firstMd) {
            await get().openFile(firstMd.path)
          }
          set({ statusMessage: `Opened folder: ${handle.name}` })
        } catch (err) {
          if ((err as Error).name !== 'AbortError') {
            console.error('Failed to open local directory:', err)
            alert('Failed to open directory: ' + (err as Error).message)
          }
        }
      } else {
        alert(
          'Your browser does not support showDirectoryPicker. You can drag and drop any markdown files or folders directly into MarkFlow!'
        )
      }
    },

    openDroppedFiles: async (files: File[]) => {
      const adapter = getFileSystemAdapter()
      const newTabs: EditorTab[] = []

      for (const file of files) {
        if (
          !file.name.endsWith('.md') &&
          !file.name.endsWith('.markdown') &&
          !file.name.endsWith('.txt')
        ) {
          continue
        }
        const text = await file.text()
        const virtualPath = `/${file.name}`
        try {
          await adapter.createFile(virtualPath, text)
        } catch {
          await adapter.writeFile(virtualPath, text)
        }
        newTabs.push({
          id: `tab_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          path: virtualPath,
          title: file.name,
          content: text,
          initialContent: text,
          isDirty: false,
        })
      }

      if (newTabs.length > 0) {
        await get().refreshFileTree()
        const currentTabs = get().tabs
        set({
          tabs: [...currentTabs, ...newTabs],
          activeTabId: newTabs[0].id,
          statusMessage: `Imported ${newTabs.length} file(s)`,
        })
      }
    },

    setSidebarWidth: (width: number) => {
      const clamped = Math.max(160, Math.min(600, width))
      set({ sidebarWidth: clamped })
      try {
        const current = loadSavedPanelSizes()
        localStorage.setItem(
          'markflow_panel_sizes_v1',
          JSON.stringify({ ...current, sidebarWidth: clamped })
        )
      } catch {}
    },

    changeSidebarWidth: (delta: number) => {
      set((state) => {
        const next = Math.max(160, Math.min(600, state.sidebarWidth + delta))
        try {
          const current = loadSavedPanelSizes()
          localStorage.setItem(
            'markflow_panel_sizes_v1',
            JSON.stringify({ ...current, sidebarWidth: next })
          )
        } catch {}
        return { sidebarWidth: next }
      })
    },

    setSplitRatio: (ratio: number) => {
      const clamped = Math.max(15, Math.min(85, ratio))
      set({ splitRatio: clamped })
      try {
        const current = loadSavedPanelSizes()
        localStorage.setItem(
          'markflow_panel_sizes_v1',
          JSON.stringify({ ...current, splitRatio: clamped })
        )
      } catch {}
    },

    changeSplitRatio: (deltaPercent: number) => {
      set((state) => {
        const next = Math.max(15, Math.min(85, state.splitRatio + deltaPercent))
        try {
          const current = loadSavedPanelSizes()
          localStorage.setItem(
            'markflow_panel_sizes_v1',
            JSON.stringify({ ...current, splitRatio: next })
          )
        } catch {}
        return { splitRatio: next }
      })
    },

    setInspectorWidth: (width: number) => {
      const clamped = Math.max(260, Math.min(800, width))
      set({ inspectorWidth: clamped })
      try {
        const current = loadSavedPanelSizes()
        localStorage.setItem(
          'markflow_panel_sizes_v1',
          JSON.stringify({ ...current, inspectorWidth: clamped })
        )
      } catch {}
    },

    changeInspectorWidth: (delta: number) => {
      set((state) => {
        const next = Math.max(260, Math.min(800, state.inspectorWidth + delta))
        try {
          const current = loadSavedPanelSizes()
          localStorage.setItem(
            'markflow_panel_sizes_v1',
            JSON.stringify({ ...current, inspectorWidth: next })
          )
        } catch {}
        return { inspectorWidth: next }
      })
    },

    setOutlineRatio: (ratio: number) => {
      const clamped = Math.max(15, Math.min(85, ratio))
      set({ outlineRatio: clamped })
      try {
        const current = loadSavedPanelSizes()
        localStorage.setItem(
          'markflow_panel_sizes_v1',
          JSON.stringify({ ...current, outlineRatio: clamped })
        )
      } catch {}
    },

    changeOutlineRatio: (deltaPercent: number) => {
      set((state) => {
        const next = Math.max(15, Math.min(85, state.outlineRatio + deltaPercent))
        try {
          const current = loadSavedPanelSizes()
          localStorage.setItem(
            'markflow_panel_sizes_v1',
            JSON.stringify({ ...current, outlineRatio: next })
          )
        } catch {}
        return { outlineRatio: next }
      })
    },

    resetPanelSizes: () => {
      set({ sidebarWidth: 224, splitRatio: 50, inspectorWidth: 380, outlineRatio: 50 })
      try {
        localStorage.removeItem('markflow_panel_sizes_v1')
      } catch {}
    },

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
}
})
