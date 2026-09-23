import { create } from 'zustand'
import { getFileSystemAdapter, setFileSystemAdapter, NativeBrowserFileSystemAdapter } from '../adapters'
import type { FileEntry } from '../adapters/adapter.interface'
import { findAnchorLine, extractTableOfContents } from '../utils/tocExtractor'
import { extractSection } from '../utils/sectionExtractor'
import { slugify } from '../utils/slugify'

export interface TargetHeading {
  line: number
  text: string
  slug: string
  timestamp: number
}

export interface EditorTab {
  id: string
  path: string
  title: string
  content: string
  initialContent: string
  isDirty: boolean
  hasExternalConflict?: boolean
  externalDiskContent?: string
}

export type ViewMode = 'split' | 'editor' | 'preview'

export interface InspectorState {
  isOpen: boolean
  type: 'doc' | 'web' | null
  pathOrUrl: string | null
  targetAnchor?: string | null
  title: string
  content: string
  fullContent?: string
  isSectionOnly?: boolean
  sectionTitle?: string
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
  targetAnchor: string | null
  targetHeading: TargetHeading | null
  hoveredLinkUrl: string | null

  // Actions
  setHoveredLinkUrl: (url: string | null) => void
  initWorkspace: () => Promise<void>
  refreshFileTree: () => Promise<void>
  openLocalDirectory: () => Promise<void>
  openLocalFile: () => Promise<void>
  openDroppedFiles: (files: File[]) => Promise<void>
  openDroppedFilePaths: (paths: string[]) => Promise<void>
  openFile: (path: string, targetAnchor?: string) => Promise<void>
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
  scrollToAnchor: (anchor: string) => void
  scrollToHeading: (heading: { line: number; text: string; slug?: string }) => void
  setTargetAnchor: (anchor: string | null) => void
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
  openInspector: (
    type: 'doc' | 'web',
    pathOrUrl: string,
    targetAnchor?: string,
    sectionOnly?: boolean
  ) => Promise<void>
  toggleInspectorSectionMode: () => void
  closeInspector: () => void
  toggleQuickSwitcher: (open?: boolean) => void
  setStatusMessage: (msg: string) => void
  checkForExternalFileChanges: () => Promise<void>
  reloadTabFromDisk: (tabId: string) => Promise<void>
  resolveConflictKeepLocal: (tabId: string) => void
  resolveConflictCompareInInspector: (tabId: string) => void
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

function findFirstMarkdownFile(entries: FileEntry[]): FileEntry | undefined {
  for (const entry of entries) {
    if (
      !entry.isDirectory &&
      (entry.name.endsWith('.md') || entry.name.endsWith('.markdown') || entry.name.endsWith('.txt'))
    ) {
      return entry
    }
    if (entry.isDirectory && entry.children && entry.children.length > 0) {
      const found = findFirstMarkdownFile(entry.children)
      if (found) return found
    }
  }
  return undefined
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
    viewMode: 'preview',
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
    targetAnchor: null,
    targetHeading: null,
    hoveredLinkUrl: null,

    setHoveredLinkUrl: (url: string | null) => set({ hoveredLinkUrl: url }),

    toggleOutline: () => set((state) => ({ isOutlineOpen: !state.isOutlineOpen })),

    scrollToHeading: (heading: { line: number; text: string; slug?: string }) => {
      const slug = heading.slug || slugify(heading.text)
      set({
        targetScrollLine: heading.line,
        targetAnchor: slug,
        targetHeading: {
          line: heading.line,
          text: heading.text,
          slug,
          timestamp: Date.now(),
        },
      })
    },

    scrollToLine: (line: number | null) => {
      if (line === null) {
        set({ targetScrollLine: null })
        return
      }
      const { tabs, activeTabId } = get()
      const activeTab = tabs.find((t) => t.id === activeTabId)
      let text = ''
      let slug = ''
      if (activeTab) {
        const items = extractTableOfContents(activeTab.content)
        const matched = items.find((h) => h.line === line)
        if (matched) {
          text = matched.text
          slug = slugify(matched.text)
        }
      }
      set({
        targetScrollLine: line,
        targetAnchor: slug || null,
        targetHeading: {
          line,
          text,
          slug,
          timestamp: Date.now(),
        },
      })
    },

    setTargetAnchor: (anchor: string | null) => set({ targetAnchor: anchor }),

    scrollToAnchor: (anchor: string) => {
      const { tabs, activeTabId } = get()
      const activeTab = tabs.find((t) => t.id === activeTabId)
      if (!activeTab) return
      const line = findAnchorLine(activeTab.content, anchor)
      const slug = slugify(anchor)
      set({
        targetScrollLine: line,
        targetAnchor: anchor,
        targetHeading: {
          line: line ?? 0,
          text: anchor,
          slug,
          timestamp: Date.now(),
        },
      })
    },

    openLocalDirectory: async () => {
      const isTauri =
        typeof window !== 'undefined' &&
        Boolean(
          (window as unknown as { isTauri?: boolean }).isTauri ||
            (window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__ ||
            (window as unknown as { __TAURI__?: unknown }).__TAURI__
        )

      if (isTauri) {
        try {
          const { open } = await import('@tauri-apps/plugin-dialog')
          const selected = await open({
            directory: true,
            multiple: false,
            title: 'Open Workspace Folder',
          })
          const targetPath = Array.isArray(selected) ? selected[0] : selected
          if (targetPath && typeof targetPath === 'string') {
            const adapter = getFileSystemAdapter()
            if (adapter.setWorkspaceRoot) {
              await adapter.setWorkspaceRoot(targetPath)
            }
            try {
              localStorage.setItem('markflow_last_workspace_root', targetPath)
            } catch {}
            const files = await adapter.listDirectory('/')
            set({ fileTree: files, tabs: [], activeTabId: null })

            const firstMd = findFirstMarkdownFile(files)
            if (firstMd) {
              await get().openFile(firstMd.path)
            }
            const folderName = targetPath.split('/').filter(Boolean).pop() || targetPath
            set({ statusMessage: `Opened folder: ${folderName}` })
          }
          return
        } catch (err) {
          console.error('Failed to open local directory in desktop:', err)
        }
      }

      // Check for browser File System Access API
      if ('showDirectoryPicker' in window) {
        try {
          // @ts-expect-error - File System Access API
          const handle = await window.showDirectoryPicker({ mode: 'readwrite' })
          const nativeAdapter = new NativeBrowserFileSystemAdapter(handle)
          setFileSystemAdapter(nativeAdapter)

          const files = await nativeAdapter.listDirectory('/')
          set({ fileTree: files, tabs: [], activeTabId: null })

          const firstMd = findFirstMarkdownFile(files)
          if (firstMd) {
            await get().openFile(firstMd.path)
          }
          set({ statusMessage: `Opened folder: ${handle.name}` })
        } catch (err) {
          if ((err as Error).name !== 'AbortError') {
            console.error('Failed to open local directory:', err)
          }
        }
      } else {
        alert(
          'Your browser does not support showDirectoryPicker. You can drag and drop any markdown files or folders directly into MarkFlow!'
        )
      }
    },

    openLocalFile: async () => {
      const isTauri =
        typeof window !== 'undefined' &&
        Boolean(
          (window as unknown as { isTauri?: boolean }).isTauri ||
            (window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__ ||
            (window as unknown as { __TAURI__?: unknown }).__TAURI__
        )

      if (isTauri) {
        try {
          const { open } = await import('@tauri-apps/plugin-dialog')
          const selected = await open({
            multiple: true,
            title: 'Open Markdown Files',
            filters: [
              {
                name: 'Markdown',
                extensions: ['md', 'markdown', 'txt'],
              },
            ],
          })
          if (selected) {
            const paths = Array.isArray(selected) ? selected : [selected]
            await get().openDroppedFilePaths(paths)
          }
          return
        } catch (err) {
          console.error('Failed to open local file in desktop:', err)
        }
      }
    },

    openDroppedFilePaths: async (paths: string[]) => {
      const adapter = getFileSystemAdapter()
      const newTabs: EditorTab[] = []

      for (const filePath of paths) {
        const name = filePath.split('/').filter(Boolean).pop() || 'untitled.md'
        if (
          !name.endsWith('.md') &&
          !name.endsWith('.markdown') &&
          !name.endsWith('.txt')
        ) {
          // If a folder was dropped, switch workspace to it
          try {
            if (adapter.setWorkspaceRoot) {
              await adapter.setWorkspaceRoot(filePath)
              try {
                localStorage.setItem('markflow_last_workspace_root', filePath)
              } catch {}
              const files = await adapter.listDirectory('/')
              set({ fileTree: files, tabs: [], activeTabId: null })
              const first = findFirstMarkdownFile(files)
              if (first) {
                await get().openFile(first.path)
              }
              set({ statusMessage: `Opened folder: ${name}` })
              return
            }
          } catch (err) {
            console.error('Failed to switch workspace on folder drop:', err)
          }
          continue
        }

        try {
          let text = ''
          if (adapter.readAbsoluteFile) {
            text = await adapter.readAbsoluteFile(filePath)
          } else {
            text = await adapter.readFile(filePath)
          }

          const existing = get().tabs.find((t) => t.path === filePath)
          if (existing) {
            set({ activeTabId: existing.id })
            continue
          }

          newTabs.push({
            id: `tab_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            path: filePath,
            title: name,
            content: text,
            initialContent: text,
            isDirty: false,
          })
        } catch (err) {
          console.error('Failed to read dropped file:', filePath, err)
        }
      }

      if (newTabs.length > 0) {
        let currentTabs = get().tabs
        // If the only open tab is the initial untouched welcome.md, replace it
        if (
          currentTabs.length === 1 &&
          currentTabs[0].path === '/welcome.md' &&
          !currentTabs[0].isDirty
        ) {
          currentTabs = []
        }
        set({
          tabs: [...currentTabs, ...newTabs],
          activeTabId: newTabs[0].id,
          statusMessage: `Opened ${newTabs.length} file(s)`,
        })
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
      // Restore previously opened workspace folder if available
      const savedRoot =
        typeof localStorage !== 'undefined'
          ? localStorage.getItem('markflow_last_workspace_root')
          : null
      if (savedRoot && adapter.setWorkspaceRoot) {
        try {
          await adapter.setWorkspaceRoot(savedRoot)
        } catch (e) {
          console.warn('Could not restore last workspace root:', e)
          try {
            localStorage.removeItem('markflow_last_workspace_root')
          } catch {}
        }
      }

      const files = await adapter.listDirectory('/')
      set({ fileTree: files, statusMessage: 'Ready' })

      // Check if there are initial opened files passed from desktop (e.g. Open With / CLI)
      let initialOpened = false
      if (adapter.getOpenedFiles) {
        try {
          const openedFiles = await adapter.getOpenedFiles()
          if (openedFiles && openedFiles.length > 0) {
            await get().openDroppedFilePaths(openedFiles)
            initialOpened = true
          }
        } catch (e) {
          console.warn('Failed to retrieve initial opened files:', e)
        }
      }

      if (!initialOpened) {
        // Open /welcome.md by default if available
        const welcomePath = '/welcome.md'
        try {
          await get().openFile(welcomePath)
        } catch {
          // Fallback to first markdown file if exists
          const first = findFirstMarkdownFile(files)
          if (first) {
            await get().openFile(first.path)
          }
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

  openFile: async (path: string, targetAnchor?: string) => {
    let cleanPath = path
    let anchor = targetAnchor || null
    if (cleanPath.includes('#')) {
      const hashIndex = cleanPath.indexOf('#')
      anchor = cleanPath.slice(hashIndex + 1)
      cleanPath = cleanPath.slice(0, hashIndex)
    }

    const { tabs } = get()
    const existing = tabs.find((t) => t.path === cleanPath)
    if (existing) {
      set({ activeTabId: existing.id })
      if (anchor) {
        const line = findAnchorLine(existing.content, anchor)
        const slug = slugify(anchor)
        if (line !== null) {
          get().scrollToLine(line)
        }
        set({
          targetAnchor: anchor,
          targetHeading: {
            line: line ?? 0,
            text: anchor,
            slug,
            timestamp: Date.now(),
          },
        })
      }
      return
    }

    const adapter = getFileSystemAdapter()
    try {
      const content = await adapter.readFile(cleanPath)
      const parts = cleanPath.split('/')
      const title = parts[parts.length - 1] || 'untitled.md'
      const newTab: EditorTab = {
        id: `tab_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        path: cleanPath,
        title,
        content,
        initialContent: content,
        isDirty: false,
      }
      set({
        tabs: [...tabs, newTab],
        activeTabId: newTab.id,
        statusMessage: anchor ? `Opened ${title} at #${anchor}` : `Opened ${title}`,
      })
      if (anchor) {
        const line = findAnchorLine(content, anchor)
        const slug = slugify(anchor)
        if (line !== null) {
          get().scrollToLine(line)
        }
        set({
          targetAnchor: anchor,
          targetHeading: {
            line: line ?? 0,
            text: anchor,
            slug,
            timestamp: Date.now(),
          },
        })
      }
    } catch (err) {
      console.error(`Failed to open file: ${cleanPath}`, err)
      set({ statusMessage: `Error opening ${cleanPath}` })
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

  openInspector: async (
    type: 'doc' | 'web',
    pathOrUrl: string,
    targetAnchor?: string,
    _sectionOnly = false
  ) => {
    let cleanPath = pathOrUrl
    let anchor = targetAnchor || null

    if (type === 'doc') {
      if (cleanPath.includes('#')) {
        const hashIdx = cleanPath.indexOf('#')
        anchor = cleanPath.slice(hashIdx + 1)
        cleanPath = cleanPath.slice(0, hashIdx)
      }

      // If empty path (e.g. href="#4-abc"), target the active document
      const { tabs, activeTabId } = get()
      const activeTab = tabs.find((t) => t.id === activeTabId)
      if (!cleanPath && activeTab) {
        cleanPath = activeTab.path
      }
    }

    if (anchor) {
      anchor = anchor.replace(/^#/, '').trim()
      try {
        anchor = decodeURIComponent(anchor)
      } catch {}
    }

    const parts = cleanPath.split('/')
    const fileName = parts[parts.length - 1] || cleanPath
    const displayTitle = anchor ? `${fileName} > #${anchor}` : fileName

    set({
      inspector: {
        isOpen: true,
        type,
        pathOrUrl: cleanPath,
        targetAnchor: anchor,
        title: displayTitle,
        content: '',
        fullContent: '',
        isSectionOnly: false,
        loading: true,
      },
    })

    const adapter = getFileSystemAdapter()
    try {
      if (type === 'doc') {
        const { tabs, activeTabId } = get()
        const activeTab = tabs.find((t) => t.id === activeTabId)
        let rawContent = ''
        if (activeTab && activeTab.path === cleanPath) {
          rawContent = activeTab.content
        } else {
          rawContent = await adapter.readFile(cleanPath)
        }

        let finalContent = rawContent
        let isSection = false
        let secTitle: string | undefined = undefined

        // If anchor is present, extract and display only that section
        if (anchor) {
          const section = extractSection(rawContent, anchor)
          if (section) {
            finalContent = section.content
            isSection = true
            secTitle = section.title
          }
        }

        set({
          inspector: {
            isOpen: true,
            type: 'doc',
            pathOrUrl: cleanPath,
            targetAnchor: anchor,
            title: isSection && secTitle ? `${fileName} > #${anchor} (${secTitle})` : displayTitle,
            content: finalContent,
            fullContent: rawContent,
            isSectionOnly: isSection,
            sectionTitle: secTitle,
            loading: false,
          },
        })
      } else {
        const article = await adapter.fetchExternalUrl(cleanPath)
        set({
          inspector: {
            isOpen: true,
            type: 'web',
            pathOrUrl: cleanPath,
            targetAnchor: null,
            title: article.title || cleanPath,
            content: article.content,
            fullContent: article.content,
            isSectionOnly: false,
            loading: false,
          },
        })
      }
    } catch (err) {
      set({
        inspector: {
          isOpen: true,
          type,
          pathOrUrl: cleanPath,
          targetAnchor: anchor,
          title: displayTitle,
          content: `Failed to load preview for ${cleanPath}: ${(err as Error).message}`,
          fullContent: '',
          isSectionOnly: false,
          loading: false,
        },
      })
    }
  },

  toggleInspectorSectionMode: () => {
    const { inspector } = get()
    if (!inspector.isOpen || inspector.type !== 'doc' || !inspector.fullContent) return

    if (inspector.isSectionOnly) {
      // Switch from section-only view to full document view
      set({
        inspector: {
          ...inspector,
          content: inspector.fullContent,
          isSectionOnly: false,
        },
      })
    } else if (inspector.targetAnchor) {
      // Switch to section-only view
      const sec = extractSection(inspector.fullContent, inspector.targetAnchor)
      if (sec) {
        set({
          inspector: {
            ...inspector,
            content: sec.content,
            isSectionOnly: true,
            sectionTitle: sec.title,
          },
        })
      }
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

  checkForExternalFileChanges: async () => {
    const { tabs } = get()
    if (tabs.length === 0) return

    const adapter = getFileSystemAdapter()

    for (const tab of tabs) {
      if (!tab.path) continue
      try {
        const diskContent = await adapter.readFile(tab.path)

        // If disk content is different from the initial content when opened/saved
        if (diskContent !== tab.initialContent) {
          if (!tab.isDirty) {
            // User has no unsaved changes in MarkFlow: safe to auto-reload
            set((state) => ({
              tabs: state.tabs.map((t) =>
                t.id === tab.id
                  ? {
                      ...t,
                      content: diskContent,
                      initialContent: diskContent,
                      isDirty: false,
                      hasExternalConflict: false,
                      externalDiskContent: undefined,
                    }
                  : t
              ),
              statusMessage: `${tab.title} was updated on disk and reloaded.`,
            }))
          } else {
            // User HAS unsaved changes in MarkFlow AND disk changed: CONFLICT!
            if (!tab.hasExternalConflict || tab.externalDiskContent !== diskContent) {
              set((state) => ({
                tabs: state.tabs.map((t) =>
                  t.id === tab.id
                    ? {
                        ...t,
                        hasExternalConflict: true,
                        externalDiskContent: diskContent,
                      }
                    : t
                ),
                statusMessage: `Warning: Conflict detected in ${tab.title} (modified externally)`,
              }))
            }
          }
        }
      } catch {
        // Ignore read errors for non-existent or inaccessible files
      }
    }
  },

  reloadTabFromDisk: async (tabId: string) => {
    const { tabs } = get()
    const target = tabs.find((t) => t.id === tabId)
    if (!target || !target.path) return

    const adapter = getFileSystemAdapter()
    try {
      const diskContent = await adapter.readFile(target.path)
      set((state) => ({
        tabs: state.tabs.map((t) =>
          t.id === tabId
            ? {
                ...t,
                content: diskContent,
                initialContent: diskContent,
                isDirty: false,
                hasExternalConflict: false,
                externalDiskContent: undefined,
              }
            : t
        ),
        statusMessage: `Reloaded ${target.title} from disk.`,
      }))
    } catch (err) {
      set({ statusMessage: `Failed to reload ${target.title}: ${(err as Error).message}` })
    }
  },

  resolveConflictKeepLocal: (tabId: string) => {
    set((state) => ({
      tabs: state.tabs.map((t) =>
        t.id === tabId
          ? {
              ...t,
              initialContent: t.externalDiskContent || t.initialContent,
              hasExternalConflict: false,
              externalDiskContent: undefined,
              isDirty: true,
            }
          : t
      ),
      statusMessage: `Keeping local edits. Save (Ctrl+S) will overwrite disk.`,
    }))
  },

  resolveConflictCompareInInspector: (tabId: string) => {
    const { tabs } = get()
    const target = tabs.find((t) => t.id === tabId)
    if (!target || !target.externalDiskContent) return

    set({
      inspector: {
        isOpen: true,
        type: 'doc',
        pathOrUrl: target.path,
        targetAnchor: null,
        title: `[Disk Version] ${target.title}`,
        content: target.externalDiskContent,
        fullContent: target.externalDiskContent,
        isSectionOnly: false,
        loading: false,
      },
      statusMessage: `Comparing local vs disk version in Side Inspector.`,
    })
  },
}
})
